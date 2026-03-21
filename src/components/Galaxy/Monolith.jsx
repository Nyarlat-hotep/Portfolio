import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { playCosmicVoid, stopCosmicVoid } from '../../utils/sounds';

const IDLE_SPIN  = 0.09;
const HOVER_SPIN = 2.5;

// ── Fragment orbit data ───────────────────────────────────────────────────────

function buildFragData() {
  return [
    { theta: 0,                speed:  0.7,  radius: 1.8, yOff:  0.4, bobPhase: 0.0 },
    { theta: Math.PI * 0.55,   speed: -0.5,  radius: 2.2, yOff: -0.3, bobPhase: 1.5 },
    { theta: Math.PI,          speed:  0.9,  radius: 1.6, yOff:  0.7, bobPhase: 0.8 },
    { theta: Math.PI * 1.55,   speed: -0.65, radius: 2.0, yOff: -0.6, bobPhase: 2.3 },
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Monolith({ position = [2, 35, -3], onOpen }) {
  const groupRef     = useRef();
  const hoverRef     = useRef(false);
  const fragRef      = useRef(0);
  const spinSpeedRef = useRef(IDLE_SPIN);
  const basePosRef   = useRef(position);
  const fragRefs     = useRef([]);

  const fragData = useMemo(() => buildFragData(), []);

  // Diamond halves
  const halfGeo   = useMemo(() => new THREE.ConeGeometry(1.0, 3.5, 4), []);
  const halfEdges = useMemo(() => new THREE.EdgesGeometry(halfGeo), [halfGeo]);

  const edgePoints = useMemo(() => {
    const arr = halfEdges.attributes.position.array;
    const pts = [];
    for (let i = 0; i < arr.length; i += 3) pts.push([arr[i], arr[i + 1], arr[i + 2]]);
    return pts;
  }, [halfEdges]);

  const mainMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#050508',
    metalness: 0.8,
    roughness: 0.3,
  }), []);

  const fragGeo = useMemo(() => new THREE.OctahedronGeometry(0.18, 0), []);
  const fragMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#00ff6a',
    transparent: true,
    opacity: 0,
    wireframe: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), []);

  useEffect(() => {
    return () => { halfGeo.dispose(); halfEdges.dispose(); mainMat.dispose(); fragGeo.dispose(); fragMat.dispose(); };
  }, [halfGeo, halfEdges, mainMat, fragGeo, fragMat]);

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

    // Fragment fade + orbit
    const targetFrag = hoverRef.current ? 0.75 : 0;
    fragRef.current += (targetFrag - fragRef.current) * Math.min(delta * 3, 1);
    fragMat.opacity = fragRef.current;

    fragData.forEach((f, i) => {
      f.theta += f.speed * delta;
      const mesh = fragRefs.current[i];
      if (!mesh) return;
      mesh.position.x = Math.cos(f.theta) * f.radius;
      mesh.position.y = f.yOff + Math.sin(t * 0.4 + f.bobPhase) * 0.25;
      mesh.position.z = Math.sin(f.theta) * f.radius;
      mesh.rotation.y = t * f.speed * 0.8;
      mesh.rotation.x = Math.sin(t * 0.35 + f.bobPhase) * 0.6;
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Hit zone */}
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); hoverRef.current = true; playCosmicVoid(); }}
        onPointerOut={() => { hoverRef.current = false; stopCosmicVoid(); }}
        onClick={(e) => { e.stopPropagation(); onOpen?.(); }}
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

      {/* Orbiting fragments — fade in on hover */}
      {fragData.map((_, i) => (
        <mesh key={i} ref={el => { fragRefs.current[i] = el; }}>
          <primitive object={fragGeo} attach="geometry" />
          <primitive object={fragMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
