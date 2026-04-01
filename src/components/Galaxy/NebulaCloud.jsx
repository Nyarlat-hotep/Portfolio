import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createCircularParticleTexture, createNebulaSplatTexture } from '../../utils/threeUtils'

function fadeIn(dist, edgeStart, edgeEnd) {
  const t = Math.max(0, Math.min(1, (dist - edgeStart) / (edgeEnd - edgeStart)))
  return t * t * (3 - 2 * t)
}

let _nebCloudTex = null
function getNebCloudTex() {
  if (_nebCloudTex) return _nebCloudTex
  const size = 256, c = size / 2
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0,    'rgba(255,255,255,0.9)')
  g.addColorStop(0.20, 'rgba(255,255,255,0.65)')
  g.addColorStop(0.50, 'rgba(255,255,255,0.20)')
  g.addColorStop(0.80, 'rgba(255,255,255,0.04)')
  g.addColorStop(1.0,  'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return (_nebCloudTex = new THREE.CanvasTexture(canvas))
}

function makeSphere(count, r) {
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi   = Math.acos(2 * Math.random() - 1)
    const rad   = Math.pow(Math.random(), 0.5) * r
    pos[i * 3]     = rad * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = rad * Math.sin(phi) * Math.sin(theta)
    pos[i * 3 + 2] = rad * Math.cos(phi)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  return g
}

export default function NebulaCloud({ position, color, secondaryColor, radius, particleCount, cameraFadeStart, cameraFadeEnd }) {
  const groupRef      = useRef()
  const mat1Ref       = useRef()  // micro-fine
  const mat2Ref       = useRef()  // medium
  const mat3Ref       = useRef()  // large soft
  const mat4Ref       = useRef()  // huge wispy
  const spriteMatRefs = useRef([])

  const [geo1, geo2, geo3, geo4, circTex, splatTex] = useMemo(() => {
    return [
      makeSphere(particleCount,                        radius),        // micro-fine
      makeSphere(Math.floor(particleCount * 0.4),      radius * 1.4),  // medium
      makeSphere(Math.floor(particleCount * 0.06),     radius * 2.0),  // large soft
      makeSphere(Math.max(4, Math.floor(particleCount * 0.025)), radius * 2.8), // huge wispy
      createCircularParticleTexture(),
      createNebulaSplatTexture(),
    ]
  }, [radius, particleCount])

  // 7 gas pocket sprite blobs scattered within the nebula
  const knots = useMemo(() => {
    const result = []
    for (let i = 0; i < 7; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = (0.25 + Math.random() * 0.55) * radius
      result.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta) * 0.6,
        z: r * Math.cos(phi),
        s: radius * (0.3 + Math.random() * 0.5),
      })
    }
    return result
  }, [radius])

  const cloudTex = useMemo(() => getNebCloudTex(), [])

  useEffect(() => {
    return () => { geo1.dispose(); geo2.dispose(); geo3.dispose(); geo4.dispose() }
  }, [geo1, geo2, geo3, geo4])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const camDist = state.camera.position.length()
    const intensity = fadeIn(camDist, cameraFadeStart, cameraFadeEnd)
    groupRef.current.visible = intensity > 0.01
    if (!groupRef.current.visible) return
    if (mat1Ref.current) mat1Ref.current.opacity = intensity * 0.55
    if (mat2Ref.current) mat2Ref.current.opacity = intensity * 0.20
    if (mat3Ref.current) mat3Ref.current.opacity = intensity * 0.10
    if (mat4Ref.current) mat4Ref.current.opacity = intensity * 0.05
    spriteMatRefs.current.forEach(mat => { if (mat) mat.opacity = intensity * 0.13 })
    groupRef.current.rotation.y += delta * 0.002
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Micro-fine sparkle — tiny tight particles at core */}
      <points geometry={geo1}>
        <pointsMaterial ref={mat1Ref}
          map={circTex}
          color={color} size={0.2} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0}
          sizeAttenuation alphaTest={0.01} />
      </points>

      {/* Medium haze */}
      <points geometry={geo2}>
        <pointsMaterial ref={mat2Ref}
          map={circTex}
          color={secondaryColor} size={1.8} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0}
          sizeAttenuation alphaTest={0.01} />
      </points>

      {/* Large soft blobs */}
      <points geometry={geo3}>
        <pointsMaterial ref={mat3Ref}
          map={splatTex}
          color={secondaryColor} size={6.0} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0}
          sizeAttenuation alphaTest={0.005} />
      </points>

      {/* Huge wispy outer puffs — sparse, very faint */}
      <points geometry={geo4}>
        <pointsMaterial ref={mat4Ref}
          map={splatTex}
          color={color} size={14.0} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0}
          sizeAttenuation alphaTest={0.002} />
      </points>

      {/* Gas pocket sprite blobs — dense atmospheric knots */}
      {knots.map((k, i) => (
        <sprite key={i} position={[k.x, k.y, k.z]} scale={[k.s, k.s, 1]}>
          <spriteMaterial
            ref={el => { spriteMatRefs.current[i] = el }}
            map={cloudTex}
            color={color}
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
