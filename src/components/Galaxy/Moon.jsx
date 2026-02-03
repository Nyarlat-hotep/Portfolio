import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { createRockyTexture, createIcyTexture, createAlienTexture } from '../../utils/planetTextures';

const noRaycast = () => null;

export default function Moon({ scale = 0.1, orbitRadius = 2, orbitSpeed = 0.05, orbitTilt = 0, textureType = 'rocky' }) {
  const meshRef = useRef();

  const proceduralTexture = useMemo(() => {
    if (textureType === 'icy') return createIcyTexture(128);
    if (textureType === 'alien') return createAlienTexture(128, { r: 195, g: 175, b: 215 });
    return createRockyTexture(128);
  }, [textureType]);

  const texture = proceduralTexture;

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.elapsedTime * orbitSpeed;
      meshRef.current.position.x = Math.cos(t) * orbitRadius;
      meshRef.current.position.z = Math.sin(t) * orbitRadius;
      meshRef.current.position.y = Math.sin(t) * Math.sin(orbitTilt) * orbitRadius * 0.3;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef} scale={scale} raycast={noRaycast}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.9}
        metalness={0.05}
        emissive={textureType === 'icy' ? '#88bbff' : textureType === 'alien' ? '#c4b0d4' : '#665544'}
        emissiveIntensity={0.1}
      />
    </mesh>
  );
}
