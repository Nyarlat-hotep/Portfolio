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
  textureUrl = null,
  bodyRadius = 1.0,
  orbitRadius = 5,
  orbitSpeed = 0.006,
  orbitInclination = 0,
  hasRings = false,
  ringColor = '#ccddff',
  ringTilt = 0.38,
  ringBand1 = [1.7, 2.55],  // [innerEdge, outerEdge] as multiples of bodyRadius
  ringBand2 = [2.8, 3.6],
  cameraFadeStart,
  cameraFadeEnd,
}) {
  const groupRef      = useRef()
  const meshRef       = useRef()
  const ringInnerRef  = useRef()
  const ringOuterRef  = useRef()

  const texture = useMemo(() => {
    if (textureUrl) {
      return new THREE.TextureLoader().load(textureUrl)
    }
    if (textureType === 'icy')   return createIcyTexture(128)
    if (textureType === 'alien') return createAlienTexture(128, { r: 195, g: 175, b: 215 })
    return createRockyTexture(128)
  }, [textureUrl, textureType])

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(bodyRadius, 16, 16), [bodyRadius])

  const { ringInnerGeo, ringOuterGeo } = useMemo(() => {
    if (!hasRings) return {}
    return {
      ringInnerGeo: new THREE.RingGeometry(bodyRadius * ringBand1[0], bodyRadius * ringBand1[1], 64),
      ringOuterGeo: new THREE.RingGeometry(bodyRadius * ringBand2[0], bodyRadius * ringBand2[1], 64),
    }
  }, [hasRings, bodyRadius, ringBand1, ringBand2])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const camDist = state.camera.position.length()
    const intensity = fadeIn(camDist, cameraFadeStart, cameraFadeEnd)
    groupRef.current.visible = intensity > 0.01
    if (!groupRef.current.visible) return

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

  const ringRotation = [Math.PI / 2 + ringTilt, 0.2, 0]

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={meshRef} geometry={sphereGeo} raycast={noRaycast}>
        <meshStandardMaterial
          map={texture}
          roughness={0.9}
          metalness={0.05}
          emissive={textureUrl ? '#223344' : (textureType === 'icy' ? '#88bbff' : textureType === 'alien' ? '#c4b0d4' : '#665544')}
          emissiveIntensity={0.15}
        />
      </mesh>

      {hasRings && ringInnerGeo && (
        <>
          <mesh ref={ringInnerRef} geometry={ringInnerGeo} rotation={ringRotation} raycast={noRaycast}>
            <meshBasicMaterial
              color={ringColor}
              transparent
              opacity={0.62}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
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
