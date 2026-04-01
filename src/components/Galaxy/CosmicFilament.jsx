import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function fadeIn(dist, edgeStart, edgeEnd) {
  const t = Math.max(0, Math.min(1, (dist - edgeStart) / (edgeEnd - edgeStart)))
  return t * t * (3 - 2 * t)
}

export default function CosmicFilament({ position, color, length, cameraFadeStart, cameraFadeEnd }) {
  const groupRef = useRef()
  const matRef = useRef()

  const geometry = useMemo(() => {
    const positions = []
    const numBranches = 4
    for (let b = 0; b < numBranches; b++) {
      const angle = (b / numBranches) * Math.PI * 2
      const elevation = (Math.random() - 0.5) * Math.PI * 0.4
      const branchDir = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation),
        Math.sin(elevation),
        Math.sin(angle) * Math.cos(elevation)
      )
      const pointsPerBranch = Math.floor(800 / numBranches)
      for (let i = 0; i < pointsPerBranch; i++) {
        const t = Math.pow(Math.random(), 0.7) // bias toward center
        const dist = t * length
        const scatter = (1 - t) * length * 0.15 // less scatter further out
        const x = branchDir.x * dist + (Math.random() - 0.5) * scatter
        const y = branchDir.y * dist + (Math.random() - 0.5) * scatter
        const z = branchDir.z * dist + (Math.random() - 0.5) * scatter
        positions.push(x, y, z)
      }
    }

    const posArray = new Float32Array(positions)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    return geo
  }, [length])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const camDist = state.camera.position.length()
    const intensity = fadeIn(camDist, cameraFadeStart, cameraFadeEnd)
    groupRef.current.visible = intensity > 0.01
    if (!groupRef.current.visible) return
    if (matRef.current) matRef.current.opacity = intensity * 0.5
    groupRef.current.rotation.y += delta * 0.0005
  })

  return (
    <group ref={groupRef} position={position}>
      <points geometry={geometry}>
        <pointsMaterial
          ref={matRef}
          color={color}
          size={0.3}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0}
        />
      </points>
    </group>
  )
}
