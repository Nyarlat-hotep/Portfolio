import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { createCircularParticleTexture } from '../../utils/threeUtils'

const ORBIT_R     = 182
const ORBIT_SPEED = 0.0025
const ORBIT_INCL  = 0.18

// Haze sprite texture
let _hazeTex = null
function getHazeTex() {
  if (_hazeTex) return _hazeTex
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
  return (_hazeTex = new THREE.CanvasTexture(canvas))
}

const _dummyObj = new THREE.Object3D()

export default function SpaceStation({ onClick }) {
  const groupRef   = useRef()
  const debrisRef  = useRef()
  const glowRef    = useRef()
  const glowMatRef = useRef()
  const cloudRef   = useRef()

  const { scene } = useGLTF('/models/sci-fi_space_station_2-v2.glb')
  const clonedScene = useMemo(() => scene.clone(true), [scene])

  // ── Red-hot tumbling debris — 30 chunks ──────────────────────────────────
  const debrisData = useMemo(() => {
    const items = []
    for (let i = 0; i < 30; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 6 + Math.random() * 9   // tighter around station
      const x     = r * Math.sin(phi) * Math.cos(theta)
      const y     = r * Math.sin(phi) * Math.sin(theta)
      const z     = r * Math.cos(phi)
      const scale = 0.06 + Math.random() * 0.28  // smaller to match station scale
      const axis  = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize()
      const speed = (0.3 + Math.random() * 0.7) * (Math.random() > 0.5 ? 1 : -1)
      _dummyObj.position.set(x, y, z)
      _dummyObj.rotation.set(Math.random()*Math.PI*2, Math.random()*Math.PI*2, Math.random()*Math.PI*2)
      _dummyObj.scale.setScalar(scale)
      _dummyObj.updateMatrix()
      items.push({ matrix: _dummyObj.matrix.clone(), pos: [x, y, z], scale, axis, speed })
    }
    return items
  }, [])

  const rotStates = useMemo(() => debrisData.map(() => ({
    quat: new THREE.Quaternion(),
    deltaQ: new THREE.Quaternion(),
  })), [debrisData])

  const _tmpMatrix   = useMemo(() => new THREE.Matrix4(), [])
  const _tmpPos      = useMemo(() => new THREE.Vector3(), [])
  const _tmpScale    = useMemo(() => new THREE.Vector3(), [])
  const _axisAngleQ  = useMemo(() => new THREE.Quaternion(), [])

  // Apply initial matrices
  useEffect(() => {
    debrisData.forEach((d, i) => {
      _dummyObj.matrix.copy(d.matrix)
      _dummyObj.matrix.decompose(_dummyObj.position, _dummyObj.quaternion, _dummyObj.scale)
      rotStates[i].quat.copy(_dummyObj.quaternion)
      if (debrisRef.current) debrisRef.current.setMatrixAt(i, d.matrix)
      if (glowRef.current)   glowRef.current.setMatrixAt(i, d.matrix)
    })
    if (debrisRef.current) debrisRef.current.instanceMatrix.needsUpdate = true
    if (glowRef.current)   glowRef.current.instanceMatrix.needsUpdate   = true
  }, [debrisData, rotStates])

  // Ambient haze blobs
  const hazeKnots = useMemo(() => {
    const out = []
    for (let i = 0; i < 6; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 5 + Math.random() * 8
      out.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta) * 0.5,
        z: r * Math.cos(phi),
        s: 6 + Math.random() * 10,
        opacity: 0.04 + Math.random() * 0.04,
      })
    }
    return out
  }, [])

  // Debris cloud particles
  const cloudGeo = useMemo(() => {
    const COUNT = 180
    const pos   = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 7 + Math.random() * 14
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.5
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])

  const circleTex = useMemo(() => createCircularParticleTexture(), [])
  const hazeTex   = useMemo(() => getHazeTex(), [])


  useFrame((state, delta) => {
    if (!groupRef.current) return

    // Orbital position
    const t = state.clock.elapsedTime * ORBIT_SPEED
    groupRef.current.position.set(
      Math.cos(t) * ORBIT_R,
      Math.sin(t) * ORBIT_R * Math.sin(ORBIT_INCL),
      Math.sin(t) * ORBIT_R * Math.cos(ORBIT_INCL)
    )
    groupRef.current.rotation.y += delta * 0.06
    groupRef.current.rotation.x += delta * 0.01

    if (cloudRef.current) cloudRef.current.rotation.y -= delta * 0.005

    // Tumble debris
    if (debrisRef.current) {
      debrisData.forEach((d, i) => {
        const rs = rotStates[i]
        _axisAngleQ.setFromAxisAngle(d.axis, d.speed * delta)
        rs.quat.premultiply(_axisAngleQ)
        _tmpPos.set(d.pos[0], d.pos[1], d.pos[2])
        _tmpScale.setScalar(d.scale)
        _tmpMatrix.compose(_tmpPos, rs.quat, _tmpScale)
        debrisRef.current.setMatrixAt(i, _tmpMatrix)
        if (glowRef.current) glowRef.current.setMatrixAt(i, _tmpMatrix)
      })
      debrisRef.current.instanceMatrix.needsUpdate = true
      if (glowRef.current) glowRef.current.instanceMatrix.needsUpdate = true
    }

  })

  return (
    <group ref={groupRef} scale={0.8}>
      {/* Invisible hit sphere for click */}
      <mesh
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={()  => { document.body.style.cursor = 'auto' }}
        onClick={e => { e.stopPropagation(); onClick?.() }}
      >
        <sphereGeometry args={[10, 8, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* GLB station model */}
      <primitive object={clonedScene} />

      {/* Tumbling debris — black fill polyhedra */}
      <instancedMesh ref={debrisRef} args={[null, null, 30]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#000000" />
      </instancedMesh>

      {/* Red wireframe outline — same instanced positions */}
      <instancedMesh ref={glowRef} args={[null, null, 30]}>
        <icosahedronGeometry args={[1.05, 0]} />
        <meshBasicMaterial
          ref={glowMatRef}
          color="#ff2200"
          transparent
          wireframe
          depthWrite={false}
          opacity={0.9}
        />
      </instancedMesh>

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

      {/* Debris particle cloud */}
      <group ref={cloudRef}>
        <points geometry={cloudGeo}>
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
