import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

export default function Planet({
  position,
  scale,
  color,
  emissive,
  emissiveIntensity,
  name,
  type,
  onClick,
  isActive,
  onHover
}) {
  const meshRef = useRef();
  const ringRef1 = useRef();
  const ringRef2 = useRef();
  const particlesRef = useRef();
  const [hovered, setHovered] = useState(false);

  // Create particle positions around the planet
  const particleCount = 50;
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 1.8 + Math.random() * 0.5;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    return positions;
  }, []);

  // Rotate the planet slowly
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;

      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;

      // Scale up on hover or when active
      const targetScale = (hovered || isActive) ? scale * 1.15 : scale;
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.1
      );
    }

    // Rotate orbital rings
    if (ringRef1.current) {
      ringRef1.current.rotation.z += delta * 0.3;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z -= delta * 0.2;
    }

    // Animate particles
    if (particlesRef.current && (hovered || isActive)) {
      particlesRef.current.rotation.y += delta * 0.1;
      particlesRef.current.rotation.x += delta * 0.05;
    }
  });

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setHovered(true);
    onHover?.(name);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    setHovered(false);
    onHover?.(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <group position={position}>
      {/* Point light for glow effect */}
      {(hovered || isActive) && (
        <pointLight
          color={color}
          intensity={isActive ? 2 : 1}
          distance={5}
          decay={2}
        />
      )}

      {/* Main planet sphere with wireframe */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={isActive ? emissiveIntensity * 1.5 : emissiveIntensity}
          roughness={0.5}
          metalness={0.5}
        />
      </mesh>

      {/* Wireframe overlay - only when hovered/active */}
      {(hovered || isActive) && (
        <>
          <mesh>
            <sphereGeometry args={[1.02, 16, 16]} />
            <meshBasicMaterial
              color={color}
              wireframe
              transparent
              opacity={0.4}
            />
          </mesh>

          {/* Holographic scanning lines */}
          <mesh>
            <sphereGeometry args={[1.01, 32, 8]} />
            <meshBasicMaterial
              color={color}
              wireframe
              transparent
              opacity={0.3}
            />
          </mesh>
        </>
      )}

      {/* Glow effect ring for active/hovered state */}
      {(hovered || isActive) && (
        <Sphere args={[1.3, 32, 32]}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </Sphere>
      )}

      {/* Particle system - appear on hover/active */}
      {(hovered || isActive) && (
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={particleCount}
              array={particles}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.05}
            color={color}
            transparent
            opacity={0.6}
            sizeAttenuation
          />
        </points>
      )}

      {/* Technical orbital rings - appear on hover/active */}
      {(hovered || isActive) && (
        <>
          {/* First orbital ring */}
          <mesh ref={ringRef1} rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[1.5, 0.015, 16, 64]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.5}
            />
          </mesh>

          {/* Second orbital ring */}
          <mesh ref={ringRef2} rotation={[Math.PI / 2.5, Math.PI / 4, 0]}>
            <torusGeometry args={[1.6, 0.01, 16, 64]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.3}
            />
          </mesh>
        </>
      )}

      {/* Optional ring for certain planets (like Saturn) */}
      {type === 'ringed' && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 2, 64]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
