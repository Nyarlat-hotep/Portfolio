import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

function fadeIn(dist, edgeStart, edgeEnd) {
  const t = Math.max(0, Math.min(1, (dist - edgeStart) / (edgeEnd - edgeStart)))
  return t * t * (3 - 2 * t)
}

useGLTF.preload('/models/sci-fi_space_station_2-v2.glb')

export default function SpaceStation({ position = [0, 0, 0], cameraFadeStart = 280, cameraFadeEnd = 400 }) {
  const groupRef = useRef()
  const { scene } = useGLTF('/models/sci-fi_space_station_2-v2.glb')

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const camDist = state.camera.position.length()
    const intensity = fadeIn(camDist, cameraFadeStart, cameraFadeEnd)
    groupRef.current.visible = intensity > 0.01
    if (!groupRef.current.visible) return
    groupRef.current.rotation.y += delta * 0.012
  })

  return (
    <group ref={groupRef} position={position} scale={8}>
      <primitive object={scene} />
    </group>
  )
}
