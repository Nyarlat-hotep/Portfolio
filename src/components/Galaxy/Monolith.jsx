import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { playCosmicVoid, stopCosmicVoid } from '../../utils/sounds';

const IDLE_SPIN  = 0.09;
const HOVER_SPIN = 0.9;

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
  const groupRef      = useRef();
  const hoverRef      = useRef(false);
  const pulseRef      = useRef(0);
  const beamRef       = useRef(0);   // 0→1 lerped beam opacity
  const spinSpeedRef  = useRef(IDLE_SPIN);
  const basePosRef    = useRef(position);
  const beamMatRef    = useRef();
  const beamGlowMatRef = useRef();

  const wispTex  = useMemo(() => getWispTex(),    []);
  const wispData = useMemo(() => buildWispData(),  []);

  // Diamond — one half shared between upper and lower meshes
  const halfGeo   = useMemo(() => new THREE.ConeGeometry(1.0, 3.5, 4), []);
  const halfEdges = useMemo(() => new THREE.EdgesGeometry(halfGeo), [halfGeo]);

  // Edge points for drei <Line segments>
  const edgePoints = useMemo(() => {
    const arr = halfEdges.attributes.position.array;
    const pts = [];
    for (let i = 0; i < arr.length; i += 3) pts.push([arr[i], arr[i + 1], arr[i + 2]]);
    return pts;
  }, [halfEdges]);

  const mainMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0a0a0f',
    emissive: new THREE.Color('#00ff6a'),
    emissiveIntensity: 0.15,
    metalness: 0.7,
    roughness: 0.4,
  }), []);

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

    // Emissive intensity lerp
    const targetIntensity = hoverRef.current ? 0.55 : 0.15;
    pulseRef.current += (targetIntensity - pulseRef.current) * Math.min(delta * 3, 1);
    mainMat.emissiveIntensity = pulseRef.current;

    // Energy beam fade in/out
    const targetBeam = hoverRef.current ? 1 : 0;
    beamRef.current += (targetBeam - beamRef.current) * Math.min(delta * 3, 1);
    if (beamMatRef.current)     beamMatRef.current.opacity     = beamRef.current * 0.9;
    if (beamGlowMatRef.current) beamGlowMatRef.current.opacity = beamRef.current * 0.22;

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
      {/* Hit zone */}
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); hoverRef.current = true; playCosmicVoid(); }}
        onPointerOut={() => { hoverRef.current = false; stopCosmicVoid(); }}
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
      <group position={[0, 1.75, 0]}>
        <Line points={edgePoints} segments lineWidth={1.8}
          color="#00ff6a" opacity={0.6} transparent
          depthWrite={false} blending={THREE.AdditiveBlending}
        />
      </group>

      {/* Edge outlines — lower */}
      <group position={[0, -1.75, 0]} rotation={[Math.PI, 0, 0]}>
        <Line points={edgePoints} segments lineWidth={1.8}
          color="#00ff6a" opacity={0.6} transparent
          depthWrite={false} blending={THREE.AdditiveBlending}
        />
      </group>

      {/* Energy beam — inner core (tip to tip + slight overshoot) */}
      <mesh>
        <cylinderGeometry args={[0.035, 0.035, 8.0, 8]} />
        <meshBasicMaterial
          ref={beamMatRef}
          color="#00ff6a"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Energy beam — outer glow halo */}
      <mesh>
        <cylinderGeometry args={[0.11, 0.11, 8.0, 8]} />
        <meshBasicMaterial
          ref={beamGlowMatRef}
          color="#00ff6a"
          transparent
          opacity={0}
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
