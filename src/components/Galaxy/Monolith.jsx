import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const EMISSIVE_IDLE  = new THREE.Color('#00ff6a');
const EMISSIVE_PULSE = new THREE.Color('#aaffee');

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

function createSymbolTexture(size = 256) {
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

  return new THREE.CanvasTexture(canvas);
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

export default function Monolith({ position = [2, 28, -3], onOpen, pulse = false }) {
  const groupRef     = useRef();
  const mainMatRef   = useRef();
  const hoverRef     = useRef(false);
  const pulseRef     = useRef(0);
  const spinSpeedRef = useRef(IDLE_SPIN);
  const basePosRef   = useRef(position);

  const symbolTex = useMemo(() => getSymbolTexture(), []);
  const wispTex   = useMemo(() => getWispTex(),        []);
  const wispData  = useMemo(() => buildWispData(),     []);

  const pyramidGeo   = useMemo(() => new THREE.ConeGeometry(2.5, 7, 4), []);
  const pyramidEdges = useMemo(() => new THREE.EdgesGeometry(pyramidGeo), [pyramidGeo]);

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
    return () => { pyramidGeo.dispose(); pyramidEdges.dispose(); };
  }, [pyramidGeo, pyramidEdges]);

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

    // Emissive intensity lerp
    const targetIntensity = pulse ? 1.8 : (hoverRef.current ? 0.55 : 0.15);
    pulseRef.current += (targetIntensity - pulseRef.current) * Math.min(delta * 3, 1);
    if (mainMatRef.current) {
      mainMatRef.current.emissiveIntensity = pulseRef.current;
      mainMatRef.current.emissive.copy(pulse ? EMISSIVE_PULSE : EMISSIVE_IDLE);
    }

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
      {/* Invisible hit zone — generous cone around the pyramid */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onOpen?.(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; hoverRef.current = true; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; hoverRef.current = false; }}
      >
        <coneGeometry args={[3.5, 9, 4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Main pyramid */}
      <mesh>
        <primitive object={pyramidGeo} attach="geometry" />
        <meshStandardMaterial
          ref={mainMatRef}
          color="#0a0a0f"
          map={symbolTex}
          emissiveMap={symbolTex}
          emissive="#00ff6a"
          emissiveIntensity={0.15}
          metalness={0.7}
          roughness={0.4}
        />
      </mesh>

      {/* Edge outlines — trace pyramid faces */}
      <lineSegments>
        <primitive object={pyramidEdges} attach="geometry" />
        <lineBasicMaterial
          color="#00ff6a"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Rim glow — slightly larger BackSide copy */}
      <mesh>
        <coneGeometry args={[2.85, 7.98, 4]} />
        <meshBasicMaterial
          color="#00ff6a"
          side={THREE.BackSide}
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

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
