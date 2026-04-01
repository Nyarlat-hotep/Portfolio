import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

function fadeIn(dist, edgeStart, edgeEnd) {
  const t = Math.max(0, Math.min(1, (dist - edgeStart) / (edgeEnd - edgeStart)))
  return t * t * (3 - 2 * t)
}

const ORBIT_R     = 182
const ORBIT_SPEED = 0.0025
const ORBIT_INCL  = 0.18

export default function SpaceStation({ cameraFadeStart = 280, cameraFadeEnd = 400 }) {
  const groupRef = useRef()
  const { scene } = useGLTF('/models/sci-fi_space_station_2-v2.glb')
  const clonedScene = useMemo(() => scene.clone(true), [scene])

  // Collect all materials and mark them transparent so opacity can be driven per-frame
  const materials = useMemo(() => {
    const mats = []
    clonedScene.traverse(obj => {
      if (obj.isMesh) {
        const list = Array.isArray(obj.material) ? obj.material : [obj.material]
        list.forEach(m => {
          m.transparent = true
          m.opacity = 0
          mats.push(m)
        })
      }
    })
    return mats
  }, [clonedScene])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const camDist = state.camera.position.length()
    const intensity = fadeIn(camDist, cameraFadeStart, cameraFadeEnd)
    groupRef.current.visible = intensity > 0.001

    materials.forEach(m => { m.opacity = intensity })

    if (!groupRef.current.visible) return

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
