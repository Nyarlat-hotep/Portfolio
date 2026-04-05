import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createCircularParticleTexture, createNebulaSplatTexture } from '../../utils/threeUtils'

function fadeIn(dist, edgeStart, edgeEnd) {
  const t = Math.max(0, Math.min(1, (dist - edgeStart) / (edgeEnd - edgeStart)))
  return t * t * (3 - 2 * t)
}

let _beltCloudTex = null
function getBeltCloudTex() {
  if (_beltCloudTex) return _beltCloudTex
  const size = 256, c = size / 2
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0,    'rgba(255,255,255,0.7)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.40)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.12)')
  g.addColorStop(0.80, 'rgba(255,255,255,0.02)')
  g.addColorStop(1.0,  'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return (_beltCloudTex = new THREE.CanvasTexture(canvas))
}

// Torus distribution: elliptical cross-section for volume without a full sphere
function makeTorus(count, majorR, tubeR, tubeH) {
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const theta  = Math.random() * Math.PI * 2
    const phi    = Math.random() * Math.PI * 2
    const r      = Math.sqrt(Math.random())        // uniform-area radial
    const localX = r * Math.cos(phi) * tubeR
    const localY = r * Math.sin(phi) * tubeH
    const ringR  = majorR + localX
    pos[i * 3]     = Math.cos(theta) * ringR
    pos[i * 3 + 1] = localY
    pos[i * 3 + 2] = Math.sin(theta) * ringR
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  return g
}

const MAJOR_R = 160   // ring center radius
const TUBE_R  = 40    // horizontal half-width of belt
const TUBE_H  = 55    // vertical half-height of belt

export default function NebulaBelt({ cameraFadeStart = 100, cameraFadeEnd = 175 }) {
  const groupRef      = useRef()
  const mat1Ref       = useRef()
  const mat2Ref       = useRef()
  const mat3Ref       = useRef()
  const mat4Ref       = useRef()
  const spriteMatRefs = useRef([])

  const [geo1, geo2, geo3, geo4, circTex, splatTex] = useMemo(() => [
    makeTorus(1400, MAJOR_R, TUBE_R, TUBE_H),           // fine sparkle
    makeTorus(450,  MAJOR_R, TUBE_R * 1.1, TUBE_H * 1.15), // medium haze
    makeTorus(55,   MAJOR_R, TUBE_R * 1.2, TUBE_H * 1.3),  // soft blobs
    makeTorus(18,   MAJOR_R, TUBE_R * 1.3, TUBE_H * 1.5),  // wispy outer
    createCircularParticleTexture(),
    createNebulaSplatTexture(),
  ], [])

  // Gas pocket sprite knots scattered around the ring
  const knots = useMemo(() => {
    const out = []
    for (let i = 0; i < 22; i++) {
      const theta  = Math.random() * Math.PI * 2
      const phi    = Math.random() * Math.PI * 2
      const r      = Math.sqrt(Math.random())
      const localX = r * Math.cos(phi) * TUBE_R * 0.9
      const localY = r * Math.sin(phi) * TUBE_H * 0.8
      const ringR  = MAJOR_R + localX
      out.push({
        x: Math.cos(theta) * ringR,
        y: localY,
        z: Math.sin(theta) * ringR,
        s: 18 + Math.random() * 28,
      })
    }
    return out
  }, [])

  const cloudTex = useMemo(() => getBeltCloudTex(), [])

  useEffect(() => {
    return () => { geo1.dispose(); geo2.dispose(); geo3.dispose(); geo4.dispose() }
  }, [geo1, geo2, geo3, geo4])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const camDist = state.camera.position.length()
    const intensity = fadeIn(camDist, cameraFadeStart, cameraFadeEnd)
    groupRef.current.visible = intensity > 0.01
    if (!groupRef.current.visible) return
    if (mat1Ref.current) mat1Ref.current.opacity = intensity * 0.45
    if (mat2Ref.current) mat2Ref.current.opacity = intensity * 0.18
    if (mat3Ref.current) mat3Ref.current.opacity = intensity * 0.10
    if (mat4Ref.current) mat4Ref.current.opacity = intensity * 0.05
    spriteMatRefs.current.forEach(m => { if (m) m.opacity = intensity * 0.10 })
    groupRef.current.rotation.y += delta * 0.0005
  })

  return (
    <group ref={groupRef}>
      {/* Fine sparkle — dense base layer */}
      <points geometry={geo1}>
        <pointsMaterial ref={mat1Ref}
          map={circTex}
          color="#b8b8c2" size={0.35} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0}
          sizeAttenuation alphaTest={0.01} />
      </points>

      {/* Medium haze */}
      <points geometry={geo2}>
        <pointsMaterial ref={mat2Ref}
          map={circTex}
          color="#8a96a8" size={2.5} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0}
          sizeAttenuation alphaTest={0.01} />
      </points>

      {/* Soft volumetric blobs */}
      <points geometry={geo3}>
        <pointsMaterial ref={mat3Ref}
          map={splatTex}
          color="#7a8898" size={9.0} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0}
          sizeAttenuation alphaTest={0.005} />
      </points>

      {/* Wispy outer fringe */}
      <points geometry={geo4}>
        <pointsMaterial ref={mat4Ref}
          map={splatTex}
          color="#6a7888" size={20.0} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0}
          sizeAttenuation alphaTest={0.002} />
      </points>

      {/* Gas pocket sprite blobs */}
      {knots.map((k, i) => (
        <sprite key={i} position={[k.x, k.y, k.z]} scale={[k.s, k.s, 1]}>
          <spriteMaterial
            ref={el => { spriteMatRefs.current[i] = el }}
            map={cloudTex}
            color="#9aa4b2"
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
