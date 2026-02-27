import { useMemo, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNebulaSplatTexture } from '../../utils/threeUtils';

const WORLD_X = -60, WORLD_Y = 0, WORLD_Z = 20;
const N = 12000;

const WELL_RAMP        = 1.5;
const GRAVITY_DURATION = 10;  // seconds gravity is active after planting
const CAPTURE_R        = 1.5;
const PULL_MAX         = 80;
const TANGENT_F        = 25;   // tangential force constant (orbital spiraling)
const FADE_SPEED       = 0.35; // color fade-in rate (1/s) — ~2.8s to fully reappear

let _wellId = 0;

// Disk color transitions: white = full amber texture; dormant = cool gray-blue
const DISK_COLOR_ACTIVE  = new THREE.Color(1, 1, 1);
const DISK_COLOR_DORMANT = new THREE.Color(0.48, 0.50, 0.58);
const GLOW_COLOR_DORMANT = new THREE.Color(0.42, 0.44, 0.52);

const PAL = [
  new THREE.Color('#26cdd4'), // cyan
  new THREE.Color('#b033dd'), // bright purple
];

function randG() {
  const u = Math.max(1e-10, Math.random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

function buildField() {
  const pos        = new Float32Array(N * 3);
  const home       = new Float32Array(N * 3);
  const vel        = new Float32Array(N * 3);
  const col        = new Float32Array(N * 3);
  const homeCol    = new Float32Array(N * 3); // original colors for fade-back
  const capturedBy = new Int32Array(N).fill(-1);
  const fadeProg   = new Float32Array(N).fill(0); // 0 = normal, >0 = fading in

  for (let i = 0; i < N; i++) {
    const x = randG() * 18;
    const y = randG() * 5;
    const z = randG() * 10;
    pos[i*3] = home[i*3] = x;
    pos[i*3+1] = home[i*3+1] = y;
    pos[i*3+2] = home[i*3+2] = z;
    const c = PAL[Math.floor(Math.random() * PAL.length)];
    const b = 0.15 + Math.random() * 0.4;
    col[i*3]   = homeCol[i*3]   = c.r * b;
    col[i*3+1] = homeCol[i*3+1] = c.g * b;
    col[i*3+2] = homeCol[i*3+2] = c.b * b;
  }

  const posAttr = new THREE.BufferAttribute(pos, 3);
  posAttr.usage = THREE.DynamicDrawUsage;
  const colAttr = new THREE.BufferAttribute(col, 3);
  colAttr.usage = THREE.DynamicDrawUsage;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color', colAttr);
  return { geo, vel, home, homeCol, capturedBy, fadeProg };
}

function buildHaze() {
  const count = 300;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i*3]   = randG() * 20;
    pos[i*3+1] = randG() * 6;
    pos[i*3+2] = randG() * 12;
    const c = PAL[Math.floor(Math.random() * PAL.length)];
    col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

let _glowTex = null;
function getGlowTex() {
  if (_glowTex) return _glowTex;
  const size = 128, c = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0,    'rgba(255,240,200,0.9)');
  g.addColorStop(0.25, 'rgba(255,160,40,0.55)');
  g.addColorStop(0.55, 'rgba(180,60,5,0.2)');
  g.addColorStop(1.0,  'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return (_glowTex = new THREE.CanvasTexture(canvas));
}

let _diskTex = null;
function getDiskTex() {
  if (_diskTex) return _diskTex;
  const size = 256, c = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const innerR = c * 0.36;
  const g = ctx.createRadialGradient(c, c, innerR, c, c, c);
  g.addColorStop(0,    'rgba(255,255,245,1.0)');
  g.addColorStop(0.05, 'rgba(255,210,80,0.92)');
  g.addColorStop(0.18, 'rgba(255,130,20,0.65)');
  g.addColorStop(0.40, 'rgba(200,60,5,0.28)');
  g.addColorStop(0.65, 'rgba(150,30,0,0.09)');
  g.addColorStop(1.0,  'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(c, c, innerR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fill();
  return (_diskTex = new THREE.CanvasTexture(canvas));
}

let _tex = null;
function getDotTex() {
  if (_tex) return _tex;
  const size = 32, c = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0,   'rgba(255,255,255,1.0)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.2)');
  g.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return (_tex = new THREE.CanvasTexture(canvas));
}

// Purely visual — no event handlers (hit plane owns all interaction)
function WellMesh({ well }) {
  const groupRef    = useRef();
  const diskMatRef  = useRef();
  const diskMat2Ref = useRef();
  const glowMatRef  = useRef();

  useFrame(() => {
    const t        = Math.min(1, well.age / 0.7);
    const e        = t * t * (3 - 2 * t); // smoothstep fade-in
    const active   = well.age < GRAVITY_DURATION;
    // 0 while active, ramps 0→1 over 1.5s after gravity stops
    const dormantT = Math.min(1, Math.max(0, (well.age - GRAVITY_DURATION) / 1.5));

    if (groupRef.current) groupRef.current.scale.setScalar(e);

    const diskOpacity = active
      ? (0.78 + 0.07 * Math.sin(well.age * Math.PI * 3)) * e
      : 0.5 * e;
    for (const ref of [diskMatRef, diskMat2Ref]) {
      if (ref.current) {
        ref.current.color.lerpColors(DISK_COLOR_ACTIVE, DISK_COLOR_DORMANT, dormantT);
        ref.current.opacity = diskOpacity;
      }
    }

    if (glowMatRef.current) {
      glowMatRef.current.color.lerpColors(DISK_COLOR_ACTIVE, GLOW_COLOR_DORMANT, dormantT);
      if (active) {
        const pulse = 0.04 * Math.sin(well.age * Math.PI * 3);
        glowMatRef.current.opacity = (0.36 + pulse) * e;
      } else {
        glowMatRef.current.opacity = 0.2 * e;
      }
    }
  });

  return (
    <group ref={groupRef} position={[well.x, well.y, well.z]}>
      <sprite scale={[8, 8, 1]}>
        <spriteMaterial
          ref={glowMatRef}
          map={getGlowTex()}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      <mesh rotation={[1.2, 0.1, 0.15]}>
        <planeGeometry args={[7, 7]} />
        <meshBasicMaterial
          ref={diskMatRef}
          map={getDiskTex()}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Second plane rotated 90° around y — ensures ring has visible width from all angles */}
      <mesh rotation={[1.2, 0.1 + Math.PI / 2, 0.15]}>
        <planeGeometry args={[7, 7]} />
        <meshBasicMaterial
          ref={diskMat2Ref}
          map={getDiskTex()}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.2, 20, 20]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
    </group>
  );
}

export default function GravityField() {
  const { geo, vel, home, homeCol, capturedBy, fadeProg } = useMemo(() => buildField(), []);
  const hazeGeo = useMemo(() => buildHaze(), []);
  const tex     = useMemo(() => getDotTex(), []);
  const hazeTex = useMemo(() => createNebulaSplatTexture(), []);

  const wellsRef = useRef([]);
  const [wellSnapshot, setWellSnapshot] = useState([]);

  // Release captured particles to home with color-fade (no burst)
  const collapseWell = (idx) => {
    const wells = wellsRef.current;
    const w = wells[idx];
    const pos    = geo.attributes.position.array;
    const colArr = geo.attributes.color.array;

    for (let i = 0; i < N; i++) {
      if (capturedBy[i] !== w.id) continue;
      const i3 = i * 3;
      capturedBy[i]  = -1;
      pos[i3]   = home[i3];
      pos[i3+1] = home[i3+1];
      pos[i3+2] = home[i3+2];
      vel[i3] = 0; vel[i3+1] = 0; vel[i3+2] = 0;
      colArr[i3] = 0; colArr[i3+1] = 0; colArr[i3+2] = 0; // start black
      fadeProg[i] = 0.001; // flag as fading in
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    wells.splice(idx, 1);
    setWellSnapshot([...wells]);
  };

  // First click → plant; second click (anywhere) → explode
  const handleClick = (lp) => {
    const wells = wellsRef.current;
    if (wells.length > 0) {
      collapseWell(0);
      return;
    }
    wells.push({ id: _wellId++, x: lp.x, y: lp.y, z: lp.z, age: 0 });
    setWellSnapshot([...wells]);
  };

  useEffect(() => () => {
    geo.dispose();
    hazeGeo.dispose();
    if (_tex)     { _tex.dispose();     _tex     = null; }
    if (_glowTex) { _glowTex.dispose(); _glowTex = null; }
    if (_diskTex) { _diskTex.dispose(); _diskTex = null; }
  }, [geo, hazeGeo]);

  useFrame((_, delta) => {
    const posAttr = geo.attributes.position;
    const colAttr = geo.attributes.color;
    const pos     = posAttr.array;
    const colArr  = colAttr.array;
    const dt      = Math.min(delta, 0.05);
    const wells   = wellsRef.current;

    // Tick well ages
    for (let wi = 0; wi < wells.length; wi++) wells[wi].age += dt;

    // Gravity is "active" only while well.age < GRAVITY_DURATION
    const gravityActive = wells.some(w => w.age < GRAVITY_DURATION);
    let posDirty   = false;
    let colorDirty = false;

    for (let i = 0; i < N; i++) {
      // Color fade-in for released particles
      if (fadeProg[i] > 0) {
        fadeProg[i] = Math.min(1, fadeProg[i] + dt * FADE_SPEED);
        const p = fadeProg[i];
        const i3 = i * 3;
        colArr[i3]   = homeCol[i3]   * p;
        colArr[i3+1] = homeCol[i3+1] * p;
        colArr[i3+2] = homeCol[i3+2] * p;
        if (fadeProg[i] >= 1) fadeProg[i] = 0;
        colorDirty = true;
      }

      if (capturedBy[i] !== -1) continue;

      const i3 = i * 3;
      let vx = vel[i3], vy = vel[i3+1], vz = vel[i3+2];

      for (let j = 0; j < wells.length; j++) {
        const w = wells[j];
        if (w.age >= GRAVITY_DURATION) continue; // gravity window expired

        const strength = Math.min(1, w.age / WELL_RAMP);
        const dx = w.x - pos[i3];
        const dy = w.y - pos[i3+1];
        const dz = w.z - pos[i3+2];
        const d2 = dx*dx + dy*dy + dz*dz;

        if (d2 < CAPTURE_R * CAPTURE_R) {
          capturedBy[i] = w.id;
          vel[i3] = 0; vel[i3+1] = 0; vel[i3+2] = 0;
          pos[i3] = 0; pos[i3+1] = -9999; pos[i3+2] = 0;
          posDirty = true;
          break;
        }

        if (d2 > 0.001) {
          const d = Math.sqrt(d2);
          // Radial pull
          const force = Math.min(PULL_MAX, (70 * strength) / d) * dt;
          vx += dx/d * force;
          vy += dy/d * force;
          vz += dz/d * force;
          // Tangential force — cross(Z-up, radial) = (-dy/hd, dx/hd, 0)
          const hd2 = dx*dx + dy*dy;
          if (hd2 > 0.001) {
            const hd = Math.sqrt(hd2);
            const tf = Math.min(PULL_MAX * 0.4, (TANGENT_F * strength) / d) * dt;
            vx += (-dy / hd) * tf;
            vy += ( dx / hd) * tf;
          }
        }
      }

      if (capturedBy[i] !== -1) continue;

      if (!gravityActive) {
        vx += (home[i3]   - pos[i3])   * 0.4 * dt;
        vy += (home[i3+1] - pos[i3+1]) * 0.4 * dt;
        vz += (home[i3+2] - pos[i3+2]) * 0.4 * dt;
      }

      const damp = gravityActive ? 0.98 : 0.92;
      vx *= damp; vy *= damp; vz *= damp;

      const s2 = vx*vx + vy*vy + vz*vz;
      if (s2 > 900) {
        const inv = 30 / Math.sqrt(s2);
        vx *= inv; vy *= inv; vz *= inv;
      }

      vel[i3] = vx; vel[i3+1] = vy; vel[i3+2] = vz;

      if (s2 > 0.0001) {
        pos[i3]   += vx * dt;
        pos[i3+1] += vy * dt;
        pos[i3+2] += vz * dt;
        posDirty = true;
      }
    }

    if (posDirty)   posAttr.needsUpdate = true;
    if (colorDirty) colAttr.needsUpdate = true;
  });

  return (
    <group position={[WORLD_X, WORLD_Y, WORLD_Z]}>
      {/* Invisible hit plane — owns all click interaction */}
      <mesh
        onPointerEnter={() => { document.body.style.cursor = 'crosshair'; }}
        onPointerLeave={() => { document.body.style.cursor = ''; }}
        onClick={(e) => { e.stopPropagation(); handleClick({ x: e.point.x - WORLD_X, y: e.point.y - WORLD_Y, z: e.point.z - WORLD_Z }); }}
      >
        <planeGeometry args={[80, 40]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Volumetric haze */}
      <points geometry={hazeGeo}>
        <pointsMaterial
          map={hazeTex}
          size={8}
          vertexColors
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {wellSnapshot.map(w => <WellMesh key={w.id} well={w} />)}

      {/* Particle field */}
      <points geometry={geo}>
        <pointsMaterial
          map={tex}
          size={0.35}
          vertexColors
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
