import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createCircularParticleTexture, createNebulaSplatTexture } from '../../utils/threeUtils'

function fadeIn(dist, edgeStart, edgeEnd) {
  const t = Math.max(0, Math.min(1, (dist - edgeStart) / (edgeEnd - edgeStart)))
  return t * t * (3 - 2 * t)
}

export default function NebulaCloud({ position, color, secondaryColor, radius, particleCount, cameraFadeStart, cameraFadeEnd }) {
  const groupRef = useRef()
  const mat1Ref = useRef()
  const mat2Ref = useRef()
  const mat3Ref = useRef()

  const [geo1, geo2, geo3] = useMemo(() => {
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

    // geo2: mid haze particles in sphere of radius * 1.5
    const count2 = Math.floor(particleCount * 0.5)
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

    // geo3: soft outer particles in sphere of radius * 2.0
    const count3 = Math.floor(particleCount * 0.08)
    const pos3 = new Float32Array(count3 * 3)
    const outerRadius = radius * 2.0
    for (let i = 0; i < count3; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.pow(Math.random(), 0.5) * outerRadius
      pos3[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos3[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos3[i * 3 + 2] = r * Math.cos(phi)
    }
    const g3 = new THREE.BufferGeometry()
    g3.setAttribute('position', new THREE.BufferAttribute(pos3, 3))

    return [g1, g2, g3]
  }, [radius, particleCount])

  useEffect(() => {
    return () => { geo1.dispose(); geo2.dispose(); geo3.dispose() }
  }, [geo1, geo2, geo3])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const camDist = state.camera.position.length()
    const intensity = fadeIn(camDist, cameraFadeStart, cameraFadeEnd)
    groupRef.current.visible = intensity > 0.01
    if (!groupRef.current.visible) return
    if (mat1Ref.current) mat1Ref.current.opacity = intensity * 0.5
    if (mat2Ref.current) mat2Ref.current.opacity = intensity * 0.25
    if (mat3Ref.current) mat3Ref.current.opacity = intensity * 0.12
    groupRef.current.rotation.y += delta * 0.002
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Fine detail layer */}
      <points geometry={geo1}>
        <pointsMaterial ref={mat1Ref}
          map={createCircularParticleTexture()}
          color={color} size={0.5} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0}
          sizeAttenuation alphaTest={0.01} />
      </points>

      {/* Mid haze layer */}
      <points geometry={geo2}>
        <pointsMaterial ref={mat2Ref}
          map={createCircularParticleTexture()}
          color={secondaryColor} size={3.0} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0}
          sizeAttenuation alphaTest={0.01} />
      </points>

      {/* Soft outer layer */}
      <points geometry={geo3}>
        <pointsMaterial ref={mat3Ref}
          map={createNebulaSplatTexture()}
          color={secondaryColor} size={8.0} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0}
          sizeAttenuation alphaTest={0.005} />
      </points>
    </group>
  )
}
