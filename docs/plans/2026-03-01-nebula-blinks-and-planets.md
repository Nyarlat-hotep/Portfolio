# Nebula Blinks + Planets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add randomly blinking colored stars to the nebula for ambient dynamism, and add 5 small textured planets that orbit, get pulled into the black hole, and spaghettify before being destroyed.

**Architecture:** Two independent additions to the GravityField system. Blink stars are a second `<points>` geometry inside `GravityField.jsx` with a DynamicDrawUsage color attribute updated each frame. Planets are a new `<PlanetField>` component (own file) that receives `wellSnapshot` as a prop and manages all planet state internally via refs and `useFrame`.

**Tech Stack:** React Three Fiber, Three.js, R3F `useLoader` for texture loading.

---

### Task 1: Blink Stars

**Files:**
- Modify: `src/components/Galaxy/GravityField.jsx`

**Step 1: Add the blink palette and `buildBlinks()` function**

Add these constants and function directly below the existing `PAL` constant (around line 27):

```js
const BLINK_PAL = [
  new THREE.Color('#ffdd33'), // yellow
  new THREE.Color('#ff3322'), // red
  new THREE.Color('#33ff66'), // green
  new THREE.Color('#ff8800'), // orange
  new THREE.Color('#ffffff'), // white
  new THREE.Color('#ff44bb'), // pink
  new THREE.Color('#88ff00'), // lime
  new THREE.Color('#ff6600'), // amber
];

function buildBlinks() {
  const COUNT = 250;
  const pos  = new Float32Array(COUNT * 3);
  const col  = new Float32Array(COUNT * 3); // starts all black
  const meta = [];

  for (let i = 0; i < COUNT; i++) {
    pos[i*3]   = randG() * 22;
    pos[i*3+1] = randG() * 6;
    pos[i*3+2] = randG() * 12;

    const c    = BLINK_PAL[Math.floor(Math.random() * BLINK_PAL.length)];
    const peak = 0.25 + Math.random() * 0.2; // 25–45% brightness at peak

    meta.push({
      period: 1 + Math.random() * 3, // blink cycle length in seconds
      phase:  Math.random() * Math.PI * 2,
      peakR:  c.r * peak,
      peakG:  c.g * peak,
      peakB:  c.b * peak,
    });
  }

  const colAttr = new THREE.BufferAttribute(col, 3);
  colAttr.usage = THREE.DynamicDrawUsage;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', colAttr);
  return { geo, meta };
}
```

**Step 2: Wire `buildBlinks` into the GravityField component**

Inside `GravityField()`, add after the existing `useMemo` calls:

```js
const { geo: blinkGeo, meta: blinkMeta } = useMemo(() => buildBlinks(), []);
const blinkTimeRef = useRef(0);
```

**Step 3: Add blink update to `useFrame`**

At the end of the existing `useFrame` body, just before the closing `}`), add:

```js
// Blink stars — update color attribute each frame
blinkTimeRef.current += dt;
const blinkArr = blinkGeo.attributes.color.array;
for (let i = 0; i < blinkMeta.length; i++) {
  const m  = blinkMeta[i];
  const br = Math.max(0, Math.sin((blinkTimeRef.current / m.period) * Math.PI * 2 + m.phase));
  const i3 = i * 3;
  blinkArr[i3]   = m.peakR * br;
  blinkArr[i3+1] = m.peakG * br;
  blinkArr[i3+2] = m.peakB * br;
}
blinkGeo.attributes.color.needsUpdate = true;
```

**Step 4: Add blink geometry disposal in cleanup**

In the cleanup `useEffect`, add `blinkGeo.dispose();` alongside the existing `geo.dispose()` call. Update the dependency array to include `blinkGeo`:

```js
useEffect(() => () => {
  geo.dispose();
  hazeGeo.dispose();
  blinkGeo.dispose();
  // ... existing texture disposals
}, [geo, hazeGeo, blinkGeo]);
```

**Step 5: Render the blink stars in JSX**

Inside the `<group>` return, add after the haze `<points>` block:

```jsx
{/* Blink stars — periodic chromatic flashes */}
<points geometry={blinkGeo}>
  <pointsMaterial
    size={0.4}
    vertexColors
    transparent
    opacity={1}
    depthWrite={false}
    blending={THREE.AdditiveBlending}
    sizeAttenuation
  />
</points>
```

**Step 6: Build and verify**

```bash
cd /Users/taylorcornelius/Desktop/portfolio && npm run build 2>&1 | tail -5
```

Expected: `✓ built in` with no errors.

Run `npm run dev` and visually confirm random colored points blink in and out across the nebula at different rates and colors (greens, reds, yellows, etc.).

**Step 7: Commit**

```bash
git add src/components/Galaxy/GravityField.jsx
git commit -m "add blink stars: 250 chromatic points with random sine-wave flicker

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: PlanetField Component

**Files:**
- Create: `src/components/Galaxy/PlanetField.jsx`

**Step 1: Create the file with full implementation**

Create `src/components/Galaxy/PlanetField.jsx` with this complete content:

```jsx
import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

const PLANET_PULL  = 22;   // gravity strength (gentler than particles)
const PLANET_DAMP  = 0.97; // velocity damping while gravity active
const PLANET_MAX_V = 15;   // velocity cap
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
      mesh.position.set(...config.home);
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

    // Gravity from active wells
    const gravityActive = wells.some(w => w.age < GRAVITY_DUR);
    let nearWell = null, nearDist = Infinity;

    for (const w of wells) {
      if (w.age >= GRAVITY_DUR) continue;
      const dx = w.x - px, dy = w.y - py, dz = w.z - pz;
      const d  = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (d < nearDist) { nearDist = d; nearWell = w; }
      if (d < 0.1) continue;
      const strength = Math.min(1, w.age / 1.5);
      const force    = Math.min(60, (PLANET_PULL * strength) / d) * dt;
      s.vel.x += (dx / d) * force;
      s.vel.y += (dy / d) * force;
      s.vel.z += (dz / d) * force;
    }

    s.vel.multiplyScalar(gravityActive ? PLANET_DAMP : 0.88);
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
      _toWell.set(nearWell.x - px, nearWell.y - py, nearWell.z - pz).normalize();
      _quat.setFromUnitVectors(_up, _toWell);
      mesh.quaternion.copy(_quat);
      mesh.scale.set(squish, stretch, squish);
    } else {
      // Normal: self-rotate and reset orientation
      s.selfRotAngle += config.rotSpeed * dt;
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
```

**Step 2: Build to verify no import/syntax errors**

```bash
cd /Users/taylorcornelius/Desktop/portfolio && npm run build 2>&1 | tail -5
```

Expected: `✓ built in` with no errors. (PlanetField is not yet rendered — that's fine.)

**Step 3: Commit**

```bash
git add src/components/Galaxy/PlanetField.jsx
git commit -m "add PlanetField: 5 textured orbiting planets with spaghettification

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Wire PlanetField into GravityField

**Files:**
- Modify: `src/components/Galaxy/GravityField.jsx`

**Step 1: Import PlanetField**

Add at the top of `GravityField.jsx`, after the existing imports:

```js
import PlanetField from './PlanetField';
```

**Step 2: Render PlanetField inside the group**

Inside the `<group position={[WORLD_X, WORLD_Y, WORLD_Z]}>` return, add `<PlanetField>` just before the closing `</group>`:

```jsx
<PlanetField wells={wellSnapshot} />
```

**Step 3: Build and verify**

```bash
cd /Users/taylorcornelius/Desktop/portfolio && npm run build 2>&1 | tail -5
```

Expected: `✓ built in` with no errors.

Run `npm run dev` and verify:
- 5 small textured planet spheres are visible in the nebula, slowly orbiting
- Clicking to plant a black hole pulls them inward
- As they get close, they visibly stretch/elongate toward the hole
- They disappear on capture
- Clicking again to remove the well makes them fade back in at their home positions

**Step 4: Commit**

```bash
git add src/components/Galaxy/GravityField.jsx
git commit -m "wire PlanetField into GravityField — planets visible in nebula

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
