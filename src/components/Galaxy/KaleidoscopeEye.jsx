import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createCircularParticleTexture, createNebulaSplatTexture } from '../../utils/threeUtils'

const KALEIDOSCOPE_URL = 'https://nyarlat-hotep.github.io/sci-fi-kaleidoscope/'

// ── Soft cloud texture — same approach as NebulaBelt gas pockets ──────────
let _eyeCloudTex = null
function getEyeCloudTex() {
  if (_eyeCloudTex) return _eyeCloudTex
  const size = 256, c = size / 2
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0,    'rgba(255,255,255,0.80)')
  g.addColorStop(0.18, 'rgba(255,255,255,0.48)')
  g.addColorStop(0.42, 'rgba(255,255,255,0.16)')
  g.addColorStop(0.68, 'rgba(255,255,255,0.04)')
  g.addColorStop(0.88, 'rgba(255,255,255,0.01)')
  g.addColorStop(1.0,  'rgba(255,255,255,0.00)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return (_eyeCloudTex = new THREE.CanvasTexture(canvas))
}

// ── Eye: uses eye-space normal so pupil is always a perfect circle ─────────
const eyeVertShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalMatrix * normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const eyeFragShader = `
  varying vec3 vNormal;
  uniform float uTime;
  uniform float uGlow;

  void main() {
    vec3  N     = normalize(vNormal);
    float rView = length(N.xy);     // 0 = front pole, 1 = silhouette
    float a     = atan(N.y, N.x);   // eye-space angle

    // ── Sclera: very dark, near-black with subtle warm brown-red hint ──
    float st    = sin(rView * 6.0 + a * 2.0 + uTime * 0.07) * 0.5 + 0.5;
    vec3 sclera = mix(vec3(0.025, 0.005, 0.001), vec3(0.065, 0.014, 0.002), st * 0.5);

    // ── Three distinct rings with clear dark sclera gaps between them ─────
    // pupil (black) | gap | inner ring | gap | corona
    // rView:  0     0.20  0.20–0.28    0.28–0.38  0.38  0.38–0.52  0.52+

    float pupilR = 0.20;
    float pupil  = smoothstep(pupilR + 0.012, pupilR, rView);

    // Inner ring — tight, clean, sits in the dark gap
    float innerR   = 0.30;
    float innerRing = smoothstep(0.018, 0.0, abs(rView - innerR))
                    * (1.0 - pupil);

    // Outer corona with flare spikes — well separated from inner ring
    float cR  = 0.50;
    float spk1 = pow(max(0.0, sin(a * 7.0  + uTime * 0.38)), 1.9) * 0.14;
    float spk2 = pow(max(0.0, sin(a * 13.0 - uTime * 0.26)), 2.6) * 0.09;
    float spk3 = pow(max(0.0, cos(a * 5.0  + uTime * 0.20)), 1.7) * 0.11;
    float spk4 = pow(max(0.0, sin(a * 9.0  - uTime * 0.31)), 2.2) * 0.07;
    float spk5 = pow(max(0.0, cos(a * 17.0 + uTime * 0.17)), 3.3) * 0.04;
    float flareR  = cR + spk1 + spk2 + spk3 + spk4 + spk5;
    float flare   = smoothstep(0.065, 0.0, abs(rView - flareR));
    float baseRng = smoothstep(0.028, 0.0, abs(rView - cR));
    float corona  = clamp(flare * 1.5 + baseRng * 1.8, 0.0, 1.0)
                  * (1.0 - pupil);

    // Corona color: deep orange base → amber tips
    vec3 cCol = mix(vec3(0.55, 0.14, 0.01), vec3(0.92, 0.42, 0.03), corona);
    cCol = mix(cCol, vec3(1.0, 0.68, 0.12), flare * 0.55);

    // ── Hazy mid ring — wide soft glow between inner ring and corona ──────
    // Wide smoothstep = soft edge, not a hard stroke. Animated pulse.
    float midR    = 0.40;
    float midPulse = 1.0 + sin(uTime * 0.55) * 0.04;  // subtle breathe
    float midHaze = smoothstep(0.10, 0.0, abs(rView - midR * midPulse))
                  * (1.0 - pupil)
                  * smoothstep(innerR + 0.02, innerR + 0.06, rView)  // fade in after inner ring
                  * smoothstep(cR - 0.02, cR - 0.07, rView);         // fade out before corona

    // ── Compose ──────────────────────────────────────────────────────────
    vec3 color = sclera;
    color = mix(color, cCol * (1.5 + uGlow * 0.4), corona);
    color += innerRing * vec3(0.92, 0.38, 0.02) * 1.8;
    color += midHaze   * vec3(0.75, 0.22, 0.01) * 0.55;  // dim, hazy, orange
    color = mix(color, vec3(0.0), pupil);

    float fresnel = pow(max(0.0, 1.0 - N.z), 3.5);
    color += fresnel * vec3(0.16, 0.04, 0.0) * 0.20;

    gl_FragColor = vec4(color, 1.0);
  }
`

// ── Lid particle + sprite generators ─────────────────────────────────────

// sign +1 = upper, -1 = lower
// xSpread: half-width, yBase: min distance from sphere center,
// yArch: extra height at x=0 (parabola), yScatter: random vertical spread
function makeLidGeo(count, sign, xSpread, yBase, yArch, yScatter, zSpread) {
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const t    = (Math.random() - 0.5) * 2
    const x    = t * xSpread + (Math.random() - 0.5) * xSpread * 0.18
    const arch = (1.0 - Math.min(1, t * t * 0.65)) * yArch
    const y    = sign * (yBase + arch + Math.random() * yScatter)
    const z    = (Math.random() - 0.5) * zSpread
    pos[i * 3] = x;  pos[i * 3 + 1] = y;  pos[i * 3 + 2] = z
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  return g
}

// Large cloud sprites — like NebulaBelt knots but shaped as eyelid arc
function makeLidSprites(count, sign, xSpread, yBase, yArch, yScatter, zSpread, sMin, sMax) {
  return Array.from({ length: count }, () => {
    const t    = (Math.random() - 0.5) * 2
    const x    = t * xSpread + (Math.random() - 0.5) * xSpread * 0.2
    const arch = (1.0 - Math.min(1, t * t * 0.65)) * yArch
    const y    = sign * (yBase + arch + Math.random() * yScatter)
    const z    = (Math.random() - 0.5) * zSpread
    const s    = sMin + Math.random() * (sMax - sMin)
    const op   = 0.09 + Math.random() * 0.30   // 0.09–0.39
    return { pos: [x, y, z], s, op }
  })
}

export default function KaleidoscopeEye({ onHover }) {
  const meshRef   = useRef()
  const hoverRef  = useRef(false)
  const glowRef   = useRef(0.5)
  const { camera, size } = useThree()
  const _worldPos = useRef(new THREE.Vector3())
  const _projPos  = useRef(new THREE.Vector3())

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1.0, 64, 64), [])
  const circTex   = useMemo(() => createCircularParticleTexture(), [])
  const splatTex  = useMemo(() => createNebulaSplatTexture(), [])
  const cloudTex  = useMemo(() => getEyeCloudTex(), [])

  // ── Upper lid (more massive, like the reference) ──────────────────────
  // xSpread, yBase, yArch, yScatter, zSpread
  // yArch bumped from ~0.85-0.95 → 1.40-1.55 for more pronounced curve
  const uFine    = useMemo(() => makeLidGeo(280, +1, 3.8, 1.10, 2.20, 1.00, 1.10), [])
  const uMed     = useMemo(() => makeLidGeo( 95, +1, 3.6, 1.05, 2.25, 0.90, 1.00), [])
  const uBlob    = useMemo(() => makeLidGeo( 36, +1, 3.3, 1.00, 2.30, 0.80, 0.90), [])
  const uSprites = useMemo(
    () => makeLidSprites(28, +1, 3.5, 1.20, 2.15, 0.95, 1.00, 2.5, 8.0), []
  )

  // ── Lower lid (slightly smaller) ──────────────────────────────────────
  const lFine    = useMemo(() => makeLidGeo(200, -1, 3.2, 1.00, 1.65, 0.75, 0.90), [])
  const lMed     = useMemo(() => makeLidGeo( 65, -1, 3.0, 0.95, 1.70, 0.65, 0.80), [])
  const lBlob    = useMemo(() => makeLidGeo( 24, -1, 2.8, 0.90, 1.75, 0.55, 0.75), [])
  const lSprites = useMemo(
    () => makeLidSprites(20, -1, 3.0, 1.10, 1.60, 0.75, 0.85, 2.0, 6.5), []
  )

  const eyeUniforms = useRef({ uTime: { value: 0 }, uGlow: { value: 0.5 } })

  useEffect(() => () => {
    sphereGeo.dispose()
    uFine.dispose(); uMed.dispose(); uBlob.dispose()
    lFine.dispose(); lMed.dispose(); lBlob.dispose()
  }, [sphereGeo, uFine, uMed, uBlob, lFine, lMed, lBlob])

  const handlePointerEnter = () => {
    hoverRef.current = true
    if (!meshRef.current) return
    meshRef.current.getWorldPosition(_worldPos.current)
    _projPos.current.copy(_worldPos.current).project(camera)
    const sx = (_projPos.current.x *  0.5 + 0.5) * size.width
    const sy = (_projPos.current.y * -0.5 + 0.5) * size.height
    onHover?.('Prismatic Sigil', { x: sx, y: sy, radius: 75, color: '#ff6600' })
    document.body.style.cursor = 'pointer'
  }

  const handlePointerLeave = () => {
    hoverRef.current = false
    onHover?.(null, null)
    document.body.style.cursor = 'auto'
  }

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += 0.025 * delta
    const targetGlow = hoverRef.current ? 1.0 : 0.5
    glowRef.current += (targetGlow - glowRef.current) * Math.min(1, delta * 3)
    eyeUniforms.current.uTime.value += delta
    eyeUniforms.current.uGlow.value  = glowRef.current
  })

  return (
    <group position={[25, 10, -18]}>

      {/* ── Eye sphere: dark sclera, black pupil, solar corona ──────── */}
      <mesh
        ref={meshRef}
        geometry={sphereGeo}
        onClick={() => window.open(KALEIDOSCOPE_URL, '_blank')}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <shaderMaterial
          vertexShader={eyeVertShader}
          fragmentShader={eyeFragShader}
          uniforms={eyeUniforms.current}
          side={THREE.FrontSide}
          depthWrite={true}
        />
      </mesh>

      {/* ════════════════════════════════════════════════════════════════
          UPPER LID — four layers, large sprites dominate the look
          ════════════════════════════════════════════════════════════════ */}

      {/* Fine sparkle base */}
      <points geometry={uFine}>
        <pointsMaterial map={circTex} color="#8b3000"
          size={0.08} sizeAttenuation
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0.22} alphaTest={0.01} />
      </points>

      {/* Orange glowing particles scattered through upper haze */}
      <points geometry={uFine}>
        <pointsMaterial map={circTex} color="#ff5500"
          size={0.18} sizeAttenuation
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0.20} alphaTest={0.01} />
      </points>

      {/* Medium haze */}
      <points geometry={uMed}>
        <pointsMaterial map={circTex} color="#7a2600"
          size={0.45} sizeAttenuation
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0.12} alphaTest={0.01} />
      </points>

      {/* Orange medium haze */}
      <points geometry={uMed}>
        <pointsMaterial map={circTex} color="#cc4400"
          size={0.65} sizeAttenuation
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0.14} alphaTest={0.01} />
      </points>

      {/* Soft volumetric blobs */}
      <points geometry={uBlob}>
        <pointsMaterial map={splatTex} color="#5a1600"
          size={1.80} sizeAttenuation
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0.10} alphaTest={0.005} />
      </points>

      {/* Large gas cloud sprites */}
      {uSprites.map((s, i) => (
        <sprite key={`u${i}`} position={s.pos} scale={[s.s, s.s, 1]}>
          <spriteMaterial map={cloudTex} color="#5c1800"
            transparent opacity={s.op * 0.55}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      ))}

      {/* Orange sprite accents in upper lid */}
      {uSprites.filter((_, i) => i % 3 === 0).map((s, i) => (
        <sprite key={`uo${i}`} position={s.pos} scale={[s.s * 0.45, s.s * 0.45, 1]}>
          <spriteMaterial map={cloudTex} color="#ff4400"
            transparent opacity={s.op * 0.30}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      ))}

      {/* ════════════════════════════════════════════════════════════════
          LOWER LID
          ════════════════════════════════════════════════════════════════ */}

      <points geometry={lFine}>
        <pointsMaterial map={circTex} color="#7a2600"
          size={0.07} sizeAttenuation
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0.19} alphaTest={0.01} />
      </points>

      {/* Orange glowing particles in lower haze */}
      <points geometry={lFine}>
        <pointsMaterial map={circTex} color="#ff5500"
          size={0.16} sizeAttenuation
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0.18} alphaTest={0.01} />
      </points>

      <points geometry={lMed}>
        <pointsMaterial map={circTex} color="#6b2000"
          size={0.40} sizeAttenuation
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0.10} alphaTest={0.01} />
      </points>

      {/* Orange medium haze lower */}
      <points geometry={lMed}>
        <pointsMaterial map={circTex} color="#cc4400"
          size={0.58} sizeAttenuation
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0.12} alphaTest={0.01} />
      </points>

      <points geometry={lBlob}>
        <pointsMaterial map={splatTex} color="#4a1200"
          size={1.50} sizeAttenuation
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending} opacity={0.08} alphaTest={0.005} />
      </points>

      {lSprites.map((s, i) => (
        <sprite key={`l${i}`} position={s.pos} scale={[s.s, s.s, 1]}>
          <spriteMaterial map={cloudTex} color="#4c1400"
            transparent opacity={s.op * 0.55}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      ))}

      {/* Orange sprite accents in lower lid */}
      {lSprites.filter((_, i) => i % 3 === 0).map((s, i) => (
        <sprite key={`lo${i}`} position={s.pos} scale={[s.s * 0.40, s.s * 0.40, 1]}>
          <spriteMaterial map={cloudTex} color="#ff4400"
            transparent opacity={s.op * 0.28}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      ))}

    </group>
  )
}
