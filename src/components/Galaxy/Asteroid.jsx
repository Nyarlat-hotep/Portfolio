import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fbm } from '../../utils/noise';

const START    = new THREE.Vector3(-32, 2, 14);
const VELOCITY = new THREE.Vector3(0.55, 0.04, -0.38);
const FADE_START       = 40;
const DORMANT_DURATION = 18;

const RESPAWN_ORIGINS = [
  new THREE.Vector3(-32, 2,   14),
  new THREE.Vector3(-28, -2,  18),
  new THREE.Vector3(-30, 4,    6),
];
const RESPAWN_VELS = [
  new THREE.Vector3(0.55,  0.04, -0.38),
  new THREE.Vector3(0.50, -0.03, -0.42),
  new THREE.Vector3(0.60,  0.06, -0.35),
];

const NORMAL_SCALE = new THREE.Vector2(2.0, 2.0);

// ── Pyramid geometry ───────────────────────────────────────────────────────────

function buildPyramidGeo(rimScale = 1) {
  const geo = new THREE.ConeGeometry(rimScale * 0.85, rimScale * 1.7, 4);
  geo.computeVertexNormals();
  return geo;
}

// ── Procedural stone textures ─────────────────────────────────────────────────

function sampleHeight(nx, ny) {
  return fbm(nx * 5, ny * 5, 5) * 0.65
       + fbm(nx * 16 + 7.3, ny * 16 + 7.3, 3) * 0.35;
}

function createStoneAlbedo(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size, ny = y / size;
      const n  = Math.max(0, Math.min(1, sampleHeight(nx, ny)));
      const i  = (y * size + x) * 4;
      d[i]     = Math.round(52  + n * 118);
      d[i + 1] = Math.round(38  + n * 78);
      d[i + 2] = Math.round(22  + n * 42);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

function createStoneNormal(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d   = img.data;
  const step = 1 / size, strength = 5.0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size, ny = y / size;
      const dx = sampleHeight(nx + step, ny) - sampleHeight(nx - step, ny);
      const dy = sampleHeight(nx, ny + step) - sampleHeight(nx, ny - step);
      const sx = -dx * strength, sy = -dy * strength;
      const len = Math.sqrt(sx * sx + sy * sy + 1);
      const i   = (y * size + x) * 4;
      d[i]     = Math.round((sx / len * 0.5 + 0.5) * 255);
      d[i + 1] = Math.round((sy / len * 0.5 + 0.5) * 255);
      d[i + 2] = Math.round((1  / len * 0.5 + 0.5) * 255);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

let _stoneAlbedo = null;
let _stoneNormal = null;
function getStoneTextures() {
  if (!_stoneAlbedo) _stoneAlbedo = createStoneAlbedo();
  if (!_stoneNormal) _stoneNormal = createStoneNormal();
  return { albedo: _stoneAlbedo, normal: _stoneNormal };
}

// ── Wisp glow sprite ──────────────────────────────────────────────────────────

function createWispGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;

  const halo = ctx.createRadialGradient(c, c, 0, c, c, c);
  halo.addColorStop(0,    'rgba(180, 255, 240, 1.0)');
  halo.addColorStop(0.25, 'rgba(0,   255, 200, 0.7)');
  halo.addColorStop(0.55, 'rgba(0,   200, 160, 0.2)');
  halo.addColorStop(1.0,  'rgba(0,   180, 140, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  const core = ctx.createRadialGradient(c, c, 0, c, c, c * 0.3);
  core.addColorStop(0,   'rgba(255, 255, 255, 0.95)');
  core.addColorStop(0.5, 'rgba(200, 255, 240, 0.4)');
  core.addColorStop(1,   'rgba(0,   255, 200, 0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

let _wispTextureCache = null;
function getWispTexture() {
  if (!_wispTextureCache) _wispTextureCache = createWispGlowTexture();
  return _wispTextureCache;
}

// ── Energy wisps ──────────────────────────────────────────────────────────────

const WISP_COUNT = 14;

// Wisps form a vertical line with the pyramid as the midpoint.
// 7 below the base, 7 above the apex — pyramid sits in the gap.
const LINE_POSITIONS = [
  -3.4, -3.0, -2.6, -2.2, -1.8, -1.4, -1.0,  // below base (apex ~0.85)
   1.0,  1.4,  1.8,  2.2,  2.6,  3.0,  3.4,  // above apex
];

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
  const groupRef     = useRef();
  const mainMatRef   = useRef();
  const rimMatRef    = useRef();
  const wispMatRef   = useRef();
  const isHoveredRef = useRef(false);
  const hoverRef     = useRef(0);

  const geometry = useMemo(() => buildPyramidGeo(1),    []);
  const rimGeo   = useMemo(() => buildPyramidGeo(1.14), []);

  const { albedo, normal } = useMemo(() => getStoneTextures(), []);

  const wispGeo = useMemo(() => {
    const positions = new Float32Array(WISP_COUNT * 3);
    const geo  = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(positions, 3);
    attr.usage = THREE.DynamicDrawUsage;
    geo.setAttribute('position', attr);
    return geo;
  }, []);

  const wispData    = useMemo(() => buildWispData(), []);
  const wispTexture = useMemo(() => getWispTexture(), []);

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
      // albedo, normal, wispTexture are module-level caches — not disposed here
    };
  }, [geometry, rimGeo, wispGeo]);

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

    if (mainMatRef.current) {
      const fading = s.fadeOpacity < 0.99;
      mainMatRef.current.transparent = fading;
      mainMatRef.current.opacity     = fading ? s.fadeOpacity : 1;
      mainMatRef.current.needsUpdate = true;
    }
    if (rimMatRef.current)  rimMatRef.current.opacity  = 0.07 * s.fadeOpacity;
    if (wispMatRef.current) wispMatRef.current.opacity = 0.7  * s.fadeOpacity;

    // Smooth hover lerp
    const hTarget = isHoveredRef.current ? 1 : 0;
    hoverRef.current += (hTarget - hoverRef.current) * Math.min(delta * 3, 1);
    const h = hoverRef.current;

    // Animate wisps — lerp between orbit and line-through-pyramid on hover
    const t       = state.clock.elapsedTime;
    const posAttr = wispGeo.attributes.position;
    wispData.forEach((w, i) => {
      w.theta += w.speed * delta;
      const r  = w.radius + Math.sin(t * w.bobSpeed + w.bobPhase) * w.bobAmp;
      const ox = Math.sin(w.phi) * Math.cos(w.theta) * r;
      const oy = Math.cos(w.phi) * r;
      const oz = Math.sin(w.phi) * Math.sin(w.theta) * r;
      posAttr.setXYZ(i,
        ox + (0              - ox) * h,
        oy + (LINE_POSITIONS[i] - oy) * h,
        oz + (0              - oz) * h,
      );
    });
    posAttr.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={START.toArray()} scale={0.5}>

      {/* Invisible hover zone — larger sphere so pointer events fire before reaching the pyramid */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onAsteroidClick?.(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; isHoveredRef.current = true; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; isHoveredRef.current = false; }}
      >
        <sphereGeometry args={[2.8, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Main pyramid — stone texture + normal map */}
      <mesh renderOrder={0} geometry={geometry}>
        <meshStandardMaterial
          ref={mainMatRef}
          map={albedo}
          normalMap={normal}
          normalScale={NORMAL_SCALE}
          emissive="#00ccaa"
          emissiveIntensity={0.08}
          roughness={0.95}
          metalness={0.02}
        />
      </mesh>

      {/* Rim glow — slightly expanded BackSide copy */}
      <mesh renderOrder={1} geometry={rimGeo}>
        <meshBasicMaterial
          ref={rimMatRef}
          color="#00ffcc"
          side={THREE.BackSide}
          transparent
          opacity={0.07}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Energy wisps */}
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
