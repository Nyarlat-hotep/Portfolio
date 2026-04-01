import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function fadeIn(dist, edgeStart, edgeEnd) {
  const t = Math.max(0, Math.min(1, (dist - edgeStart) / (edgeEnd - edgeStart)))
  return t * t * (3 - 2 * t)
}

let _oortTex = null
function getOortTex() {
  if (_oortTex) return _oortTex
  const size = 256, c = size / 2
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0,    'rgba(255,255,255,0.85)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.15)')
  g.addColorStop(0.80, 'rgba(255,255,255,0.03)')
  g.addColorStop(1.0,  'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return (_oortTex = new THREE.CanvasTexture(canvas))
}

const INNER_R = 170
const OUTER_R = 198
const PARTICLE_COUNT = 4000
const BLOB_COLORS = ['#aaccff', '#88aadd', '#ccddff', '#99bbee', '#b0b8cc', '#d4e0ff']

export default function OortCloud({ cameraFadeStart = 280, cameraFadeEnd = 400 }) {
  const groupRef = useRef()
  const matRef = useRef()
  const blobRefs = useRef([])

  const { geo, blobs, cloudTex } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = INNER_R + Math.random() * (OUTER_R - INNER_R)
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))

    // 13 atmospheric blob knots scattered on the sphere
    const blobs = []
    for (let i = 0; i < 13; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = INNER_R + (OUTER_R - INNER_R) * 0.5
      blobs.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta) * 0.55,
        z: r * Math.cos(phi),
        s: 28 + Math.random() * 30,
        color: BLOB_COLORS[Math.floor(Math.random() * BLOB_COLORS.length)],
      })
    }

    const cloudTex = getOortTex()
    return { geo, blobs, cloudTex }
  }, [])

  useEffect(() => {
    return () => { geo.dispose() }
  }, [geo])

  useFrame((state) => {
    if (!groupRef.current) return
    const camDist = state.camera.position.length()
    const intensity = fadeIn(camDist, cameraFadeStart, cameraFadeEnd)
    groupRef.current.visible = intensity > 0.01
    if (!groupRef.current.visible) return
    if (matRef.current) matRef.current.opacity = intensity * 0.55
    blobRefs.current.forEach(mat => {
      if (mat) mat.opacity = intensity * 0.09
    })
    groupRef.current.rotation.y += 0.00008
  })

  return (
    <group ref={groupRef}>
      {/* Hollow particle shell */}
      <points geometry={geo}>
        <pointsMaterial
          ref={matRef}
          map={cloudTex}
          color="#aabbdd"
          size={1.8}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0}
          sizeAttenuation
          alphaTest={0.01}
        />
      </points>

      {/* Atmospheric blob knots — wispy cloudiness on the shell */}
      {blobs.map((b, i) => (
        <sprite key={i} position={[b.x, b.y, b.z]} scale={[b.s, b.s, 1]}>
          <spriteMaterial
            ref={el => { blobRefs.current[i] = el }}
            map={cloudTex}
            color={b.color}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  )
}
