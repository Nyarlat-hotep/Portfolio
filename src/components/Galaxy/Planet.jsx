import { useRef, useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import Moon from './Moon';
import { disposeObject, createCircularParticleTexture } from '../../utils/threeUtils';

function Planet({
  position,
  scale,
  color,
  tooltipColor,
  emissive,
  emissiveIntensity,
  rotationSpeed = 0.1,
  name,
  type,
  moons,
  onClick,
  isActive,
  onHover
}) {
  const meshRef = useRef();
  const floatingRef = useRef();
  const ringRef1 = useRef();
  const ringRef2 = useRef();
  const particlesRef = useRef();
  const [hovered, setHovered] = useState(false);
  const { camera, size } = useThree();

  // Determine which texture to use based on planet properties
  const textureUrl = useMemo(() => {
    const colorValue = color.toLowerCase();

    // Home planet uses sun texture
    if (type === 'star') {
      return '/textures/sun.jpg';
    } else if (colorValue.includes('a855f7')) {
      return '/textures/venus.jpg';
    } else if (colorValue.includes('22d3ee')) {
      return '/textures/uranus.jpg';
    } else if (colorValue.includes('ec4899')) {
      return '/textures/mars.jpg';
    } else if (colorValue.includes('10b981')) {
      return '/textures/neptune.jpg';
    }
    return '/textures/jupiter.jpg';
  }, [color, type]);

  // Load the planet texture
  const planetTexture = useTexture(textureUrl);

  // Use shared circular particle texture (cached globally)
  const particleTexture = useMemo(() => createCircularParticleTexture(), []);

  // Stable geometry references — memoized to prevent GPU object recreation on re-render
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);
  const ringGeo   = useMemo(() => new THREE.RingGeometry(1.5, 2, 64), []);

  // Cleanup geometry and materials on unmount to prevent VRAM leaks
  useEffect(() => {
    return () => {
      ringGeo.dispose();
      if (meshRef.current) {
        disposeObject(meshRef.current);
      }
    };
  }, [ringGeo]);

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

  // Rotate the planet slowly
  useFrame((state, delta) => {
    // Gentle floating animation on the shared group (planet + moons move together)
    if (floatingRef.current) {
      floatingRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * rotationSpeed;

      // Scale up on hover or when active - smoother animation
      const targetScale = (hovered || isActive) ? scale * 1.15 : scale;
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.05
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

  const handlePointerOver = useCallback((e) => {
    e.stopPropagation();
    setHovered(true);

    // Calculate screen position and screen-space radius of the planet
    if (meshRef.current) {
      const center = new THREE.Vector3();
      meshRef.current.getWorldPosition(center);

      // Get current visual scale (accounts for hover lerp)
      const currentScale = meshRef.current.scale.x;

      // Project center to screen
      const projCenter = center.clone().project(camera);
      const cx = (projCenter.x * 0.5 + 0.5) * size.width;
      const cy = (projCenter.y * -0.5 + 0.5) * size.height;

      // Project a point on the planet's right edge to get screen-space radius
      const edge = center.clone().add(new THREE.Vector3(currentScale, 0, 0));
      const projEdge = edge.project(camera);
      const ex = (projEdge.x * 0.5 + 0.5) * size.width;
      const screenRadius = Math.abs(ex - cx);

      onHover?.(name, { x: cx, y: cy, radius: screenRadius, color: tooltipColor || color });
    }

    document.body.style.cursor = 'pointer';
  }, [camera, size, name, tooltipColor, color, onHover]);

  const handlePointerOut = useCallback((e) => {
    e.stopPropagation();
    setHovered(false);
    onHover?.(null, null);
    document.body.style.cursor = 'auto';
  }, [onHover]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    onClick?.();
  }, [onClick]);

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

      {/* Floating group — planet, moons, and particles share the same center */}
      <group ref={floatingRef}>
        {/* Main planet sphere */}
        <mesh
          ref={meshRef}
          geometry={sphereGeo}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          {type === 'star' ? (
            // Sun - bright and emissive
            <meshStandardMaterial
              map={planetTexture}
              emissive="#ffaa00"
              emissiveMap={planetTexture}
              emissiveIntensity={1.2}
              roughness={1.0}
              metalness={0.0}
              toneMapped={false}
            />
          ) : (
            // Planets - realistic with better lighting response
            <meshStandardMaterial
              map={planetTexture}
              emissive={emissive}
              emissiveIntensity={isActive ? 0.4 : 0.2}
              roughness={0.7}
              metalness={0.1}
            />
          )}
        </mesh>

        {/* Moons */}
        {moons?.map(moon => <Moon key={moon.id} {...moon} />)}

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

        {/* Optional ring for certain planets (like Saturn) */}
        {type === 'ringed' && (
          <mesh geometry={ringGeo} rotation={[Math.PI / 2, 0, 0]}>
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

// Memoize to prevent re-renders when parent state changes but planet props don't
export default memo(Planet);
