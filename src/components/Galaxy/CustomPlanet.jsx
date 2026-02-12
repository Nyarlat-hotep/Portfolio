import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

export default function CustomPlanet({
  position,
  scale,
  textureUrl,
  color,
  name,
  rotationSpeed = 0.15,
  onHover
}) {
  const meshRef = useRef();
  const floatingRef = useRef();
  const particlesRef = useRef();
  const [hovered, setHovered] = useState(false);
  const { camera, size } = useThree();

  // Load the planet texture
  const planetTexture = useTexture(textureUrl);

  // Parse color for tinting
  const tintColor = useMemo(() => new THREE.Color(color), [color]);

  // Circular particle texture
  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Create particle positions around the planet
  const particleCount = 30;
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

  // Animate the planet
  useFrame((state, delta) => {
    // Gentle floating animation
    if (floatingRef.current) {
      floatingRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * rotationSpeed;

      // Scale up on hover
      const targetScale = hovered ? scale * 1.15 : scale;
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.05
      );
    }

    // Animate particles
    if (particlesRef.current && hovered) {
      particlesRef.current.rotation.y += delta * 0.1;
      particlesRef.current.rotation.x += delta * 0.05;
    }
  });

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setHovered(true);

    // Calculate screen position for tooltip
    if (meshRef.current) {
      const center = new THREE.Vector3();
      meshRef.current.getWorldPosition(center);
      const currentScale = meshRef.current.scale.x;

      const projCenter = center.clone().project(camera);
      const cx = (projCenter.x * 0.5 + 0.5) * size.width;
      const cy = (projCenter.y * -0.5 + 0.5) * size.height;

      const edge = center.clone().add(new THREE.Vector3(currentScale, 0, 0));
      const projEdge = edge.project(camera);
      const ex = (projEdge.x * 0.5 + 0.5) * size.width;
      const screenRadius = Math.abs(ex - cx);

      onHover?.(name, { x: cx, y: cy, radius: screenRadius, color: color });
    }

    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    setHovered(false);
    onHover?.(null, null);
    document.body.style.cursor = 'auto';
  };

  return (
    <group position={position}>
      {/* Point light for glow effect */}
      {hovered && (
        <pointLight
          color={color}
          intensity={1}
          distance={5}
          decay={2}
        />
      )}

      {/* Floating group */}
      <group ref={floatingRef}>
        {/* Main planet sphere with color tinting */}
        <mesh
          ref={meshRef}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial
            map={planetTexture}
            color={tintColor}
            emissive={tintColor}
            emissiveIntensity={0.2}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>

        {/* Particle system - appear on hover */}
        {hovered && (
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
              map={particleTexture}
              size={0.1}
              color={color}
              transparent
              opacity={0.9}
              sizeAttenuation
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </points>
        )}
      </group>
    </group>
  );
}
