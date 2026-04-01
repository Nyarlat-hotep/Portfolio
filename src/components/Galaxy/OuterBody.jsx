import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createRockyTexture, createIcyTexture, createAlienTexture } from '../../utils/planetTextures'

function fadeIn(dist, edgeStart, edgeEnd) {
  const t = Math.max(0, Math.min(1, (dist - edgeStart) / (edgeEnd - edgeStart)))
  return t * t * (3 - 2 * t)
}

const noRaycast = () => null

export default function OuterBody({ position, textureType = 'rocky', bodyRadius = 1.0, orbitSpeed = 0.006, cameraFadeStart, cameraFadeEnd }) {
  const groupRef = useRef()
  const meshRef = useRef()

  const texture = useMemo(() => {
    if (textureType === 'icy') return createIcyTexture(128)
    if (textureType === 'alien') return createAlienTexture(128, { r: 195, g: 175, b: 215 })
    return createRockyTexture(128)
  }, [textureType])

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(bodyRadius, 16, 16), [bodyRadius])

  const orbitRadius = bodyRadius * 1.8

  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current) return
    const camDist = state.camera.position.length()
    const intensity = fadeIn(camDist, cameraFadeStart, cameraFadeEnd)
    groupRef.current.visible = intensity > 0.01
    if (!groupRef.current.visible) return

    const t = state.clock.elapsedTime * orbitSpeed
    meshRef.current.position.x = Math.cos(t) * orbitRadius
    meshRef.current.position.z = Math.sin(t) * orbitRadius
    meshRef.current.position.y = Math.sin(t * 0.7) * orbitRadius * 0.25
    meshRef.current.rotation.y += delta * 0.05
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={meshRef} geometry={sphereGeo} raycast={noRaycast}>
        <meshStandardMaterial
          map={texture}
          roughness={0.9}
          metalness={0.05}
          emissive={textureType === 'icy' ? '#88bbff' : textureType === 'alien' ? '#c4b0d4' : '#665544'}
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  )
}
