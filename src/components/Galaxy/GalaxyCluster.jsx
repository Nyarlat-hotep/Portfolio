import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function fadeIn(dist, edgeStart, edgeEnd) {
  const t = Math.max(0, Math.min(1, (dist - edgeStart) / (edgeEnd - edgeStart)))
  return t * t * (3 - 2 * t)
}

function makeGalaxyTexture(color1, color2) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  const cx = 64, cy = 64
  // Dark background
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, 128, 128)
  // Outer glow
  const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60)
  outerGlow.addColorStop(0, color1 + 'cc')
  outerGlow.addColorStop(0.4, color2 + '44')
  outerGlow.addColorStop(1, 'transparent')
  ctx.fillStyle = outerGlow
  ctx.fillRect(0, 0, 128, 128)
  // Bright core
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 15)
  core.addColorStop(0, '#ffffff')
  core.addColorStop(0.5, color1 + 'aa')
  core.addColorStop(1, 'transparent')
  ctx.fillStyle = core
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(canvas)
}

export default function GalaxyCluster({ position, cameraFadeStart, cameraFadeEnd }) {
  const groupRef = useRef()
  const matARef = useRef()
  const matBRef = useRef()
  const matCRef = useRef()

  const { texA, texB, texC } = useMemo(() => ({
    texA: makeGalaxyTexture('#4488ff', '#aaccff'),
    texB: makeGalaxyTexture('#ff8844', '#ffcc88'),
    texC: makeGalaxyTexture('#88ffcc', '#ccffee'),
  }), [])

  useEffect(() => {
    return () => {
      texA.dispose()
      texB.dispose()
      texC.dispose()
    }
  }, [texA, texB, texC])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const camDist = state.camera.position.length()
    const intensity = fadeIn(camDist, cameraFadeStart, cameraFadeEnd)
    groupRef.current.visible = intensity > 0.01
    if (!groupRef.current.visible) return
    if (matARef.current) matARef.current.opacity = intensity * 0.8
    if (matBRef.current) matBRef.current.opacity = intensity * 0.8
    if (matCRef.current) matCRef.current.opacity = intensity * 0.8
    groupRef.current.rotation.y += delta * 0.001
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Galaxy A — center */}
      <sprite position={[0, 0, 0]} scale={[12, 12, 1]}>
        <spriteMaterial ref={matARef} map={texA} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
      </sprite>
      {/* Galaxy B — lower right */}
      <sprite position={[18, -5, 8]} scale={[8, 8, 1]}>
        <spriteMaterial ref={matBRef} map={texB} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
      </sprite>
      {/* Galaxy C — upper left */}
      <sprite position={[-12, 8, -6]} scale={[10, 10, 1]}>
        <spriteMaterial ref={matCRef} map={texC} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
      </sprite>
    </group>
  )
}
