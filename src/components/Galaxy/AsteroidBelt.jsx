import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createCircularParticleTexture } from '../../utils/threeUtils'

function fadeIn(dist, edgeStart, edgeEnd) {
  const t = Math.max(0, Math.min(1, (dist - edgeStart) / (edgeEnd - edgeStart)))
  return t * t * (3 - 2 * t)
}

export default function AsteroidBelt({ innerRadius, outerRadius, count, cameraFadeStart, cameraFadeEnd }) {
  const groupRef = useRef()
  const matRef = useRef()

  const geo = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const color = new THREE.Color()

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const r = innerRadius + Math.random() * (outerRadius - innerRadius)
      positions[i * 3]     = Math.cos(theta) * r
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = Math.sin(theta) * r

      color.setHSL(0.07, 0.15, 0.25 + Math.random() * 0.2)
      colors[i * 3]     = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [innerRadius, outerRadius, count])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const camDist = state.camera.position.length()
    const intensity = fadeIn(camDist, cameraFadeStart, cameraFadeEnd)
    groupRef.current.visible = intensity > 0.01
    if (!groupRef.current.visible) return
    if (matRef.current) matRef.current.opacity = intensity * 0.8
    groupRef.current.rotation.y -= delta * 0.001
  })

  const circTex = useMemo(() => createCircularParticleTexture(), [])

  return (
    <group ref={groupRef}>
      <points geometry={geo}>
        <pointsMaterial
          ref={matRef}
          map={circTex}
          vertexColors
          size={0.35}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0}
          alphaTest={0.01}
        />
      </points>
    </group>
  )
}
