import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createRockyTexture, createIcyTexture, createAlienTexture } from '../../utils/planetTextures'
import { createCircularParticleTexture } from '../../utils/threeUtils'

const noRaycast = () => null

// ── Ring texture — canvas radial bands with gap and grain ─────────────────────
const _ringTexCache = {}
function createRingTex(colorHex) {
  if (_ringTexCache[colorHex]) return _ringTexCache[colorHex]
  const SIZE = 256, C = SIZE / 2
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  const imgData = ctx.createImageData(SIZE, SIZE)
  const col = new THREE.Color(colorHex)
  const cr = Math.round(col.r * 255)
  const cg = Math.round(col.g * 255)
  const cb = Math.round(col.b * 255)

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - C, dy = y - C
      const uvDist = Math.sqrt(dx * dx + dy * dy) / SIZE
      const noise = Math.random()
      let alpha = 0

      if (uvDist > 0.30 && uvDist < 0.35) {
        alpha = (0.55 + noise * 0.45) * 0.85         // inner bright band
      } else if (uvDist >= 0.35 && uvDist < 0.38) {
        alpha = noise * 0.07                           // band gap
      } else if (uvDist >= 0.38 && uvDist < 0.455) {
        const t = (uvDist - 0.38) / 0.075
        alpha = (0.75 + noise * 0.25) * (1 - t * 0.35) // main dense band
      } else if (uvDist >= 0.455 && uvDist < 0.473) {
        alpha = noise * 0.12                           // Cassini-like division
      } else if (uvDist >= 0.473 && uvDist <= 0.5) {
        const t = (uvDist - 0.473) / 0.027
        alpha = (0.38 + noise * 0.28) * (1 - t * 0.6) // wispy outer edge
      }

      const idx = (y * SIZE + x) * 4
      imgData.data[idx]     = cr
      imgData.data[idx + 1] = cg
      imgData.data[idx + 2] = cb
      imgData.data[idx + 3] = Math.min(255, alpha * 255)
    }
  }
  ctx.putImageData(imgData, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  _ringTexCache[colorHex] = tex
  return tex
}

// ── Haze cloud sprite texture ─────────────────────────────────────────────────
let _bodyHazeTex = null
function getBodyHazeTex() {
  if (_bodyHazeTex) return _bodyHazeTex
  const SIZE = 128, C = SIZE / 2
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(C, C, 0, C, C, C)
  g.addColorStop(0,   'rgba(255,255,255,0.7)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.3)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.06)')
  g.addColorStop(1,   'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, SIZE, SIZE)
  return (_bodyHazeTex = new THREE.CanvasTexture(canvas))
}

export default function OuterBody({
  position,
  textureType = 'rocky',
  textureUrl = null,
  bodyRadius = 1.0,
  orbitRadius = 5,
  orbitSpeed = 0.006,
  orbitInclination = 0,
  hasRings = false,
  ringColor = '#ccddff',
  ringTilt = 0.38,
  ringBand1 = [1.7, 2.55],
  ringBand2 = [2.8, 3.6],
  hazeColor = '#aabbdd',
  moons = [],
}) {
  const groupRef     = useRef()
  const bodyGroupRef = useRef()   // whole system orbits as one unit
  const planetRef    = useRef()   // just for axial spin
  const debrisRef    = useRef()
  const moonRefs     = useRef([])

  const texture = useMemo(() => {
    if (textureUrl) return new THREE.TextureLoader().load(textureUrl)
    if (textureType === 'icy')   return createIcyTexture(128)
    if (textureType === 'alien') return createAlienTexture(128, { r: 195, g: 175, b: 215 })
    return createRockyTexture(128)
  }, [textureUrl, textureType])

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(bodyRadius, 16, 16), [bodyRadius])

  const { ringInnerGeo, ringOuterGeo, ringTex } = useMemo(() => {
    if (!hasRings) return {}
    return {
      ringInnerGeo: new THREE.RingGeometry(bodyRadius * ringBand1[0], bodyRadius * ringBand1[1], 64),
      ringOuterGeo: new THREE.RingGeometry(bodyRadius * ringBand2[0], bodyRadius * ringBand2[1], 64),
      ringTex: createRingTex(ringColor),
    }
  }, [hasRings, bodyRadius, ringBand1, ringBand2, ringColor])

  // Atmospheric haze blobs — wispy sprites around the body
  const hazeKnots = useMemo(() => {
    const out = []
    for (let i = 0; i < 5; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = bodyRadius * (1.3 + Math.random() * 1.8)
      out.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta) * 0.5,
        z: r * Math.cos(phi),
        s: bodyRadius * (2.0 + Math.random() * 2.5),
        opacity: 0.055 + Math.random() * 0.045,
      })
    }
    return out
  }, [bodyRadius])

  // Debris ring — loose torus of particles around the body
  const debrisGeo = useMemo(() => {
    const COUNT = 100
    const pos   = new Float32Array(COUNT * 3)
    const debrisR = hasRings ? bodyRadius * (ringBand2[1] + 0.9) : bodyRadius * 2.4
    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const r     = debrisR + (Math.random() - 0.5) * bodyRadius * 1.8
      pos[i * 3]     = Math.cos(theta) * r
      pos[i * 3 + 1] = (Math.random() - 0.5) * bodyRadius * 0.9
      pos[i * 3 + 2] = Math.sin(theta) * r
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [bodyRadius, hasRings, ringBand2])

  // Moon geometries + textures
  const moonGeos     = useMemo(() => moons.map(m => new THREE.SphereGeometry(m.size, 10, 10)), [moons])
  const moonTextures = useMemo(() => moons.map((_, i) => i % 2 === 0 ? createRockyTexture(64) : createIcyTexture(64)), [moons])

  const circleTex = useMemo(() => createCircularParticleTexture(), [])
  const hazeTex   = useMemo(() => getBodyHazeTex(), [])

  useFrame((state, delta) => {
    if (!groupRef.current || !bodyGroupRef.current) return

    // Move entire body system along its orbit
    const t  = state.clock.elapsedTime * orbitSpeed
    const tx = Math.cos(t) * orbitRadius
    const ty = Math.sin(t) * orbitRadius * Math.sin(orbitInclination)
    const tz = Math.sin(t) * orbitRadius * Math.cos(orbitInclination)
    bodyGroupRef.current.position.set(tx, ty, tz)

    // Axial spin of planet only
    if (planetRef.current) planetRef.current.rotation.y += delta * 0.04

    // Debris ring slow rotation
    if (debrisRef.current) debrisRef.current.rotation.y += delta * 0.007

    // Moon orbits (local to bodyGroup)
    moonRefs.current.forEach((moonRef, i) => {
      if (!moonRef || !moons[i]) return
      const mt = state.clock.elapsedTime * moons[i].speed
      moonRef.position.set(
        Math.cos(mt) * moons[i].radius,
        Math.sin(mt * 0.7) * moons[i].radius * (moons[i].tilt ?? 0.2),
        Math.sin(mt) * moons[i].radius
      )
      moonRef.rotation.y += delta * 0.04
    })
  })

  const ringRotation = [Math.PI / 2 + ringTilt, 0.2, 0]

  return (
    <group ref={groupRef} position={position}>
      <group ref={bodyGroupRef}>

        {/* Planet body */}
        <mesh ref={planetRef} geometry={sphereGeo} raycast={noRaycast}>
          <meshStandardMaterial
            map={texture}
            roughness={0.9}
            metalness={0.05}
            emissive={textureUrl ? '#223344' : (textureType === 'icy' ? '#88bbff' : textureType === 'alien' ? '#c4b0d4' : '#665544')}
            emissiveIntensity={0.15}
          />
        </mesh>

        {/* Rings with canvas band texture */}
        {hasRings && ringInnerGeo && (
          <>
            <mesh geometry={ringInnerGeo} rotation={ringRotation} raycast={noRaycast}>
              <meshBasicMaterial
                map={ringTex}
                transparent
                side={THREE.DoubleSide}
                depthWrite={false}
                alphaTest={0.01}
              />
            </mesh>
            <mesh geometry={ringOuterGeo} rotation={ringRotation} raycast={noRaycast}>
              <meshBasicMaterial
                map={ringTex}
                transparent
                opacity={0.6}
                side={THREE.DoubleSide}
                depthWrite={false}
                alphaTest={0.01}
              />
            </mesh>
          </>
        )}

        {/* Atmospheric haze */}
        {hazeKnots.map((k, i) => (
          <sprite key={i} position={[k.x, k.y, k.z]} scale={[k.s, k.s, 1]}>
            <spriteMaterial
              map={hazeTex}
              color={hazeColor}
              transparent
              opacity={k.opacity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        ))}

        {/* Debris field */}
        <group ref={debrisRef}>
          <points geometry={debrisGeo}>
            <pointsMaterial
              map={circleTex}
              color={hazeColor}
              size={0.1}
              transparent
              opacity={0.3}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              sizeAttenuation
              alphaTest={0.01}
            />
          </points>
        </group>

        {/* Moons */}
        {moons.map((_, i) => (
          <mesh
            key={i}
            ref={el => { moonRefs.current[i] = el }}
            geometry={moonGeos[i]}
            raycast={noRaycast}
          >
            <meshStandardMaterial
              map={moonTextures[i]}
              roughness={0.95}
              metalness={0.02}
              emissive="#332211"
              emissiveIntensity={0.12}
            />
          </mesh>
        ))}

      </group>
    </group>
  )
}
