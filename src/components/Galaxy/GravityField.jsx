import { useMemo, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const WORLD_X = -60, WORLD_Y = 0, WORLD_Z = 20;
const N = 5000;

const MAX_WELLS   = 5;
const WELL_RAMP   = 1.5;
const WELL_LIFE   = 15;
const WELL_COLORS = ['#26cdd4', '#f0b347', '#9944ee', '#4ade80', '#dd44bb'];
const CAPTURE_R   = 0.8;
const PULL_MAX    = 40;
const MAX_SCALE   = 3;
const GROW_RATE   = 2.5;  // scale units per second while held
const HOLD_MS     = 200;  // ms: below = click, above = hold/grow
const WELL_HIT_R2 = 4;    // squared units — proximity to detect well on pointer down

let _wellId = 0;

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
  const capturedBy = new Int32Array(N).fill(-1);

  for (let i = 0; i < N; i++) {
    const x = randG() * 18;
    const y = randG() * 5;
    const z = randG() * 10;
    pos[i*3] = home[i*3] = x;
    pos[i*3+1] = home[i*3+1] = y;
    pos[i*3+2] = home[i*3+2] = z;
    const c = PAL[Math.floor(Math.random() * PAL.length)];
    const b = 0.15 + Math.random() * 0.4;
    col[i*3] = c.r*b; col[i*3+1] = c.g*b; col[i*3+2] = c.b*b;
  }

  const posAttr = new THREE.BufferAttribute(pos, 3);
  posAttr.usage = THREE.DynamicDrawUsage;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return { geo, vel, home, capturedBy };
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

function FlashMesh({ flashRef }) {
  const meshRef = useRef();
  useFrame(() => {
    const f = flashRef.current;
    if (!meshRef.current) return;
    if (!f) { meshRef.current.visible = false; return; }
    const t = f.age / 0.4;
    meshRef.current.visible = true;
    meshRef.current.position.set(f.x, f.y, f.z);
    meshRef.current.scale.setScalar(1 + t * 1.5);
    meshRef.current.material.opacity = 0.2 * (1 - t);
  });
  return (
    <mesh ref={meshRef} visible={false}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// Purely visual — no event handlers (hit plane owns all interaction)
function WellMesh({ well }) {
  const groupRef = useRef();
  useFrame(() => {
    if (groupRef.current) groupRef.current.scale.setScalar(well.scale);
  });
  return (
    <group ref={groupRef} position={[well.x, well.y, well.z]}>
      <mesh>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#000000" emissive="#000000" />
      </mesh>
    </group>
  );
}

export default function GravityField() {
  const { geo, vel, home, capturedBy } = useMemo(() => buildField(), []);
  const tex = useMemo(() => getDotTex(), []);

  const { camera, pointer } = useThree();
  const wellsRef      = useRef([]);
  const [wellSnapshot, setWellSnapshot] = useState([]);
  const flashRef      = useRef(null);
  const heldWellIdRef = useRef(null);
  const holdStartRef  = useRef(0);

  const _rc       = useMemo(() => new THREE.Raycaster(), []);
  const _pln      = useMemo(() => new THREE.Plane(), []);
  const _pn       = useMemo(() => new THREE.Vector3(), []);
  const _hit      = useMemo(() => new THREE.Vector3(), []);
  const WORLD_POS = useMemo(() => new THREE.Vector3(WORLD_X, WORLD_Y, WORLD_Z), []);

  // Project pointer onto the camera-facing plane, return local coords or null
  const projectPointer = (cam, ptr) => {
    _pn.set(
      cam.position.x - WORLD_X,
      cam.position.y - WORLD_Y,
      cam.position.z - WORLD_Z,
    ).normalize();
    _pln.setFromNormalAndCoplanarPoint(_pn, WORLD_POS);
    _rc.setFromCamera(ptr, cam);
    if (!_rc.ray.intersectPlane(_pln, _hit)) return null;
    return { x: _hit.x - WORLD_X, y: _hit.y - WORLD_Y, z: _hit.z - WORLD_Z };
  };

  const collapseWell = (idx) => {
    const wells = wellsRef.current;
    const w = wells[idx];
    const pos = geo.attributes.position.array;
    const BURST_R = 5;

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      if (capturedBy[i] === w.id) {
        capturedBy[i] = -1;
        pos[i3]   = home[i3];
        pos[i3+1] = home[i3+1];
        pos[i3+2] = home[i3+2];
        vel[i3] = 0; vel[i3+1] = 0; vel[i3+2] = 0;
      } else {
        const dx = pos[i3] - w.x, dy = pos[i3+1] - w.y, dz = pos[i3+2] - w.z;
        const d2 = dx*dx + dy*dy + dz*dz;
        if (d2 < BURST_R*BURST_R && d2 > 0.001) {
          const d = Math.sqrt(d2);
          const strength = 22 * (1 - d / BURST_R);
          vel[i3]   += dx/d * strength;
          vel[i3+1] += dy/d * strength;
          vel[i3+2] += dz/d * strength;
        }
      }
    }

    geo.attributes.position.needsUpdate = true;
    flashRef.current = { x: w.x, y: w.y, z: w.z, age: 0 };
    if (heldWellIdRef.current === w.id) heldWellIdRef.current = null;
    wells.splice(idx, 1);
    setWellSnapshot([...wells]);
  };

  // Hit plane owns ALL pointer interaction — no ambiguity with tiny sphere meshes
  const handlePointerDown = (cam, ptr) => {
    const lp = projectPointer(cam, ptr);
    if (!lp) return;
    holdStartRef.current = Date.now();
    const wells = wellsRef.current;
    for (let i = 0; i < wells.length; i++) {
      const w = wells[i];
      const dx = lp.x - w.x, dy = lp.y - w.y, dz = lp.z - w.z;
      if (dx*dx + dy*dy + dz*dz < WELL_HIT_R2) {
        heldWellIdRef.current = w.id; // start growing
        return;
      }
    }
    heldWellIdRef.current = null; // click on empty space
  };

  const handlePointerUp = (cam, ptr) => {
    const held = Date.now() - holdStartRef.current;
    if (heldWellIdRef.current !== null) {
      // Was holding a well
      if (held < HOLD_MS) {
        // Short tap — detonate
        const idx = wellsRef.current.findIndex(w => w.id === heldWellIdRef.current);
        if (idx !== -1) collapseWell(idx);
      }
      heldWellIdRef.current = null;
    } else if (held < HOLD_MS) {
      // Short tap on empty space — plant well
      const lp = projectPointer(cam, ptr);
      if (!lp) return;
      const wells = wellsRef.current;
      if (wells.length >= MAX_WELLS) return;
      wells.push({ id: _wellId++, x: lp.x, y: lp.y, z: lp.z, age: 0, scale: 1, color: WELL_COLORS[wells.length % WELL_COLORS.length] });
      setWellSnapshot([...wells]);
    }
  };

  useEffect(() => () => {
    geo.dispose();
    if (_tex) { _tex.dispose(); _tex = null; }
  }, [geo]);

  useFrame((_, delta) => {
    const posAttr = geo.attributes.position;
    const pos = posAttr.array;
    const dt = Math.min(delta, 0.05);
    const wells = wellsRef.current;

    // Tick ages, auto-collapse expired wells
    const toCollapse = [];
    for (let wi = 0; wi < wells.length; wi++) {
      wells[wi].age += dt;
      if (wells[wi].age >= WELL_LIFE) toCollapse.push(wi);
    }
    for (let k = toCollapse.length - 1; k >= 0; k--) {
      collapseWell(toCollapse[k]);
    }

    // Grow held well
    if (heldWellIdRef.current !== null) {
      for (let wi = 0; wi < wells.length; wi++) {
        if (wells[wi].id === heldWellIdRef.current) {
          wells[wi].scale = Math.min(MAX_SCALE, wells[wi].scale + GROW_RATE * dt);
          break;
        }
      }
    }

    // Tick flash
    if (flashRef.current) {
      flashRef.current.age += dt;
      if (flashRef.current.age > 0.4) flashRef.current = null;
    }

    const hasWell = wells.length > 0;
    let dirty = false;

    for (let i = 0; i < N; i++) {
      if (capturedBy[i] !== -1) continue;

      const i3 = i * 3;
      let vx = vel[i3], vy = vel[i3+1], vz = vel[i3+2];

      for (let j = 0; j < wells.length; j++) {
        const w = wells[j];
        const strength = Math.min(1, w.age / WELL_RAMP);
        const cr = CAPTURE_R * w.scale;
        const dx = w.x - pos[i3];
        const dy = w.y - pos[i3+1];
        const dz = w.z - pos[i3+2];
        const d2 = dx*dx + dy*dy + dz*dz;

        if (d2 < cr * cr) {
          capturedBy[i] = w.id;
          vel[i3] = 0; vel[i3+1] = 0; vel[i3+2] = 0;
          pos[i3] = 0; pos[i3+1] = -9999; pos[i3+2] = 0;
          dirty = true;
          break;
        }

        if (d2 > 0.001) {
          const d = Math.sqrt(d2);
          const force = Math.min(PULL_MAX, (28 * strength) / d2) * dt;
          vx += dx/d * force;
          vy += dy/d * force;
          vz += dz/d * force;
        }
      }

      if (capturedBy[i] !== -1) continue;

      if (!hasWell) {
        vx += (home[i3]   - pos[i3])   * 0.4 * dt;
        vy += (home[i3+1] - pos[i3+1]) * 0.4 * dt;
        vz += (home[i3+2] - pos[i3+2]) * 0.4 * dt;
      }

      const damp = hasWell ? 0.96 : 0.92;
      vx *= damp; vy *= damp; vz *= damp;

      const s2 = vx*vx + vy*vy + vz*vz;
      if (s2 > 900) {
        const inv = 30 / Math.sqrt(s2);
        vx *= inv; vy *= inv; vz *= inv;
      }

      vel[i3] = vx; vel[i3+1] = vy; vel[i3+2] = vz;

      if (vx*vx + vy*vy + vz*vz > 0.0001) {
        pos[i3]   += vx * dt;
        pos[i3+1] += vy * dt;
        pos[i3+2] += vz * dt;
        dirty = true;
      }
    }

    if (dirty) posAttr.needsUpdate = true;
  });

  return (
    <group position={[WORLD_X, WORLD_Y, WORLD_Z]}>
      <mesh
        onPointerEnter={() => { document.body.style.cursor = 'crosshair'; }}
        onPointerLeave={() => { document.body.style.cursor = ''; }}
        onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(camera, pointer); }}
        onPointerUp={(e)   => { e.stopPropagation(); handlePointerUp(camera, pointer); }}
      >
        <planeGeometry args={[80, 40]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>
      {wellSnapshot.map(w => <WellMesh key={w.id} well={w} />)}
      <FlashMesh flashRef={flashRef} />
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
