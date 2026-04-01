import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createRockyTexture, createIcyTexture, createAlienTexture } from '../../utils/planetTextures'

function fadeIn(dist, edgeStart, edgeEnd) {
  const t = Math.max(0, Math.min(1, (dist - edgeStart) / (edgeEnd - edgeStart)))
  return t * t * (3 - 2 * t)
}

const noRaycast = () => null

export default function OuterBody({
  position,
  textureType = 'rocky',
  bodyRadius = 1.0,
  orbitRadius = 5,
  orbitSpeed = 0.006,
  orbitInclination = 0,
  hasRings = false,
  ringColor = '#ccddff',
  ringTilt = 0.38,
  cameraFadeStart,
  cameraFadeEnd,
}) {
  const groupRef = useRef()
  const meshRef  = useRef()
  const ringInnerRef = useRef()
  const ringOuterRef = useRef()

  const texture = useMemo(() => {
    if (textureType === 'icy')   return createIcyTexture(128)
    if (textureType === 'alien') return createAlienTexture(128, { r: 195, g: 175, b: 215 })
    return createRockyTexture(128)
  }, [textureType])

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(bodyRadius, 16, 16), [bodyRadius])

  // Two ring bands: denser inner + wispy outer (only built when hasRings=true)
  const { ringInnerGeo, ringOuterGeo } = useMemo(() => {
    if (!hasRings) return {}
    return {
      ringInnerGeo: new THREE.RingGeometry(bodyRadius * 1.7, bodyRadius * 2.55, 64),
      ringOuterGeo: new THREE.RingGeometry(bodyRadius * 2.8,  bodyRadius * 3.6,  64),
    }
  }, [hasRings, bodyRadius])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const camDist = state.camera.position.length()
    const intensity = fadeIn(camDist, cameraFadeStart, cameraFadeEnd)
    groupRef.current.visible = intensity > 0.01
    if (!groupRef.current.visible) return

    // Clean circular orbit in a tilted plane
    const t  = state.clock.elapsedTime * orbitSpeed
    const tx = Math.cos(t) * orbitRadius
    const ty = Math.sin(t) * orbitRadius * Math.sin(orbitInclination)
    const tz = Math.sin(t) * orbitRadius * Math.cos(orbitInclination)

    if (meshRef.current) {
      meshRef.current.position.set(tx, ty, tz)
      meshRef.current.rotation.y += delta * 0.04
    }
    if (ringInnerRef.current) ringInnerRef.current.position.set(tx, ty, tz)
    if (ringOuterRef.current) ringOuterRef.current.position.set(tx, ty, tz)
  })

  // Ring rotation: lay flat (PI/2 on X) then apply tilt
  const ringRotation = [Math.PI / 2 + ringTilt, 0.2, 0]

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

      {hasRings && ringInnerGeo && (
        <>
          {/* Inner ring band — denser */}
          <mesh ref={ringInnerRef} geometry={ringInnerGeo} rotation={ringRotation} raycast={noRaycast}>
            <meshBasicMaterial
              color={ringColor}
              transparent
              opacity={0.58}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {/* Outer ring band — wispy */}
          <mesh ref={ringOuterRef} geometry={ringOuterGeo} rotation={ringRotation} raycast={noRaycast}>
            <meshBasicMaterial
              color={ringColor}
              transparent
              opacity={0.28}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
    </group>
  )
}
