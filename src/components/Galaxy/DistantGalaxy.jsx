import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCircularParticleTexture, createNebulaSplatTexture } from '../../utils/threeUtils';

// Positioned east of the planet cluster — discovered by orbiting right
const GALAXY_RADIUS  = 9;
const BULGE_COUNT    = 315;
const ARM_COUNT      = 648; // per arm, 2 arms total
const HALO_COUNT     = 162;

function buildGalaxyGeometry() {
  const total     = BULGE_COUNT + ARM_COUNT * 2 + HALO_COUNT;
  const positions = new Float32Array(total * 3);
  const colors    = new Float32Array(total * 3);

  const bulgeColor = new THREE.Color('#ffcc77');  // warm amber galactic core
  const armPink    = new THREE.Color('#ffb8c8');  // rose — hot inner stars
  const armBlue    = new THREE.Color('#c0d8ff');  // blue-white mid arms
  const armViolet  = new THREE.Color('#8866dd');  // violet outer edges
  const hotStar    = new THREE.Color('#a8d8ff');  // bright blue special stars
  const coolStar   = new THREE.Color('#ffaa44');  // orange-red giant stars
  const haloColor  = new THREE.Color('#9988cc');  // purple outer halo

  let idx = 0;

  // ── Central bulge — tight 3D ellipsoid ──
  for (let i = 0; i < BULGE_COUNT; i++) {
    const r     = Math.pow(Math.random(), 1.8) * GALAXY_RADIUS * 0.22;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(Math.random() * 2 - 1);
    positions[idx * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[idx * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.35; // flatten
    positions[idx * 3 + 2] = r * Math.cos(phi);
    const brightness = 0.28 + Math.random() * 0.22;
    colors[idx * 3]     = bulgeColor.r * brightness;
    colors[idx * 3 + 1] = bulgeColor.g * brightness;
    colors[idx * 3 + 2] = bulgeColor.b * brightness;
    idx++;
  }

  // ── Spiral arms ──
  for (let arm = 0; arm < 2; arm++) {
    const armOffset = arm * Math.PI;
    for (let i = 0; i < ARM_COUNT; i++) {
      const t       = i / ARM_COUNT;
      const angle   = t * Math.PI * 2.8 + armOffset;
      const r       = 0.5 + t * GALAXY_RADIUS;
      const scatter = (0.15 + t * 0.45) * GALAXY_RADIUS;

      positions[idx * 3]     = r * Math.cos(angle) + (Math.random() - 0.5) * scatter;
      positions[idx * 3 + 1] = (Math.random() - 0.5) * 0.6 * (1 - t * 0.6);
      positions[idx * 3 + 2] = r * Math.sin(angle) + (Math.random() - 0.5) * scatter;

      // Color gradient: pink inner → blue-white mid → violet outer
      // Plus occasional hot blue or cool orange "special" stars
      let col;
      const specialRoll = Math.random();
      if (specialRoll < 0.04) {
        col = hotStar.clone();  // bright blue star
      } else if (specialRoll < 0.07) {
        col = coolStar.clone(); // orange-red giant
      } else if (t < 0.35) {
        col = new THREE.Color().lerpColors(armPink, armBlue, t / 0.35);
      } else if (t < 0.7) {
        col = new THREE.Color().lerpColors(armBlue, armViolet, (t - 0.35) / 0.35);
      } else {
        col = armViolet.clone();
      }
      const brightness = 0.45 + Math.random() * 0.55;
      colors[idx * 3]     = col.r * brightness;
      colors[idx * 3 + 1] = col.g * brightness;
      colors[idx * 3 + 2] = col.b * brightness;
      idx++;
    }
  }

  // ── Outer halo — diffuse glow around the whole disc ──
  for (let i = 0; i < HALO_COUNT; i++) {
    const r     = GALAXY_RADIUS * (0.7 + Math.random() * 0.5);
    const theta = Math.random() * Math.PI * 2;
    positions[idx * 3]     = r * Math.cos(theta) + (Math.random() - 0.5) * 3;
    positions[idx * 3 + 1] = (Math.random() - 0.5) * 1.5;
    positions[idx * 3 + 2] = r * Math.sin(theta) + (Math.random() - 0.5) * 3;
    const brightness = 0.25 + Math.random() * 0.3;
    colors[idx * 3]     = haloColor.r * brightness;
    colors[idx * 3 + 1] = haloColor.g * brightness;
    colors[idx * 3 + 2] = haloColor.b * brightness;
    idx++;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  return geo;
}

// ── Nebula haze ───────────────────────────────────────────────────────────────

function buildNebulaGeometry() {
  const count     = 315;
  const positions = new Float32Array(count * 3);
  const colors    = new Float32Array(count * 3);

  const coreCol  = new THREE.Color('#cc9944'); // muted amber — galactic core
  const midCol   = new THREE.Color('#cc88aa'); // dusty rose — arm haze
  const outerCol = new THREE.Color('#7755bb'); // violet — outer disc

  const spreadXZ = GALAXY_RADIUS * 1.1; // tighter spread → more overlap → real haze
  const spreadY  = 1.6;                 // thin disc

  for (let i = 0; i < count; i++) {
    // Gaussian-ish: averaging two randoms creates a bell curve — dense center, soft edges
    const rx = ((Math.random() + Math.random()) / 2 - 0.5) * 2;
    const rz = ((Math.random() + Math.random()) / 2 - 0.5) * 2;
    const ry = (Math.random() - 0.5) * 2;

    positions[i * 3]     = rx * spreadXZ;
    positions[i * 3 + 1] = ry * spreadY;
    positions[i * 3 + 2] = rz * spreadXZ;

    // Color by radial distance — matches star palette so haze feels integrated
    const normR = Math.min(1, Math.sqrt(rx * rx + rz * rz));
    let col;
    if (normR < 0.25) {
      col = coreCol.clone().lerp(midCol, normR / 0.25);
    } else {
      col = midCol.clone().lerp(outerCol, (normR - 0.25) / 0.75);
    }
    col.multiplyScalar(0.5 + Math.random() * 0.5);

    colors[i * 3]     = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  return geo;
}

// ── Galactic events (supernovas + star births) ────────────────────────────────

const EVENT_COUNT = 6;

const SUPERNOVA_COLOR = new THREE.Color('#ddeeff'); // white-blue flash
const BIRTH_COLOR     = new THREE.Color('#ffdd88'); // warm amber emergence

const MIN_GLOW = 0.09; // never goes fully dark — always a faint point

const EVENT_DEFS = {
  supernova: { color: SUPERNOVA_COLOR, riseTime: 0.5,  peakTime: 0.5,  fallTime: 5.0 },
  birth:     { color: BIRTH_COLOR,     riseTime: 2.0,  peakTime: 0.8,  fallTime: 4.0 },
};

function randomEventPosition() {
  // Scatter within the galaxy disc — bias away from exact center
  const angle = Math.random() * Math.PI * 2;
  const r     = GALAXY_RADIUS * (0.2 + Math.random() * 0.85);
  return [r * Math.cos(angle), (Math.random() - 0.5) * 0.9, r * Math.sin(angle)];
}

function buildEventGeometry() {
  const positions = new Float32Array(EVENT_COUNT * 3); // all at origin
  const colors    = new Float32Array(EVENT_COUNT * 3); // all black = invisible
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  const colAttr = new THREE.BufferAttribute(colors, 3);
  posAttr.usage = THREE.DynamicDrawUsage;
  colAttr.usage = THREE.DynamicDrawUsage;
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color',    colAttr);
  return geo;
}

function initEventStates() {
  const types = Object.keys(EVENT_DEFS);
  return Array.from({ length: EVENT_COUNT }, (_, i) => ({
    type:        types[i % types.length],
    phase:       'dormant',    // dormant | rising | peak | falling
    timer:       0,
    dormantWait: 2 + i * 1.8 + Math.random() * 2, // stagger initial fires
    position:    randomEventPosition(),
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DistantGalaxy() {
  const groupRef  = useRef();
  const nebulaRef = useRef();
  const texture     = useMemo(() => createCircularParticleTexture(), []);
  const nebulaTex   = createNebulaSplatTexture(); // module-level cache — stable reference
  const geometry    = useMemo(() => buildGalaxyGeometry(), []);
  const nebulaGeo   = useMemo(() => buildNebulaGeometry(), []);
  const eventsGeo   = useMemo(() => buildEventGeometry(), []);
  const events      = useRef(initEventStates());

  useEffect(() => {
    return () => {
      geometry.dispose();
      nebulaGeo.dispose();
      eventsGeo.dispose();
      texture.dispose();
      // nebulaTex is a module-level cache shared with Constellation — not disposed here
    };
  }, [geometry, nebulaGeo, eventsGeo, texture]);

  useFrame((_, delta) => {
    // Stars rotate at base speed
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.008;
    }
    // Nebula counter-rotates very slightly — creates subtle parallax depth
    if (nebulaRef.current) {
      nebulaRef.current.rotation.y -= delta * 0.003;
    }

    // Animate galactic events
    const colAttr = eventsGeo.attributes.color;
    const posAttr = eventsGeo.attributes.position;

    events.current.forEach((ev, i) => {
      const def = EVENT_DEFS[ev.type];
      ev.timer += delta;

      const setCol = (brightness) => {
        const b = MIN_GLOW + brightness * (1 - MIN_GLOW);
        colAttr.setXYZ(i, def.color.r * b, def.color.g * b, def.color.b * b);
      };

      if (ev.phase === 'dormant') {
        setCol(0); // faint baseline glow — never fully dark
        if (ev.timer >= ev.dormantWait) {
          ev.phase    = 'rising';
          ev.timer    = 0;
          ev.position = randomEventPosition();
          posAttr.setXYZ(i, ev.position[0], ev.position[1], ev.position[2]);
        }
      } else if (ev.phase === 'rising') {
        setCol(Math.min(1, ev.timer / def.riseTime));
        if (ev.timer >= def.riseTime) { ev.phase = 'peak'; ev.timer = 0; }
      } else if (ev.phase === 'peak') {
        setCol(1);
        if (ev.timer >= def.peakTime) { ev.phase = 'falling'; ev.timer = 0; }
      } else if (ev.phase === 'falling') {
        setCol(Math.max(0, 1 - ev.timer / def.fallTime));
        if (ev.timer >= def.fallTime) {
          ev.phase       = 'dormant';
          ev.timer       = 0;
          ev.dormantWait = 3 + Math.random() * 4;
          ev.type        = Math.random() < 0.4 ? 'supernova' : 'birth';
        }
      }
    });

    colAttr.needsUpdate = true;
    posAttr.needsUpdate = true;
  });

  return (
    // East of center: [60, -6, 18], tilted ~28° so it reads as a disc at an angle
    <group ref={groupRef} position={[60, -6, 18]} rotation={[0.5, 0.3, 0.1]}>

      {/* Nebula haze — large soft particles accumulate into a volumetric glow */}
      <points ref={nebulaRef} geometry={nebulaGeo}>
        <pointsMaterial
          map={nebulaTex}
          size={8}
          vertexColors
          transparent
          opacity={0.05}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Star particles */}
      <points geometry={geometry}>
        <pointsMaterial
          map={texture}
          size={0.28}
          vertexColors
          transparent
          opacity={0.32}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Galactic events — supernovas (white-blue) and star births (amber) */}
      <points geometry={eventsGeo}>
        <pointsMaterial
          map={texture}
          size={0.36}
          vertexColors
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

    </group>
  );
}
