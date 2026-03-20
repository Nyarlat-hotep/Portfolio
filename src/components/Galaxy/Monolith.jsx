import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const EMISSIVE_IDLE  = new THREE.Color('#00ff6a');
const EMISSIVE_PULSE = new THREE.Color('#aaffee');

const RUNE_CHARS = ['ᚠ', 'ᛒ', 'ᚢ', 'ᛖ', 'ᛗ', 'ᚾ', 'ᛏ', 'ᚱ'];

function createRuneTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, size, size);

  ctx.font = `${Math.floor(size / 8)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const seed = 42;
  const rng = (i) => ((Math.sin(i * 127.1 + seed) * 43758.5453) % 1 + 1) % 1;

  for (let i = 0; i < 12; i++) {
    const x = rng(i * 3)     * size;
    const y = rng(i * 3 + 1) * size;
    const alpha = 0.25 + rng(i * 3 + 2) * 0.3;
    ctx.fillStyle = `rgba(0, 255, 106, ${alpha})`;
    ctx.fillText(RUNE_CHARS[i % RUNE_CHARS.length], x, y);
  }

  return new THREE.CanvasTexture(canvas);
}

let _runeTexCache = null;
function getRuneTexture() {
  if (!_runeTexCache) _runeTexCache = createRuneTexture();
  return _runeTexCache;
}

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

const WISP_COUNT = 4;

function buildWispData() {
  return Array.from({ length: WISP_COUNT }, (_, i) => ({
    theta:    (i / WISP_COUNT) * Math.PI * 2,
    speed:    (0.25 + i * 0.07) * (i % 2 === 0 ? 1 : -1),
    radius:   1.1 + i * 0.08,
    bobPhase: i * 1.3,
    bobAmp:   0.1 + i * 0.03,
    bobSpeed: 0.4 + i * 0.1,
  }));
}

export default function Monolith({ position = [2, 28, -3], onOpen, pulse = false }) {
  const groupRef    = useRef();
  const mainMatRef  = useRef();
  const hoverRef    = useRef(false);
  const pulseRef    = useRef(0);
  const basePosRef  = useRef(position);

  const runeTex  = useMemo(() => getRuneTexture(), []);
  const wispTex  = useMemo(() => getWispTex(),    []);
  const wispData = useMemo(() => buildWispData(), []);

  const wispGeo = useMemo(() => {
    const positions = new Float32Array(WISP_COUNT * 3);
    const geo  = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(positions, 3);
    attr.usage = THREE.DynamicDrawUsage;
    geo.setAttribute('position', attr);
    return geo;
  }, []);

  useEffect(() => {
    return () => {
      wispGeo.dispose();
    };
  }, [wispGeo]);

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;

    g.rotation.y += delta * 0.09;

    const t = state.clock.elapsedTime;
    g.position.x = basePosRef.current[0];
    g.position.y = basePosRef.current[1] + Math.sin(t * 0.5) * 0.15;
    g.position.z = basePosRef.current[2];

    const targetIntensity = pulse ? 1.8 : (hoverRef.current ? 0.5 : 0.12);
    pulseRef.current += (targetIntensity - pulseRef.current) * Math.min(delta * 3, 1);

    if (mainMatRef.current) {
      mainMatRef.current.emissiveIntensity = pulseRef.current;
      mainMatRef.current.emissive.copy(pulse ? EMISSIVE_PULSE : EMISSIVE_IDLE);
    }

    const posAttr = wispGeo.attributes.position;
    wispData.forEach((w, i) => {
      w.theta += w.speed * delta;
      const r  = w.radius + Math.sin(t * w.bobSpeed + w.bobPhase) * w.bobAmp;
      posAttr.setXYZ(i, Math.cos(w.theta) * r, Math.sin(t * 0.3 + w.bobPhase) * 0.3, Math.sin(w.theta) * r);
    });
    posAttr.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onOpen?.(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; hoverRef.current = true; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; hoverRef.current = false; }}
      >
        <boxGeometry args={[2, 8, 2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh>
        <boxGeometry args={[0.7, 6, 0.25]} />
        <meshStandardMaterial
          ref={mainMatRef}
          color="#0a0a0f"
          map={runeTex}
          emissiveMap={runeTex}
          emissive="#00ff6a"
          emissiveIntensity={0.12}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>

      <mesh>
        <boxGeometry args={[0.78, 6.1, 0.33]} />
        <meshBasicMaterial
          color="#00ff6a"
          side={THREE.BackSide}
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <points renderOrder={1} geometry={wispGeo}>
        <pointsMaterial
          map={wispTex}
          color="#88ffaa"
          size={0.18}
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
