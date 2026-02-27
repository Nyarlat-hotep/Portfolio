import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const WORLD_X = -60, WORLD_Y = 0, WORLD_Z = 20;
const N = 5000;

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

export default function GravityField() {
  const { geo, vel, home } = useMemo(() => buildField(), []);
  const tex = useMemo(() => getDotTex(), []);

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
