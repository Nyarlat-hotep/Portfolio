import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { playDerelict, setDerelictVolume, stopDerelict } from '../../utils/sounds';

// ── Distance fade helper ──────────────────────────────────────────────────────

function fadeIn(dist, start, end) {
  if (dist <= start) return 1;
  if (dist >= end)   return 0;
  return 1 - (dist - start) / (end - start);
}

// ── Fallback ship built from BoxGeometry pieces ───────────────────────────────

function FallbackShip({ matRef }) {
  const shipMat = useMemo(() => new THREE.MeshStandardMaterial({
    roughness: 0.85,
    metalness: 0.4,
    color: '#2a2a30',
    transparent: true,
    opacity: 1,
  }), []);

  // Store ref in parent ref array for opacity updates
  useEffect(() => {
    if (matRef) matRef.current = shipMat;
    return () => shipMat.dispose();
  }, [shipMat, matRef]);

  return (
    <group>
      {/* Fuselage */}
      <mesh material={shipMat}>
        <boxGeometry args={[8, 1.5, 2]} />
      </mesh>

      {/* Left wing */}
      <mesh position={[-4, 0, 0]} rotation-z={0.12} material={shipMat}>
        <boxGeometry args={[3, 0.4, 5]} />
      </mesh>

      {/* Right wing */}
      <mesh position={[4, 0, 0]} rotation-z={-0.12} material={shipMat}>
        <boxGeometry args={[3, 0.4, 5]} />
      </mesh>

      {/* Left nacelle */}
      <mesh position={[-3, -1, -1.5]} material={shipMat}>
        <boxGeometry args={[1.5, 1.5, 3]} />
      </mesh>

      {/* Right nacelle */}
      <mesh position={[3, -1, -1.5]} material={shipMat}>
        <boxGeometry args={[1.5, 1.5, 3]} />
      </mesh>
    </group>
  );
}

// Reusable dummy Object3D for matrix operations (avoids per-effect allocation)
const _dummyObj = new THREE.Object3D();

// ── Main component ────────────────────────────────────────────────────────────

export default function Derelict({ position = [-140, 8, -85], onClick }) {
  const groupRef    = useRef();
  const shipMatRef  = useRef();
  const debrisMatRef = useRef();
  const playingRef  = useRef(false);

  const worldPos = useMemo(() => new THREE.Vector3(...position), [position]);

  // ── Debris field data — 30 chunks ─────────────────────────────────────────

  const debrisData = useMemo(() => {
    const items = [];

    for (let i = 0; i < 30; i++) {
      // Random position in a sphere radius 12–25
      const theta  = Math.random() * Math.PI * 2;
      const phi    = Math.acos(2 * Math.random() - 1);
      const r      = 12 + Math.random() * 13;
      const x      = r * Math.sin(phi) * Math.cos(theta);
      const y      = r * Math.sin(phi) * Math.sin(theta);
      const z      = r * Math.cos(phi);

      const scale  = 0.1 + Math.random() * 0.7;
      const rotX   = Math.random() * Math.PI * 2;
      const rotY   = Math.random() * Math.PI * 2;
      const rotZ   = Math.random() * Math.PI * 2;

      const axis   = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize();
      const speed  = (0.3 + Math.random() * 0.7) * (Math.random() > 0.5 ? 1 : -1);

      _dummyObj.position.set(x, y, z);
      _dummyObj.rotation.set(rotX, rotY, rotZ);
      _dummyObj.scale.setScalar(scale);
      _dummyObj.updateMatrix();

      items.push({ matrix: _dummyObj.matrix.clone(), pos: [x, y, z], scale, axis, speed });
    }
    return items;
  }, []);

  // ── InstancedMesh refs ────────────────────────────────────────────────────

  const debrisRef    = useRef();
  const glowRef      = useRef();
  const glowMatRef   = useRef();

  // Pre-build rotation quaternions and current rotation state per instance
  const rotStates = useMemo(() => debrisData.map(() => ({
    quat: new THREE.Quaternion(),
    deltaQ: new THREE.Quaternion(),
  })), [debrisData]);

  // Apply initial matrices
  useEffect(() => {
    debrisData.forEach((d, i) => {
      _dummyObj.matrix.copy(d.matrix);
      _dummyObj.matrix.decompose(_dummyObj.position, _dummyObj.quaternion, _dummyObj.scale);
      rotStates[i].quat.copy(_dummyObj.quaternion);

      if (debrisRef.current) {
        debrisRef.current.setMatrixAt(i, d.matrix);
      }
      if (glowRef.current && i < 8) {
        _dummyObj.scale.setScalar(d.scale * 1.3);
        _dummyObj.updateMatrix();
        glowRef.current.setMatrixAt(i, _dummyObj.matrix);
      }
    });
    if (debrisRef.current) debrisRef.current.instanceMatrix.needsUpdate = true;
    if (glowRef.current)   glowRef.current.instanceMatrix.needsUpdate   = true;
  }, [debrisData, rotStates]);

  // ── Stop sound on unmount ────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopDerelict();
    };
  }, []);

  // ── Click handler ────────────────────────────────────────────────────────

  function handleClick(e) {
    e.stopPropagation();
    onClick?.();
  }

  // ── Frame loop ───────────────────────────────────────────────────────────

  const _tmpMatrix = useMemo(() => new THREE.Matrix4(), []);
  const _tmpPos    = useMemo(() => new THREE.Vector3(), []);
  const _tmpScale  = useMemo(() => new THREE.Vector3(), []);
  const _axisAngleQ = useMemo(() => new THREE.Quaternion(), []);

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;

    // ── Distance fade ──────────────────────────────────────────────────────
    const camDist  = state.camera.position.length();
    const intensity = fadeIn(camDist, 100, 160);

    g.visible = intensity > 0.01;
    if (!g.visible) return;

    // Apply fade to ship material
    if (shipMatRef.current) {
      shipMatRef.current.opacity = intensity;
    }

    // Apply fade to debris material
    if (debrisMatRef.current) {
      debrisMatRef.current.opacity = intensity;
    }

    // Apply fade to glow material (caps at 0.6 when fully visible)
    if (glowMatRef.current) {
      glowMatRef.current.opacity = Math.min(0.6, intensity * 0.6);
    }

    // ── Slow rotation of entire group ──────────────────────────────────────
    g.rotation.y += delta * 0.01;

    // ── Tumble debris instances ────────────────────────────────────────────
    if (debrisRef.current) {
      debrisData.forEach((d, i) => {
        const rs = rotStates[i];
        _axisAngleQ.setFromAxisAngle(d.axis, d.speed * delta);
        rs.quat.premultiply(_axisAngleQ);

        _tmpPos.set(d.pos[0], d.pos[1], d.pos[2]);
        _tmpScale.setScalar(d.scale);
        _tmpMatrix.compose(_tmpPos, rs.quat, _tmpScale);
        debrisRef.current.setMatrixAt(i, _tmpMatrix);

        if (glowRef.current && i < 8) {
          _tmpScale.setScalar(d.scale * 1.3);
          _tmpMatrix.compose(_tmpPos, rs.quat, _tmpScale);
          glowRef.current.setMatrixAt(i, _tmpMatrix);
        }
      });
      debrisRef.current.instanceMatrix.needsUpdate = true;
      if (glowRef.current) glowRef.current.instanceMatrix.needsUpdate = true;
    }

    // ── Proximity sound ────────────────────────────────────────────────────
    const dist = state.camera.position.distanceTo(worldPos);
    const vol  = Math.max(0, 1 - dist / 60) * 0.3;

    setDerelictVolume(vol);

    if (vol > 0 && !playingRef.current) {
      playDerelict();
      playingRef.current = true;
    } else if (vol <= 0 && playingRef.current) {
      stopDerelict();
      playingRef.current = false;
    }
  });

  return (
    <group ref={groupRef} position={position}>

      {/* Invisible hit sphere */}
      <mesh
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={()  => { document.body.style.cursor = 'auto'; }}
        onClick={handleClick}
      >
        <sphereGeometry args={[10, 8, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Ship silhouette */}
      <FallbackShip matRef={shipMatRef} />

      {/* Debris field — 30 chunks */}
      <instancedMesh ref={debrisRef} args={[null, null, 30]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          ref={debrisMatRef}
          roughness={0.9}
          metalness={0.3}
          color="#1e1e24"
          transparent
          opacity={1}
        />
      </instancedMesh>

      {/* Heat-glow overlay — 8 additive instances */}
      <instancedMesh ref={glowRef} args={[null, null, 8]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          ref={glowMatRef}
          color="#ff2200"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.6}
        />
      </instancedMesh>

    </group>
  );
}
