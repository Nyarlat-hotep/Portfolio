import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const KALEIDOSCOPE_URL = 'https://nyarlat-hotep.github.io/sci-fi-kaleidoscope/'

// ── Eye vertex shader (shared with edge overlay so facets warp together) ──
const eyeVertShader = `
  varying vec3 vNormal;
  varying vec3 vBasePos;
  uniform float uTime;
  uniform float uMorphAmp;
  void main() {
    float n = sin(position.x * 2.3 + uTime * 0.71) * cos(position.y * 1.8 - uTime * 0.53)
            + cos(position.y * 3.1 + uTime * 0.40) * sin(position.z * 2.7 - uTime * 0.63)
            + sin(position.z * 1.9 - uTime * 0.31) * cos(position.x * 3.5 + uTime * 0.41);
    vec3 displaced = position + normal * n * uMorphAmp;
    vNormal  = normalMatrix * normal;
    vBasePos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`

// ── Eye surface: pupil void + solar corona + warm kaleidoscope iris ────────
const eyeFragShader = `
  varying vec3 vNormal;
  varying vec3 vBasePos;
  uniform float uTime;
  uniform float uGlow;

  void main() {
    vec2  p = vBasePos.xy;
    float r = length(p);
    float a = atan(p.y, p.x);

    // ── Pupil — deep black void ─────────────────────────────────────────
    float pupil = smoothstep(0.21, 0.16, r);

    // ── Solar corona ring with jagged flare spikes ──────────────────────
    float coronaR  = 0.24;
    float ring     = smoothstep(0.055, 0.0, abs(r - coronaR));
    // Two overlapping spike frequencies for irregular flare tips
    float spikes   = pow(sin(a * 7.0  + uTime * 0.44) * 0.5 + 0.5, 2.2)
                   * pow(sin(a * 11.0 - uTime * 0.31) * 0.5 + 0.5, 1.6);
    float spikes2  = pow(sin(a * 4.0  + uTime * 0.22) * 0.5 + 0.5, 1.5) * 0.5;
    float flareR   = coronaR + (spikes + spikes2 * 0.4) * 0.14;
    float flare    = smoothstep(0.11, 0.0, abs(r - flareR)) * spikes;
    float corona   = clamp(ring * 1.4 + flare * 0.85, 0.0, 1.0);

    // ── Iris: kaleidoscope warp + swirl, orange/red/amber palette ───────
    float warpA = a + sin(r * 5.2 + uTime * 0.37) * 0.48
                    + cos(r * 3.1 - uTime * 0.21) * 0.18;
    float rings = sin(r * 14.0  - uTime * 0.58 + warpA * 0.75) * 0.5 + 0.5;
    float swirl = sin(warpA * 7.0 + r * 3.8 - uTime * 0.24)    * 0.5 + 0.5;
    float ripple= sin(r * 28.0  - uTime * 1.1  + warpA * 0.3)  * 0.18;
    float irisP = clamp(mix(rings, swirl, 0.45) + ripple, 0.0, 1.0);

    vec3 deepRed  = vec3(0.32, 0.01, 0.00);
    vec3 orange   = vec3(0.88, 0.30, 0.00);
    vec3 amber    = vec3(1.00, 0.70, 0.08);
    vec3 yellow   = vec3(1.00, 0.92, 0.38);
    float ct      = sin(uTime * 0.11 + r * 1.9) * 0.5 + 0.5;
    vec3 irisCol  = mix(mix(deepRed, orange, irisP), mix(amber, yellow, ct * irisP), ct * 0.45);

    // ── Corona: bright amber-to-yellow-white ────────────────────────────
    vec3 coronaCol = mix(vec3(0.96, 0.44, 0.0), vec3(1.0, 0.94, 0.55), corona);

    // ── Compose ─────────────────────────────────────────────────────────
    vec3 color = irisCol;
    color = mix(color, coronaCol * 2.0, corona);    // overlay corona
    color = mix(color, vec3(0.0), pupil);            // black out pupil

    float edgeFade = smoothstep(0.62, 0.44, r);
    color *= edgeFade;

    // Warm fresnel rim
    float fresnel = pow(1.0 - abs(normalize(vNormal).z), 2.2);
    color += fresnel * vec3(0.92, 0.30, 0.0) * uGlow * 0.55;

    gl_FragColor = vec4(color, clamp(edgeFade * 0.93 + fresnel * 0.07, 0.0, 1.0));
  }
`

// ── Edge overlay: dim orange tint ─────────────────────────────────────────
const edgeFragShader = `
  void main() { gl_FragColor = vec4(0.80, 0.22, 0.0, 0.22); }
`

// ── Nebula lid: domain-warped organic cloud ────────────────────────────────
const lidVertShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const lidFragShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAlpha;

  void main() {
    vec2 q = vUv - 0.5;

    // Domain warp — two octaves of sin noise
    float wx = sin(q.x * 4.5 + q.y * 2.2 + uTime * 0.04) * 0.22
             + sin(q.y * 7.0 - q.x * 3.0 - uTime * 0.06) * 0.11;
    float wy = cos(q.y * 3.8 - q.x * 5.0 + uTime * 0.05) * 0.18
             + cos(q.x * 6.0 + q.y * 4.5 - uTime * 0.04) * 0.10;
    vec2 wq = q + vec2(wx, wy) * 0.18;

    float c1 = sin(wq.x * 6.0 + wq.y * 3.2 + uTime * 0.03) * 0.5 + 0.5;
    float c2 = sin(wq.x * 9.5 - wq.y * 4.8 - uTime * 0.05) * 0.5 + 0.5;
    float c3 = sin(wq.x * 3.2 - wq.y * 6.5 + uTime * 0.04) * 0.5 + 0.5;
    float cloud = c1 * c2 * 0.7 + c3 * 0.3;

    // Elliptical shape mask — wide, not tall; fades all edges
    float ellipse = length(q * vec2(1.0, 2.2));
    float mask    = smoothstep(0.52, 0.10, ellipse)
                  * smoothstep(0.50, 0.22, abs(q.x));

    vec3 nebCol = mix(vec3(0.12, 0.02, 0.0), vec3(0.52, 0.14, 0.01), cloud * 0.85);
    // Slight orange rim glow
    nebCol += smoothstep(0.35, 0.10, ellipse) * vec3(0.30, 0.08, 0.0) * cloud;

    float alpha = cloud * mask * uAlpha;
    gl_FragColor = vec4(nebCol, clamp(alpha, 0.0, 1.0));
  }
`

export default function KaleidoscopeEye({ onHover }) {
  const meshRef   = useRef()
  const hoverRef  = useRef(false)
  const glowRef   = useRef(0.5)
  const { camera, size } = useThree()
  const _worldPos = useRef(new THREE.Vector3())
  const _projPos  = useRef(new THREE.Vector3())

  const geo          = useMemo(() => new THREE.IcosahedronGeometry(1.0, 2), [])
  const edgesGeo     = useMemo(() => new THREE.EdgesGeometry(geo), [geo])
  const upperLidGeo  = useMemo(() => new THREE.PlaneGeometry(4.0, 2.2, 1, 1), [])
  const lowerLidGeo  = useMemo(() => new THREE.PlaneGeometry(3.5, 1.8, 1, 1), [])

  useEffect(() => () => {
    geo.dispose(); edgesGeo.dispose()
    upperLidGeo.dispose(); lowerLidGeo.dispose()
  }, [geo, edgesGeo, upperLidGeo, lowerLidGeo])

  // Eye + edge share uniforms — one useFrame write updates both materials
  const eyeUniforms = useRef({
    uTime:     { value: 0 },
    uMorphAmp: { value: 0.22 },
    uGlow:     { value: 0.5 },
  })

  // Lid uniforms — shared time so lids animate together
  const lidUniforms = useRef({
    uTime:  { value: 0 },
    uAlpha: { value: 0.80 },
  })

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
    meshRef.current.rotation.y += 0.035 * delta

    const targetGlow = hoverRef.current ? 1.0 : 0.5
    glowRef.current += (targetGlow - glowRef.current) * Math.min(1, delta * 3)

    const e = eyeUniforms.current
    e.uTime.value     += delta
    e.uGlow.value      = glowRef.current
    e.uMorphAmp.value  = 0.18 + glowRef.current * 0.09

    lidUniforms.current.uTime.value += delta
  })

  return (
    <group position={[25, 10, -18]} scale={[2.0, 1.3, 1.0]}>

      {/* Crystal eye surface — iris, corona, pupil */}
      <mesh
        ref={meshRef}
        geometry={geo}
        onClick={() => window.open(KALEIDOSCOPE_URL, '_blank')}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <shaderMaterial
          vertexShader={eyeVertShader}
          fragmentShader={eyeFragShader}
          uniforms={eyeUniforms.current}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Crystal facet edges — morph with eye, orange tint */}
      <lineSegments geometry={edgesGeo}>
        <shaderMaterial
          vertexShader={eyeVertShader}
          fragmentShader={edgeFragShader}
          uniforms={eyeUniforms.current}
          transparent
        />
      </lineSegments>

      {/* Upper nebula lid — dark wisps above, suggest eyelid from front */}
      <mesh geometry={upperLidGeo} position={[0, 1.55, 0.15]}>
        <shaderMaterial
          vertexShader={lidVertShader}
          fragmentShader={lidFragShader}
          uniforms={lidUniforms.current}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Lower nebula lid — smaller wisps below */}
      <mesh geometry={lowerLidGeo} position={[0, -1.35, 0.15]}>
        <shaderMaterial
          vertexShader={lidVertShader}
          fragmentShader={lidFragShader}
          uniforms={lidUniforms.current}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

    </group>
  )
}
