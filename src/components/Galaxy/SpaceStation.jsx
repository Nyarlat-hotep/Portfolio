import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

const ORBIT_R     = 182
const ORBIT_SPEED = 0.0025
const ORBIT_INCL  = 0.18

export default function SpaceStation() {
  const groupRef = useRef()
  const { scene } = useGLTF('/models/sci-fi_space_station_2-v2.glb')
  const clonedScene = useMemo(() => scene.clone(true), [scene])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime * ORBIT_SPEED
    groupRef.current.position.set(
      Math.cos(t) * ORBIT_R,
      Math.sin(t) * ORBIT_R * Math.sin(ORBIT_INCL),
      Math.sin(t) * ORBIT_R * Math.cos(ORBIT_INCL)
    )
    groupRef.current.rotation.y += delta * 0.08
    groupRef.current.rotation.x += delta * 0.015
  })

  return (
    <group ref={groupRef} scale={1.5}>
      <primitive object={clonedScene} />
    </group>
  )
}
