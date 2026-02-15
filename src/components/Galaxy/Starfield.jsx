import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCircularParticleTexture } from '../../utils/threeUtils';

export default function Starfield({ count = 5000 }) {
  const pointsRef = useRef();
  const brightRef = useRef();
  const featureRef = useRef();

  // Use shared circular particle texture (cached globally)
  const starTexture = useMemo(() => createCircularParticleTexture(), []);

  // Cleanup geometry and materials on unmount
  useEffect(() => {
    return () => {
      // Dispose materials from refs
      [pointsRef, brightRef, featureRef].forEach(ref => {
        if (ref.current?.material) {
          ref.current.material.dispose();
        }
        if (ref.current?.geometry) {
          ref.current.geometry.dispose();
        }
      });
    };
  }, []);

  // Background stars (majority)
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const radius = 30 + Math.random() * 70;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const color = new THREE.Color();
      const hue = 0.55 + Math.random() * 0.1;
      const saturation = Math.random() * 0.3;
      const lightness = 0.6 + Math.random() * 0.3;
      color.setHSL(hue, saturation, lightness);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { positions, colors };
  }, [count]);

  // Bright accent stars (~5%, larger and whiter)
  const brightCount = Math.floor(count * 0.05);
  const brightParticles = useMemo(() => {
    const positions = new Float32Array(brightCount * 3);
    const colors = new Float32Array(brightCount * 3);

    for (let i = 0; i < brightCount; i++) {
      const radius = 30 + Math.random() * 70;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const color = new THREE.Color();
      const hue = 0.55 + Math.random() * 0.1;
      const saturation = Math.random() * 0.08;
      const lightness = 0.92 + Math.random() * 0.08;
      color.setHSL(hue, saturation, lightness);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { positions, colors };
  }, [brightCount]);

  // Feature stars (~30, much larger, scattered prominently)
  const featureCount = 30;
  const featureParticles = useMemo(() => {
    const positions = new Float32Array(featureCount * 3);
    const colors = new Float32Array(featureCount * 3);

    for (let i = 0; i < featureCount; i++) {
      const radius = 35 + Math.random() * 55;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const color = new THREE.Color();
      // Warm white to cool white variety
      const hue = Math.random() < 0.3 ? 0.08 + Math.random() * 0.05 : 0.55 + Math.random() * 0.1;
      const saturation = Math.random() * 0.15;
      const lightness = 0.95 + Math.random() * 0.05;
      color.setHSL(hue, saturation, lightness);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { positions, colors };
  }, []);

  // Rotation + twinkle
  useFrame((state, delta) => {
    const rot = delta * 0.01;
    const rotX = delta * 0.005;

    if (pointsRef.current) {
      pointsRef.current.rotation.y += rot;
      pointsRef.current.rotation.x += rotX;
    }
    if (brightRef.current) {
      brightRef.current.rotation.y += rot;
      brightRef.current.rotation.x += rotX;
      brightRef.current.material.opacity = 0.85 + Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
    }
    if (featureRef.current) {
      featureRef.current.rotation.y += rot;
      featureRef.current.rotation.x += rotX;
      featureRef.current.material.opacity = 0.8 + Math.sin(state.clock.elapsedTime * 0.3 + 1.5) * 0.2;
    }
  });

  return (
    <group>
      {/* Background stars */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.positions.length / 3}
            array={particles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particles.colors.length / 3}
            array={particles.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          map={starTexture}
          size={0.25}
          vertexColors
          transparent
          opacity={0.45}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Bright accent stars */}
      <points ref={brightRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={brightParticles.positions.length / 3}
            array={brightParticles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={brightParticles.colors.length / 3}
            array={brightParticles.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          map={starTexture}
          size={0.5}
          vertexColors
          transparent
          opacity={1}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Feature stars — big and prominent */}
      <points ref={featureRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={featureParticles.positions.length / 3}
            array={featureParticles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={featureParticles.colors.length / 3}
            array={featureParticles.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          map={starTexture}
          size={1.0}
          vertexColors
          transparent
          opacity={1}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}
