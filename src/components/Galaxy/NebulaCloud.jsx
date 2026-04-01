import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function fadeIn(dist, edgeStart, edgeEnd) {
  const t = Math.max(0, Math.min(1, (dist - edgeStart) / (edgeEnd - edgeStart)))
  return t * t * (3 - 2 * t)
}

export default function NebulaCloud({ position, color, secondaryColor, radius, particleCount, cameraFadeStart, cameraFadeEnd }) {
  const groupRef = useRef()
  const mat1Ref = useRef()
  const mat2Ref = useRef()

  const [geo1, geo2] = useMemo(() => {
    // geo1: fine particles in sphere of radius
    const count1 = particleCount
    const pos1 = new Float32Array(count1 * 3)
    for (let i = 0; i < count1; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.pow(Math.random(), 0.5) * radius
      pos1[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos1[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos1[i * 3 + 2] = r * Math.cos(phi)
    }
    const g1 = new THREE.BufferGeometry()
    g1.setAttribute('position', new THREE.BufferAttribute(pos1, 3))

    // geo2: haze particles in sphere of radius * 1.5
    const count2 = Math.floor(particleCount * 0.3)
    const pos2 = new Float32Array(count2 * 3)
    const hazeRadius = radius * 1.5
    for (let i = 0; i < count2; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.pow(Math.random(), 0.5) * hazeRadius
      pos2[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos2[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos2[i * 3 + 2] = r * Math.cos(phi)
    }
    const g2 = new THREE.BufferGeometry()
    g2.setAttribute('position', new THREE.BufferAttribute(pos2, 3))

    return [g1, g2]
  }, [radius, particleCount])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const camDist = state.camera.position.length()
    const intensity = fadeIn(camDist, cameraFadeStart, cameraFadeEnd)
    groupRef.current.visible = intensity > 0.01
    if (!groupRef.current.visible) return
    if (mat1Ref.current) mat1Ref.current.opacity = intensity * 0.6
    if (mat2Ref.current) mat2Ref.current.opacity = intensity * 0.3
    groupRef.current.rotation.y += delta * 0.002
  })

  return (
    <group ref={groupRef} position={position}>
      <points geometry={geo1}>
        <pointsMaterial ref={mat1Ref} color={color} size={0.4} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
      </points>
      <points geometry={geo2}>
        <pointsMaterial ref={mat2Ref} color={secondaryColor} size={1.2} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
      </points>
    </group>
  )
}
