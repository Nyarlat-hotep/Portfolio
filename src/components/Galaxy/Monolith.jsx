import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const EMISSIVE_IDLE = new THREE.Color('#00ff6a');

const IDLE_SPIN  = 0.09;
const HOVER_SPIN = 0.9;

// ── 8 canvas-drawn geometric symbols ─────────────────────────────────────────

function drawSymbol(ctx, idx, cx, cy, r, alpha) {
  ctx.save();
  ctx.strokeStyle = `rgba(0, 255, 106, ${alpha})`;
  ctx.lineWidth   = Math.max(1, r * 0.12);
  ctx.fillStyle   = `rgba(0, 255, 106, ${alpha})`;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  switch (idx) {
    case 0: // Dotted circle
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2); ctx.fill();
      break;
    case 1: // Bisected triangle (upward, horizontal line through center)
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.87, cy + r * 0.5);
      ctx.lineTo(cx - r * 0.87, cy + r * 0.5);
      ctx.closePath(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.44, cy); ctx.lineTo(cx + r * 0.44, cy);
      ctx.stroke();
      break;
    case 2: { // Crossed square
      const hs = r * 0.8;
      ctx.beginPath(); ctx.rect(cx - hs, cy - hs, hs * 2, hs * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - hs, cy - hs); ctx.lineTo(cx + hs, cy + hs);
      ctx.moveTo(cx + hs, cy - hs); ctx.lineTo(cx - hs, cy + hs);
      ctx.stroke();
      break;
    }
    case 3: // Concentric rings
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.stroke();
      break;
    case 4: // Inverted triangle
      ctx.beginPath();
      ctx.moveTo(cx, cy + r);
      ctx.lineTo(cx + r * 0.87, cy - r * 0.5);
      ctx.lineTo(cx - r * 0.87, cy - r * 0.5);
      ctx.closePath(); ctx.stroke();
      break;
    case 5: // Diamond + center dot
      ctx.beginPath();
      ctx.moveTo(cx,            cy - r);
      ctx.lineTo(cx + r * 0.65, cy);
      ctx.lineTo(cx,            cy + r);
      ctx.lineTo(cx - r * 0.65, cy);
      ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2); ctx.fill();
      break;
    case 6: // Mirrored arcs
      ctx.beginPath();
      ctx.arc(cx - r * 0.3, cy, r * 0.65, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + r * 0.3, cy, r * 0.65, Math.PI - Math.PI * 0.6, Math.PI + Math.PI * 0.6);
      ctx.stroke();
      break;
    case 7: // Radial spokes (6 lines from a central ring)
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2); ctx.stroke();
      for (let s = 0; s < 6; s++) {
        const a = (s / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.35, cy + Math.sin(a) * r * 0.35);
        ctx.lineTo(cx + Math.cos(a) * r,         cy + Math.sin(a) * r);
        ctx.stroke();
      }
      break;
    default: break;
  }
  ctx.restore();
}

function createSymbolTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, size, size);

  const seed = 99;
  const rng = (i) => ((Math.sin(i * 127.1 + seed) * 43758.5453) % 1 + 1) % 1;

  for (let i = 0; i < 14; i++) {
    const x     = rng(i * 4)     * size;
    const y     = rng(i * 4 + 1) * size;
    const r     = size * (0.03 + rng(i * 4 + 2) * 0.04);
    const alpha = 0.2 + rng(i * 4 + 3) * 0.3;
    drawSymbol(ctx, i % 8, x, y, r, alpha);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter  = THREE.LinearFilter;
  tex.anisotropy = 16;
  return tex;
}

let _symbolTexCache = null;
function getSymbolTexture() {
  if (!_symbolTexCache) _symbolTexCache = createSymbolTexture();
  return _symbolTexCache;
}

// ── Wisp glow sprite ──────────────────────────────────────────────────────────

function createWispGlow() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0,   'rgba(0, 255, 106, 1.0)');
  grad.addColorStop(0.3, 'rgba(0, 200, 80,  0.5)');
  grad.addColorStop(1.0, 'rgba(0, 100, 40,  0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

let _wispCache = null;
function getWispTex() {
  if (!_wispCache) _wispCache = createWispGlow();
  return _wispCache;
}

// ── Wisp orbit data ───────────────────────────────────────────────────────────

const WISP_COUNT = 4;

function buildWispData() {
  return Array.from({ length: WISP_COUNT }, (_, i) => ({
    theta:    (i / WISP_COUNT) * Math.PI * 2,
    speed:    (0.25 + i * 0.07) * (i % 2 === 0 ? 1 : -1),
    radius:   2.2 + i * 0.15,
    bobPhase: i * 1.3,
    bobAmp:   0.15 + i * 0.04,
    bobSpeed: 0.4 + i * 0.1,
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Monolith({ position = [2, 35, -3] }) {
  const groupRef     = useRef();
  const hoverRef     = useRef(false);
  const pulseRef     = useRef(0);
  const spinSpeedRef = useRef(IDLE_SPIN);
  const basePosRef   = useRef(position);

  const symbolTex = useMemo(() => getSymbolTexture(), []);
  const wispTex   = useMemo(() => getWispTex(),        []);
  const wispData  = useMemo(() => buildWispData(),     []);

  // Diamond — one half shared between upper and lower meshes
  // Each half is offset ±HALF_H so bases meet at equator and tips point out
  const halfGeo   = useMemo(() => new THREE.ConeGeometry(1.0, 3.5, 4), []);
  const halfEdges = useMemo(() => new THREE.EdgesGeometry(halfGeo), [halfGeo]);
  const mainMat   = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0a0a0f',
    map: symbolTex,
    emissiveMap: symbolTex,
    emissive: new THREE.Color('#00ff6a'),
    emissiveIntensity: 0.15,
    metalness: 0.7,
    roughness: 0.4,
  }), [symbolTex]);

  const wispGeo = useMemo(() => {
    const positions = new Float32Array(WISP_COUNT * 3);
    const geo  = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(positions, 3);
    attr.usage = THREE.DynamicDrawUsage;
    geo.setAttribute('position', attr);
    return geo;
  }, []);

  useEffect(() => {
    return () => { wispGeo.dispose(); };
  }, [wispGeo]);

  useEffect(() => {
    return () => { halfGeo.dispose(); halfEdges.dispose(); mainMat.dispose(); };
  }, [halfGeo, halfEdges, mainMat]);

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;

    // Lerped spin — accelerates on hover
    const targetSpin = hoverRef.current ? HOVER_SPIN : IDLE_SPIN;
    spinSpeedRef.current += (targetSpin - spinSpeedRef.current) * Math.min(delta * 4, 1);
    g.rotation.y += spinSpeedRef.current * delta;

    // Y bob
    const t = state.clock.elapsedTime;
    g.position.x = basePosRef.current[0];
    g.position.y = basePosRef.current[1] + Math.sin(t * 0.5) * 0.2;
    g.position.z = basePosRef.current[2];

    // Emissive intensity lerp — shared material updates both halves
    const targetIntensity = hoverRef.current ? 0.55 : 0.15;
    pulseRef.current += (targetIntensity - pulseRef.current) * Math.min(delta * 3, 1);
    mainMat.emissiveIntensity = pulseRef.current;

    // Wisp orbit
    const posAttr = wispGeo.attributes.position;
    wispData.forEach((w, i) => {
      w.theta += w.speed * delta;
      const r = w.radius + Math.sin(t * w.bobSpeed + w.bobPhase) * w.bobAmp;
      posAttr.setXYZ(i, Math.cos(w.theta) * r, Math.sin(t * 0.3 + w.bobPhase) * 0.4, Math.sin(w.theta) * r);
    });
    posAttr.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Hit zone — sphere covers full diamond */}
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); hoverRef.current = true; }}
        onPointerOut={() => { hoverRef.current = false; }}
      >
        <sphereGeometry args={[2.5, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Upper half — base at y=0, tip at y=+3.5 */}
      <mesh position={[0, 1.75, 0]}>
        <primitive object={halfGeo} attach="geometry" />
        <primitive object={mainMat} attach="material" />
      </mesh>

      {/* Lower half — base at y=0, tip at y=-3.5 */}
      <mesh position={[0, -1.75, 0]} rotation={[Math.PI, 0, 0]}>
        <primitive object={halfGeo} attach="geometry" />
        <primitive object={mainMat} attach="material" />
      </mesh>

      {/* Edge outlines — upper */}
      <lineSegments position={[0, 1.75, 0]}>
        <primitive object={halfEdges} attach="geometry" />
        <lineBasicMaterial
          color="#00ff6a"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Edge outlines — lower */}
      <lineSegments position={[0, -1.75, 0]} rotation={[Math.PI, 0, 0]}>
        <primitive object={halfEdges} attach="geometry" />
        <lineBasicMaterial
          color="#00ff6a"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Energy wisps */}
      <points renderOrder={1} geometry={wispGeo}>
        <pointsMaterial
          map={wispTex}
          color="#88ffaa"
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
