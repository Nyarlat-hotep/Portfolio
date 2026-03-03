import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

const PLANET_PULL  = 160;   // gravity strength
const PLANET_DAMP  = 0.996; // low friction while gravity active — lets velocity keep building
const PLANET_MAX_V = 55;    // higher top speed so planets reach capture radius
const SPAG_START   = 8;    // distance at which spaghettification begins
const PLANET_CAP_R = 2.0;  // capture radius (disappear inside this)
const GRAVITY_DUR  = 10;   // must match GravityField's GRAVITY_DURATION

// All positions are in GravityField's local space (same coords as particles)
const CONFIGS = [
  { src: '/textures/earth.jpg',   home: [-5,  0.5, -3], orbitR: 1.5, orbitSpeed: 0.12, orbitPhase: 0.0, rotSpeed: 0.40 },
  { src: '/textures/mars.jpg',    home: [ 7, -0.5,  4], orbitR: 1.0, orbitSpeed: 0.08, orbitPhase: 1.2, rotSpeed: 0.25 },
  { src: '/textures/jupiter.jpg', home: [-9,  1.0,  6], orbitR: 2.0, orbitSpeed: 0.05, orbitPhase: 2.5, rotSpeed: 0.18 },
  { src: '/textures/neptune.jpg', home: [ 4, -1.0, -5], orbitR: 1.2, orbitSpeed: 0.09, orbitPhase: 4.1, rotSpeed: 0.35 },
  { src: '/textures/venus.jpg',   home: [-2,  0.2,  8], orbitR: 0.8, orbitSpeed: 0.14, orbitPhase: 0.8, rotSpeed: 0.55 },
];

function Planet({ config, wells }) {
  const meshRef = useRef();
  const texture = useLoader(THREE.TextureLoader, config.src);

  // Pre-allocated scratch objects — never create inside useFrame
  const _toWell = useMemo(() => new THREE.Vector3(), []);
  const _up     = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const _quat   = useMemo(() => new THREE.Quaternion(), []);

  const state = useRef({
    vel:          new THREE.Vector3(),
    orbitAngle:   config.orbitPhase,
    selfRotAngle: 0,
    alive:        true,
    captured:     false,
    fadeIn:       0,
  });

  const prevWellsLen = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt   = Math.min(delta, 0.05);
    const s    = state.current;
    const mesh = meshRef.current;

    // Detect well collapse → respawn if this planet was captured
    const wellCount = wells.length;
    if (prevWellsLen.current > 0 && wellCount === 0 && s.captured) {
      s.vel.set(0, 0, 0);
      s.captured    = false;
      s.alive       = false;
      s.fadeIn      = 0.001;
      s.orbitAngle  = config.orbitPhase;
      s.selfRotAngle = 0;
      mesh.visible  = true;
      mesh.material.opacity = 0;
      mesh.scale.set(1, 1, 1);
      mesh.rotation.set(0, 0, 0);
      mesh.position.set(config.home[0], config.home[1], config.home[2]);
    }
    prevWellsLen.current = wellCount;

    // Fade-in after respawn
    if (s.fadeIn > 0) {
      s.fadeIn = Math.min(1, s.fadeIn + dt * 0.7);
      mesh.material.opacity = s.fadeIn;
      if (s.fadeIn >= 1) {
        s.fadeIn = 0;
        s.alive  = true;
        mesh.material.opacity = 1;
      }
    }

    if (s.captured) { mesh.visible = false; return; }
    if (!s.alive)   return;

    // Orbit in XZ plane around home centre
    s.orbitAngle += config.orbitSpeed * dt;
    const baseX = config.home[0] + Math.cos(s.orbitAngle) * config.orbitR;
    const baseZ = config.home[2] + Math.sin(s.orbitAngle) * config.orbitR;

    // Position = orbit base + accumulated velocity displacement
    const px = baseX + s.vel.x;
    const py = config.home[1] + s.vel.y;
    const pz = baseZ + s.vel.z;

    // Gravity from all wells — planets are pulled indefinitely until well is removed
    const gravityActive = wells.length > 0;
    let nearWell = null, nearDist = Infinity;

    for (const w of wells) {
      const dx = w.x - px, dy = w.y - py, dz = w.z - pz;
      const d  = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (d < nearDist) { nearDist = d; nearWell = w; }
      if (d < 0.1) continue;
      const strength = Math.min(1, w.age / 1.5);
      const force    = Math.min(80, (PLANET_PULL * strength) / d) * dt;
      s.vel.x += (dx / d) * force;
      s.vel.y += (dy / d) * force;
      s.vel.z += (dz / d) * force;
    }

    s.vel.multiplyScalar(gravityActive ? PLANET_DAMP : 0.99);
    const spd = s.vel.length();
    if (spd > PLANET_MAX_V) s.vel.multiplyScalar(PLANET_MAX_V / spd);

    // Capture check
    if (nearWell && nearDist < PLANET_CAP_R) {
      s.captured   = true;
      s.alive      = false;
      mesh.visible = false;
      return;
    }

    // Spaghettification — stretch toward well as it approaches
    if (nearWell && nearDist < SPAG_START) {
      const t       = 1 - nearDist / SPAG_START; // 0 at edge, 1 at capture
      const stretch = 1 + t * t * 6;
      const squish  = 1 / Math.sqrt(stretch);

      // Orient stretch axis toward the well
      _toWell.set(nearWell.x - px, nearWell.y - py, nearWell.z - pz);
      const toWellLen = _toWell.length();
      if (toWellLen > 0.001) {
        _toWell.divideScalar(toWellLen);
        if (_toWell.dot(_up) > -0.9999) {
          _quat.setFromUnitVectors(_up, _toWell);
        } else {
          // antiparallel — 180° rotation around X axis
          _quat.set(1, 0, 0, 0);
        }
        mesh.quaternion.copy(_quat);
        mesh.scale.set(squish, stretch, squish);
      }
    } else {
      // Normal: self-rotate and reset orientation
      s.selfRotAngle = (s.selfRotAngle + config.rotSpeed * dt) % (Math.PI * 2);
      mesh.rotation.set(0, s.selfRotAngle, 0);
      mesh.scale.set(1, 1, 1);
    }

    mesh.position.set(px, py, pz);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.15, 24, 24]} />
      <meshStandardMaterial map={texture} transparent />
    </mesh>
  );
}

export default function PlanetField({ wells }) {
  return (
    <>
      {CONFIGS.map((cfg, i) => (
        <Planet key={i} config={cfg} wells={wells} />
      ))}
    </>
  );
}
