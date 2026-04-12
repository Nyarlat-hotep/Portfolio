import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const KALEIDOSCOPE_URL = 'https://nyarlat-hotep.github.io/sci-fi-kaleidoscope/'

// Shared vertex shader — used by both surface mesh and edge overlay
// so crystal edges warp with the geometry
const vertexShader = `
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

const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vBasePos;
  uniform float uTime;
  uniform float uGlow;

  void main() {
    vec2  p = vBasePos.xy;
    float r = length(p);
    float a = atan(p.y, p.x);

    // Iris texture: rings + radial striations warped angularly
    float warpA    = a + sin(r * 5.0 + uTime * 0.4) * 0.35 * uGlow;
    float rings    = sin(r * 16.0 - uTime * 0.7 + warpA * 0.5) * 0.5 + 0.5;
    float striae   = sin(warpA * 12.0 + r * 2.5) * 0.5 + 0.5;
    float irisP    = mix(rings, striae, 0.4);

    // Color: teal → violet → cyan
    vec3 teal   = vec3(0.00, 0.85, 0.90);
    vec3 violet = vec3(0.60, 0.05, 0.95);
    vec3 cyan   = vec3(0.00, 0.95, 0.85);
    float ct    = sin(uTime * 0.12 + r * 2.0) * 0.5 + 0.5;
    vec3 irisCol = mix(mix(teal, violet, irisP), cyan, ct * 0.4);

    // Limbal ring — bright edge of iris
    irisCol += smoothstep(0.018, 0.0, abs(r - 0.50)) * 1.6 * vec3(0.3, 0.7, 1.0);

    // Pupil — deep void at centre
    float pupilMask = smoothstep(0.14, 0.22, r);
    vec3  color     = mix(vec3(0.0, 0.01, 0.06), irisCol, pupilMask);

    // Fade out beyond iris edge
    float fade  = smoothstep(0.64, 0.46, r);
    color      *= fade;

    // Fresnel rim glow
    float fresnel = pow(1.0 - abs(normalize(vNormal).z), 2.0);
    color += fresnel * vec3(0.2, 0.6, 1.0) * uGlow;

    gl_FragColor = vec4(color, clamp(fade * (0.88 + fresnel * 0.12), 0.0, 1.0));
  }
`

const edgeFragShader = `
  void main() {
    gl_FragColor = vec4(0.53, 0.90, 1.0, 0.40);
  }
`

export default function KaleidoscopeEye({ onHover }) {
  const meshRef  = useRef()
  const hoverRef = useRef(false)
  const glowRef  = useRef(0.5)
  const { camera, size } = useThree()
  const _worldPos = useRef(new THREE.Vector3())
  const _projPos  = useRef(new THREE.Vector3())

  const geo      = useMemo(() => new THREE.IcosahedronGeometry(1.0, 2), [])
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(geo), [geo])

  // Single uniforms object shared by both materials — updates in useFrame reach both
  const uniforms = useRef({
    uTime:     { value: 0 },
    uMorphAmp: { value: 0.22 },
    uGlow:     { value: 0.5 },
  })

  useEffect(() => () => { geo.dispose(); edgesGeo.dispose() }, [geo, edgesGeo])

  const handlePointerEnter = () => {
    hoverRef.current = true
    if (!meshRef.current) return
    meshRef.current.getWorldPosition(_worldPos.current)
    _projPos.current.copy(_worldPos.current).project(camera)
    const sx = (_projPos.current.x *  0.5 + 0.5) * size.width
    const sy = (_projPos.current.y * -0.5 + 0.5) * size.height
    onHover?.('Prismatic Sigil', { x: sx, y: sy, radius: 55, color: '#00e5ff' })
    document.body.style.cursor = 'pointer'
  }

  const handlePointerLeave = () => {
    hoverRef.current = false
    onHover?.(null, null)
    document.body.style.cursor = 'auto'
  }

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += 0.04 * delta

    const targetGlow = hoverRef.current ? 1.0 : 0.5
    glowRef.current += (targetGlow - glowRef.current) * Math.min(1, delta * 3)

    const u = uniforms.current
    u.uTime.value     += delta
    u.uGlow.value      = glowRef.current
    u.uMorphAmp.value  = 0.18 + glowRef.current * 0.08
  })

  return (
    // Elongated on X, compressed on Y/Z → almond eye silhouette
    <group position={[25, 10, -18]} scale={[1.3, 0.85, 0.75]}>

      {/* Crystal eye surface */}
      <mesh
        ref={meshRef}
        geometry={geo}
        onClick={() => window.open(KALEIDOSCOPE_URL, '_blank')}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms.current}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Crystal edge overlay — same vertex shader so edges warp with the mesh */}
      <lineSegments geometry={edgesGeo}>
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={edgeFragShader}
          uniforms={uniforms.current}
          transparent
        />
      </lineSegments>

    </group>
  )
}
