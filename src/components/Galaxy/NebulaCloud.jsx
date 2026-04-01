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

export default function NebulaCloud({ position, color, secondaryColor, radius, particleCount, cameraFadeStart, cameraFadeEnd }) {
  const groupRef = useRef()
  const mat1Ref = useRef()
  const mat2Ref = useRef()
  const mat3Ref = useRef()
  const spriteMatRefs = useRef([])

  const [geo1, geo2, geo3, circTex, splatTex] = useMemo(() => {
    // geo1: fine particles in sphere of radius
    const count1 = particleCount
    const pos1 = new Float32Array(count1 * 3)
    for (let i = 0; i < count1; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.pow(Math.random(), 0.5) * radius
      pos1[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos1[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos1[i * 3 + 2] = r * Math.cos(phi)
    }
    const g1 = new THREE.BufferGeometry()
    g1.setAttribute('position', new THREE.BufferAttribute(pos1, 3))

    // geo2: mid haze particles in sphere of radius * 1.5
    const count2 = Math.floor(particleCount * 0.5)
    const pos2 = new Float32Array(count2 * 3)
    const hazeRadius = radius * 1.5
    for (let i = 0; i < count2; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.pow(Math.random(), 0.5) * hazeRadius
      pos2[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos2[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos2[i * 3 + 2] = r * Math.cos(phi)
    }
    const g2 = new THREE.BufferGeometry()
    g2.setAttribute('position', new THREE.BufferAttribute(pos2, 3))

    // geo3: soft outer particles in sphere of radius * 2.0
    const count3 = Math.floor(particleCount * 0.08)
    const pos3 = new Float32Array(count3 * 3)
    const outerRadius = radius * 2.0
    for (let i = 0; i < count3; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.pow(Math.random(), 0.5) * outerRadius
      pos3[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos3[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos3[i * 3 + 2] = r * Math.cos(phi)
    }
    const g3 = new THREE.BufferGeometry()
    g3.setAttribute('position', new THREE.BufferAttribute(pos3, 3))

    const circTex = createCircularParticleTexture()
    const splatTex = createNebulaSplatTexture()
    return [g1, g2, g3, circTex, splatTex]
  }, [radius, particleCount])

  // Sprite blob knots — 7 gas pocket blobs scattered within the nebula
  const knots = useMemo(() => {
    const result = []
    for (let i = 0; i < 7; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = (0.25 + Math.random() * 0.55) * radius
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
    return () => { geo1.dispose(); geo2.dispose(); geo3.dispose() }
  }, [geo1, geo2, geo3])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const camDist = state.camera.position.length()
    const intensity = fadeIn(camDist, cameraFadeStart, cameraFadeEnd)
    groupRef.current.visible = intensity > 0.01
    if (!groupRef.current.visible) return
    if (mat1Ref.current) mat1Ref.current.opacity = intensity * 0.5
    if (mat2Ref.current) mat2Ref.current.opacity = intensity * 0.25
    if (mat3Ref.current) mat3Ref.current.opacity = intensity * 0.12
    spriteMatRefs.current.forEach(mat => {
      if (mat) mat.opacity = intensity * 0.13
    })
    groupRef.current.rotation.y += delta * 0.002
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Fine detail layer */}
      <points geometry={geo1}>
        <pointsMaterial ref={mat1Ref}
          map={circTex}
          color={color} size={0.5} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0}
          sizeAttenuation alphaTest={0.01} />
      </points>

      {/* Mid haze layer */}
      <points geometry={geo2}>
        <pointsMaterial ref={mat2Ref}
          map={circTex}
          color={secondaryColor} size={3.0} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0}
          sizeAttenuation alphaTest={0.01} />
      </points>

      {/* Soft outer layer */}
      <points geometry={geo3}>
        <pointsMaterial ref={mat3Ref}
          map={splatTex}
          color={secondaryColor} size={8.0} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0}
          sizeAttenuation alphaTest={0.005} />
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
