import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { disposeObject, createCircularParticleTexture } from '../../utils/threeUtils';

export default function CustomPlanet({
  position,
  scale,
  textureUrl,
  color,
  name,
  tintIntensity = 0.3,
  rotationSpeed = 0.15,
  onHover,
  isDeleting = false
}) {
  const meshRef = useRef();
  const floatingRef = useRef();
  const particlesRef = useRef();
  const deletionParticlesRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState(0);
  const { camera, size } = useThree();

  // Load the planet texture
  const planetTexture = useTexture(textureUrl);


  // Use shared circular particle texture (cached globally)
  const particleTexture = useMemo(() => createCircularParticleTexture(), []);

  // Cleanup geometry and materials on unmount to prevent VRAM leaks
  useEffect(() => {
    return () => {
      if (meshRef.current) {
        disposeObject(meshRef.current);
      }
    };
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

  // Create deletion explosion particles
  const deletionParticleCount = 80;
  const deletionParticles = useMemo(() => {
    const positions = new Float32Array(deletionParticleCount * 3);
    const velocities = new Float32Array(deletionParticleCount * 3);
    for (let i = 0; i < deletionParticleCount; i++) {
      // Start near center
      positions[i * 3] = (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

      // Random outward velocity
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2 + Math.random() * 3;
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[i * 3 + 2] = Math.cos(phi) * speed;
    }
    return { positions, velocities };
  }, []);

  // Animate the planet
  useFrame((state, delta) => {
    // Handle deletion animation
    if (isDeleting) {
      setDeletionProgress(prev => Math.min(prev + delta * 1.5, 1));

      // Shrink the planet rapidly
      if (meshRef.current) {
        const shrinkScale = scale * Math.max(0, 1 - deletionProgress * 1.5);
        meshRef.current.scale.setScalar(shrinkScale);
        meshRef.current.rotation.y += delta * (rotationSpeed + deletionProgress * 10);
      }

      // Animate explosion particles outward
      if (deletionParticlesRef.current) {
        const positions = deletionParticlesRef.current.geometry.attributes.position;
        for (let i = 0; i < deletionParticleCount; i++) {
          positions.array[i * 3] += deletionParticles.velocities[i * 3] * delta;
          positions.array[i * 3 + 1] += deletionParticles.velocities[i * 3 + 1] * delta;
          positions.array[i * 3 + 2] += deletionParticles.velocities[i * 3 + 2] * delta;
        }
        positions.needsUpdate = true;
      }

      return;
    }

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
            emissive={color}
            emissiveIntensity={tintIntensity * 0.6}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>

        {/* Particle system - appear on hover */}
        {hovered && !isDeleting && (
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

        {/* Deletion explosion particles */}
        {isDeleting && (
          <points ref={deletionParticlesRef}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={deletionParticleCount}
                array={deletionParticles.positions}
                itemSize={3}
              />
            </bufferGeometry>
            <pointsMaterial
              map={particleTexture}
              size={0.15}
              color={color}
              transparent
              opacity={Math.max(0, 1 - deletionProgress)}
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
