import { useMemo, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const WORLD_X = -60, WORLD_Y = 0, WORLD_Z = 20;
const N = 5000;

const MAX_WELLS   = 5;
const WELL_RAMP   = 8;
const WELL_LIFE   = 15;
const WELL_COLORS = ['#26cdd4', '#f0b347', '#9944ee', '#4ade80', '#dd44bb'];
const CAPTURE_R   = 0.8;
const PULL_MAX    = 40;

let _wellId = 0;

const PAL = [
  new THREE.Color('#e88c2e'),
  new THREE.Color('#f0b347'),
  new THREE.Color('#1ea8c8'),
  new THREE.Color('#26cdd4'),
  new THREE.Color('#9944ee'),
  new THREE.Color('#dd44bb'),
  new THREE.Color('#c0451a'),
];

function randG() {
  const u = Math.max(1e-10, Math.random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

function buildField() {
  const pos  = new Float32Array(N * 3);
  const home = new Float32Array(N * 3);
  const vel  = new Float32Array(N * 3);
  const col  = new Float32Array(N * 3);

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
  return { geo, vel, home };
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

function WellMesh({ well }) {
  const ringRef = useRef();
  const outerRef = useRef();

  useFrame(() => {
    if (!ringRef.current || !outerRef.current) return;
    const strength = Math.min(1, well.age / WELL_RAMP);
    const lifeProgress = Math.min(1, well.age / WELL_LIFE);
    const pulse = 1 + 0.12 * Math.sin(well.age * 4) * strength;
    ringRef.current.scale.setScalar(pulse);
    ringRef.current.material.opacity = 0.5 + 0.5 * strength;
    outerRef.current.scale.setScalar(1 + lifeProgress * 0.5);
    outerRef.current.material.opacity = 0.1 + 0.3 * lifeProgress;
  });

  return (
    <group position={[well.x, well.y, well.z]}>
      <mesh>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#000000" emissive="#000000" />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.9, 0.15, 8, 48]} />
        <meshBasicMaterial
          color={well.color}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={outerRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.4, 0.08, 8, 48]} />
        <meshBasicMaterial
          color={well.color}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function GravityField() {
  const { geo, vel, home } = useMemo(() => buildField(), []);
  const tex = useMemo(() => getDotTex(), []);

  const { camera, pointer } = useThree();
  const wellsRef = useRef([]);
  const [wellSnapshot, setWellSnapshot] = useState([]);

  // Reusable temp objects — allocated once
  const _rc      = useMemo(() => new THREE.Raycaster(), []);
  const _pln     = useMemo(() => new THREE.Plane(), []);
  const _pn      = useMemo(() => new THREE.Vector3(), []);
  const _hit     = useMemo(() => new THREE.Vector3(), []);
  const _lm      = useMemo(() => new THREE.Vector3(), []);
  const WORLD_POS = useMemo(() => new THREE.Vector3(WORLD_X, WORLD_Y, WORLD_Z), []);

  const collapseWell = (idx) => {
    const wells = wellsRef.current;
    const w = wells[idx];
    const pos = geo.attributes.position.array;
    const BURST_R = 12;
    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      const dx = pos[i3] - w.x, dy = pos[i3+1] - w.y, dz = pos[i3+2] - w.z;
      const d2 = dx*dx + dy*dy + dz*dz;
      if (d2 < BURST_R*BURST_R && d2 > 0.001) {
        const d = Math.sqrt(d2);
        const strength = 60 * (1 - d / BURST_R);
        vel[i3]   += dx/d * strength;
        vel[i3+1] += dy/d * strength;
        vel[i3+2] += dz/d * strength;
      }
    }
    wells.splice(idx, 1);
    setWellSnapshot([...wells]);
  };

  const handleClick = (cam, ptr) => {
    _pn.set(
      cam.position.x - WORLD_X,
      cam.position.y - WORLD_Y,
      cam.position.z - WORLD_Z,
    ).normalize();
    _pln.setFromNormalAndCoplanarPoint(_pn, WORLD_POS);
    _rc.setFromCamera(ptr, cam);
    if (!_rc.ray.intersectPlane(_pln, _hit)) return;
    _lm.set(_hit.x - WORLD_X, _hit.y - WORLD_Y, _hit.z - WORLD_Z);

    const wells = wellsRef.current;
    for (let i = 0; i < wells.length; i++) {
      const w = wells[i];
      const dx = _lm.x - w.x, dy = _lm.y - w.y, dz = _lm.z - w.z;
      if (dx*dx + dy*dy + dz*dz < 4) {
        collapseWell(i);
        return;
      }
    }

    if (wells.length >= MAX_WELLS) return;
    wells.push({ id: _wellId++, x: _lm.x, y: _lm.y, z: _lm.z, age: 0, color: WELL_COLORS[wells.length % WELL_COLORS.length] });
    setWellSnapshot([...wells]);
  };

  useEffect(() => () => {
    geo.dispose();
    if (_tex) { _tex.dispose(); _tex = null; }
  }, [geo]);

  useFrame((_, delta) => {
    const posAttr = geo.attributes.position;
    const pos = posAttr.array;
    const dt = Math.min(delta, 0.05);
    let dirty = false;
    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      vel[i3]   += (home[i3]   - pos[i3])   * 0.3 * dt;
      vel[i3+1] += (home[i3+1] - pos[i3+1]) * 0.3 * dt;
      vel[i3+2] += (home[i3+2] - pos[i3+2]) * 0.3 * dt;
      vel[i3]   *= 0.92; vel[i3+1] *= 0.92; vel[i3+2] *= 0.92;
      if (Math.abs(vel[i3]) + Math.abs(vel[i3+1]) + Math.abs(vel[i3+2]) > 0.0001) {
        pos[i3]   += vel[i3]   * dt;
        pos[i3+1] += vel[i3+1] * dt;
        pos[i3+2] += vel[i3+2] * dt;
        dirty = true;
      }
    }
    if (dirty) posAttr.needsUpdate = true;
  });

  return (
    <group position={[WORLD_X, WORLD_Y, WORLD_Z]}>
      {/* Invisible hit plane — catches clicks across the whole west region */}
      <mesh
        onPointerEnter={() => { document.body.style.cursor = 'crosshair'; }}
        onPointerLeave={() => { document.body.style.cursor = ''; }}
        onClick={(e) => { e.stopPropagation(); handleClick(camera, pointer); }}
      >
        <planeGeometry args={[80, 40]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>
      {wellSnapshot.map(w => <WellMesh key={w.id} well={w} />)}
      <points geometry={geo}>
        <pointsMaterial
          map={tex}
          size={0.8}
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
