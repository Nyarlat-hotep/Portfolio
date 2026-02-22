import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const START    = new THREE.Vector3(-22, 1.5, 8);
const VELOCITY = new THREE.Vector3(0.55, 0.04, -0.38);
const FADE_START       = 28;
const DORMANT_DURATION = 18;

// Elongation ratios — classic asteroid proportions
const EX = 1.9, EY = 0.65, EZ = 0.82;

const RESPAWN_ORIGINS = [
  new THREE.Vector3(-22, 2,   8),
  new THREE.Vector3(-18, -1,  12),
  new THREE.Vector3(-20, 3,   3),
];
const RESPAWN_VELS = [
  new THREE.Vector3(0.55,  0.04, -0.38),
  new THREE.Vector3(0.50, -0.03, -0.42),
  new THREE.Vector3(0.60,  0.06, -0.35),
];

// ── Noise ─────────────────────────────────────────────────────────────────────

function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return hash(ix,   iy)   * (1 - ux) * (1 - uy) +
         hash(ix+1, iy)   *      ux  * (1 - uy) +
         hash(ix,   iy+1) * (1 - ux) *      uy  +
         hash(ix+1, iy+1) *      ux  *      uy;
}

function fbm(x, y, octaves = 6) {
  let v = 0, amp = 0.5, freq = 1;
  for (let o = 0; o < octaves; o++) {
    v += smoothNoise(x * freq, y * freq) * amp;
    amp *= 0.5; freq *= 2;
  }
  return v;
}

// ── Craters ───────────────────────────────────────────────────────────────────

const CRATERS = [
  { cx: 0.30, cy: 0.40, r: 0.12 },
  { cx: 0.70, cy: 0.62, r: 0.09 },
  { cx: 0.55, cy: 0.18, r: 0.07 },
  { cx: 0.14, cy: 0.72, r: 0.10 },
  { cx: 0.82, cy: 0.30, r: 0.06 },
  { cx: 0.45, cy: 0.80, r: 0.05 },
  { cx: 0.65, cy: 0.48, r: 0.04 },
  { cx: 0.25, cy: 0.55, r: 0.04 },
];

function craterHeight(nx, ny) {
  let h = 0;
  for (const c of CRATERS) {
    const dx = nx - c.cx, dy = ny - c.cy;
    const dist = Math.sqrt(dx * dx + dy * dy) / c.r;
    if (dist < 1.3) {
      if (dist < 0.75) {
        h -= (1 - dist / 0.75) * 0.55;
      } else {
        h += (1 - (dist - 0.75) / 0.55) * 0.2;
      }
    }
  }
  return h;
}

function getHeight(x, y, size) {
  const nx = x / size, ny = y / size;
  return fbm(nx * 6, ny * 6) + craterHeight(nx, ny);
}

// ── Procedural textures ───────────────────────────────────────────────────────

function createAsteroidTextures() {
  const size = 512;

  // Albedo
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = albedoCanvas.height = size;
  const actx = albedoCanvas.getContext('2d');
  const albedoImg = actx.createImageData(size, size);
  const ad = albedoImg.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = getHeight(x, y, size);
      const i = (y * size + x) * 4;

      // 0–1: how far into shadow vs highlight (crater floors dark, ridges lighter)
      const heightNorm = Math.max(0, Math.min(1, (h + 0.55) / 1.2));

      // Large-scale zone noise → which color family dominates this region
      const zoneLarge  = fbm(x / size * 2.5 + 5,  y / size * 2.5 + 9,  4);
      // Fine detail noise → texture within each zone
      const zoneDetail = fbm(x / size * 9   + 2,  y / size * 9   + 4,  3);
      const zone = Math.max(0, Math.min(1, zoneLarge * 0.72 + zoneDetail * 0.28));

      // Green family: dark forest → mossy olive
      const gR = 14 + heightNorm * 48;
      const gG = 34 + heightNorm * 62;
      const gB = 12 + heightNorm * 20;

      // Brown family: dark earth → khaki
      const bR = 38 + heightNorm * 54;
      const bG = 22 + heightNorm * 44;
      const bB =  6 + heightNorm * 18;

      // Blend: zone≈0 → brown, zone≈1 → green
      ad[i]   = Math.min(255, Math.max(0, bR + (gR - bR) * zone));
      ad[i+1] = Math.min(255, Math.max(0, bG + (gG - bG) * zone));
      ad[i+2] = Math.min(255, Math.max(0, bB + (gB - bB) * zone));
      ad[i+3] = 255;
    }
  }
  actx.putImageData(albedoImg, 0, 0);

  // Normal map
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = normalCanvas.height = size;
  const nctx = normalCanvas.getContext('2d');
  const normalImg = nctx.createImageData(size, size);
  const nd = normalImg.data;
  const strength = 13;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const hL = getHeight(Math.max(0,      x - 1), y,                  size);
      const hR = getHeight(Math.min(size-1, x + 1), y,                  size);
      const hD = getHeight(x,               Math.max(0,      y - 1),    size);
      const hU = getHeight(x,               Math.min(size-1, y + 1),    size);
      const dX = (hR - hL) * strength;
      const dY = (hU - hD) * strength;
      const len = Math.sqrt(dX * dX + dY * dY + 1);
      nd[i]   = Math.round((-dX / len * 0.5 + 0.5) * 255);
      nd[i+1] = Math.round((-dY / len * 0.5 + 0.5) * 255);
      nd[i+2] = Math.round((  1 / len * 0.5 + 0.5) * 255);
      nd[i+3] = 255;
    }
  }
  nctx.putImageData(normalImg, 0, 0);

  return {
    albedo:    new THREE.CanvasTexture(albedoCanvas),
    normalMap: new THREE.CanvasTexture(normalCanvas),
  };
}

// Soft teal glow sprite for energy wisps
function createWispGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;

  // Outer halo
  const halo = ctx.createRadialGradient(c, c, 0, c, c, c);
  halo.addColorStop(0,    'rgba(180, 255, 240, 1.0)');
  halo.addColorStop(0.25, 'rgba(0,   255, 200, 0.7)');
  halo.addColorStop(0.55, 'rgba(0,   200, 160, 0.2)');
  halo.addColorStop(1.0,  'rgba(0,   180, 140, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  // Bright white core
  const core = ctx.createRadialGradient(c, c, 0, c, c, c * 0.3);
  core.addColorStop(0,   'rgba(255, 255, 255, 0.95)');
  core.addColorStop(0.5, 'rgba(200, 255, 240, 0.4)');
  core.addColorStop(1,   'rgba(0,   255, 200, 0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

// ── Geometry builder ──────────────────────────────────────────────────────────
// SphereGeometry gives a dense, indexed mesh — smooth normals + no polygon silhouette

function buildAsteroidGeo(rimScale = 1, seg = 64) {
  const geo = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    // Light noise — enough for rock irregularity, not enough to create hard edges
    const noise = 0.03 + ((i * 137 + 29) % 100) / 100 * 0.11;
    pos.setXYZ(i,
      pos.getX(i) * EX * rimScale * (1 + noise),
      pos.getY(i) * EY * rimScale * (1 + noise * 0.8),
      pos.getZ(i) * EZ * rimScale * (1 + noise * 0.9),
    );
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// ── Energy wisps ──────────────────────────────────────────────────────────────

const WISP_COUNT = 14;

function buildWispData() {
  return Array.from({ length: WISP_COUNT }, (_, i) => ({
    theta:    (i / WISP_COUNT) * Math.PI * 2 + Math.random() * 0.8,
    phi:      Math.PI * 0.15 + Math.random() * Math.PI * 0.7,
    speed:    (0.2 + Math.random() * 0.35) * (i % 2 === 0 ? 1 : -1),
    radius:   1.6 + Math.random() * 0.7,
    bobPhase: Math.random() * Math.PI * 2,
    bobSpeed: 0.3 + Math.random() * 0.5,
    bobAmp:   0.12 + Math.random() * 0.18,
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Asteroid({ onAsteroidClick }) {
  const groupRef   = useRef();
  const mainMatRef = useRef();
  const rimMatRef  = useRef();
  const wispMatRef = useRef();

  // High-res sphere for smooth surface; low-res copy for rim glow
  const geometry = useMemo(() => buildAsteroidGeo(1,    64), []);
  const rimGeo   = useMemo(() => buildAsteroidGeo(1.14, 32), []);

  const wispGeo = useMemo(() => {
    const positions = new Float32Array(WISP_COUNT * 3);
    const geo = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(positions, 3);
    attr.usage = THREE.DynamicDrawUsage;
    geo.setAttribute('position', attr);
    return geo;
  }, []);

  const wispData                = useMemo(() => buildWispData(), []);
  const { albedo, normalMap }   = useMemo(() => createAsteroidTextures(), []);
  const wispTexture             = useMemo(() => createWispGlowTexture(), []);
  const normalScale             = useMemo(() => new THREE.Vector2(2.2, 2.2), []);

  const stateRef = useRef({
    pos:          START.clone(),
    vel:          VELOCITY.clone(),
    dormant:      false,
    dormantTimer: 0,
    fadeOpacity:  1,
    fadeTarget:   1,
    respawnIndex: 0,
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      rimGeo.dispose();
      wispGeo.dispose();
      albedo.dispose();
      normalMap.dispose();
      wispTexture.dispose();
    };
  }, [geometry, rimGeo, wispGeo, albedo, normalMap, wispTexture]);

  useFrame((state, delta) => {
    const s = stateRef.current;
    const g = groupRef.current;
    if (!g) return;

    if (s.dormant) {
      s.fadeTarget = 0;
      s.dormantTimer += delta;
      if (s.dormantTimer >= DORMANT_DURATION) {
        s.dormant      = false;
        s.dormantTimer = 0;
        s.respawnIndex = (s.respawnIndex + 1) % RESPAWN_ORIGINS.length;
        s.pos.copy(RESPAWN_ORIGINS[s.respawnIndex]);
        s.vel.copy(RESPAWN_VELS[s.respawnIndex]);
        s.fadeTarget = 1;
        g.visible    = true;
      }
    } else {
      s.pos.addScaledVector(s.vel, delta);
      g.position.copy(s.pos);
      g.rotation.x += delta * 0.11;
      g.rotation.y += delta * 0.07;
      g.rotation.z += delta * 0.04;

      const distMax = Math.max(Math.abs(s.pos.x), Math.abs(s.pos.y), Math.abs(s.pos.z));
      s.fadeTarget  = distMax > FADE_START ? 0 : 1;

      if (s.fadeOpacity < 0.02 && distMax > FADE_START) {
        s.dormant      = true;
        s.dormantTimer = 0;
        g.visible      = false;
      }
    }

    s.fadeOpacity += (s.fadeTarget - s.fadeOpacity) * Math.min(delta * 1.2, 1);

    if (mainMatRef.current) mainMatRef.current.opacity = s.fadeOpacity;
    if (rimMatRef.current)  rimMatRef.current.opacity  = 0.2  * s.fadeOpacity;
    if (wispMatRef.current) wispMatRef.current.opacity = 0.7  * s.fadeOpacity;

    // Animate wisps along an ellipse matching the asteroid's elongation
    const t = state.clock.elapsedTime;
    const posAttr = wispGeo.attributes.position;
    wispData.forEach((w, i) => {
      w.theta += w.speed * delta;
      const r = w.radius + Math.sin(t * w.bobSpeed + w.bobPhase) * w.bobAmp;
      posAttr.setXYZ(i,
        Math.sin(w.phi) * Math.cos(w.theta) * r * EX,
        Math.cos(w.phi) * r * EY,
        Math.sin(w.phi) * Math.sin(w.theta) * r * EZ,
      );
    });
    posAttr.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={START.toArray()} scale={0.5}>

      {/* Main rock — dense sphere, writes depth so rim clips to silhouette */}
      <mesh
        renderOrder={0}
        geometry={geometry}
        onClick={(e) => { e.stopPropagation(); onAsteroidClick?.(); }}
      >
        <meshStandardMaterial
          ref={mainMatRef}
          map={albedo}
          normalMap={normalMap}
          normalScale={normalScale}
          emissive="#00ccaa"
          emissiveIntensity={0.12}
          roughness={0.92}
          metalness={0.05}
          transparent
        />
      </mesh>

      {/* Rim glow — slightly expanded BackSide copy, clips to rock silhouette */}
      <mesh renderOrder={1} geometry={rimGeo}>
        <meshBasicMaterial
          ref={rimMatRef}
          color="#00ffcc"
          side={THREE.BackSide}
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Energy wisps — glowing circular sprites orbiting the elongated shape */}
      <points renderOrder={2} geometry={wispGeo}>
        <pointsMaterial
          ref={wispMatRef}
          map={wispTexture}
          color="#88ffee"
          size={0.22}
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          alphaTest={0.01}
        />
      </points>

    </group>
  );
}
