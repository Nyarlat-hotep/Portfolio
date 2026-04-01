import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { createCircularParticleTexture } from '../../utils/threeUtils'

const ORBIT_R     = 182
const ORBIT_SPEED = 0.0025
const ORBIT_INCL  = 0.18

// Haze sprite texture
let _stationHazeTex = null
function getStationHazeTex() {
  if (_stationHazeTex) return _stationHazeTex
  const SIZE = 128, C = SIZE / 2
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(C, C, 0, C, C, C)
  g.addColorStop(0,   'rgba(255,255,255,0.6)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.2)')
  g.addColorStop(0.8, 'rgba(255,255,255,0.04)')
  g.addColorStop(1,   'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, SIZE, SIZE)
  return (_stationHazeTex = new THREE.CanvasTexture(canvas))
}

export default function SpaceStation() {
  const groupRef   = useRef()
  const debrisRef  = useRef()
  const { scene }  = useGLTF('/models/sci-fi_space_station_2-v2.glb')
  const clonedScene = useMemo(() => scene.clone(true), [scene])

  // Ambient haze blobs around the station
  const hazeKnots = useMemo(() => {
    const out = []
    for (let i = 0; i < 6; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 6 + Math.random() * 10
      out.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta) * 0.5,
        z: r * Math.cos(phi),
        s: 8 + Math.random() * 12,
        opacity: 0.04 + Math.random() * 0.04,
      })
    }
    return out
  }, [])

  // Debris cloud — loose sphere of particles
  const debrisGeo = useMemo(() => {
    const COUNT = 180
    const pos   = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 8 + Math.random() * 18
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.5
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])

  const circleTex = useMemo(() => createCircularParticleTexture(), [])
  const hazeTex   = useMemo(() => getStationHazeTex(), [])

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
    if (debrisRef.current) debrisRef.current.rotation.y -= delta * 0.005
  })

  return (
    <group ref={groupRef} scale={1.5}>
      <primitive object={clonedScene} />

      {/* Atmospheric haze */}
      {hazeKnots.map((k, i) => (
        <sprite key={i} position={[k.x, k.y, k.z]} scale={[k.s, k.s, 1]}>
          <spriteMaterial
            map={hazeTex}
            color="#88aacc"
            transparent
            opacity={k.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      ))}

      {/* Debris cloud */}
      <group ref={debrisRef}>
        <points geometry={debrisGeo}>
          <pointsMaterial
            map={circleTex}
            color="#aabbcc"
            size={0.15}
            transparent
            opacity={0.25}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
            alphaTest={0.01}
          />
        </points>
      </group>
    </group>
  )
}
