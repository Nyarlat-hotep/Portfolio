import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { playCosmicVoid, stopCosmicVoid } from '../../utils/sounds';

const IDLE_SPIN  = 0.09;
const HOVER_SPIN = 0.9;

export default function Monolith({ position = [2, 35, -3] }) {
  const groupRef     = useRef();
  const hoverRef     = useRef(false);
  const pulseRef     = useRef(0);
  const spinSpeedRef = useRef(IDLE_SPIN);
  const basePosRef   = useRef(position);

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
    color: '#0a0a0f',
    emissive: new THREE.Color('#00ff6a'),
    emissiveIntensity: 0.15,
    metalness: 0.7,
    roughness: 0.4,
  }), []);

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
    </group>
  );
}
