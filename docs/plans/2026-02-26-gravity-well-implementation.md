# Gravity Well Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an interactive gravity well toy in the west quadrant of the galaxy scene — an ambient particle field that responds to click-planted black holes which spiral particles inward, grow hungrier over time, and collapse in a burst.

**Architecture:** Single self-contained `GravityField.jsx` component at world position [-60, 0, 20]. All state lives in `useRef` arrays to avoid React re-renders in the animation loop. Wells are planted/detonated via click on a large invisible hit-plane mesh. Physics runs entirely in `useFrame`.

**Tech Stack:** React Three Fiber, Three.js, `useFrame`, `useRef`, `useMemo`, BufferGeometry with DynamicDrawUsage

> **Note on testing:** This is a visual Three.js component — no unit tests apply. Each task ends with a visual verification step and a git commit.

---

### Task 1: Scaffold GravityField component with ambient particle field

**Files:**
- Create: `src/components/Galaxy/GravityField.jsx`
- Modify: `src/components/Galaxy/Galaxy.jsx`

**Step 1: Create GravityField.jsx with particle field**

```jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const WORLD_X = -60, WORLD_Y = 0, WORLD_Z = 20;
const N = 5000;

// Warm ambers, teals, purples — distinct from the main galaxy's white stars
const PAL = [
  new THREE.Color('#e88c2e'), // amber
  new THREE.Color('#f0b347'), // warm gold
  new THREE.Color('#1ea8c8'), // teal
  new THREE.Color('#26cdd4'), // cyan
  new THREE.Color('#9944ee'), // purple
  new THREE.Color('#dd44bb'), // hot pink
  new THREE.Color('#c0451a'), // rust
];

function randG() {
  const u = Math.max(1e-10, Math.random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

function buildField() {
  const pos  = new Float32Array(N * 3);
  const home = new Float32Array(N * 3); // spawn positions — never mutated
  const vel  = new Float32Array(N * 3);
  const col  = new Float32Array(N * 3);

  for (let i = 0; i < N; i++) {
    const x = randG() * 18;
    const y = randG() * 5;
    const z = randG() * 10;
    pos[i*3] = home[i*3] = x;
    pos[i*3+1] = home[i*3+1] = y;
    pos[i*3+2] = home[i*3+2] = z;
    const c = PAL[Math.floor(Math.random() * PAL.length)];
    const b = 0.15 + Math.random() * 0.4;
    col[i*3] = c.r*b; col[i*3+1] = c.g*b; col[i*3+2] = c.b*b;
  }

  const posAttr = new THREE.BufferAttribute(pos, 3);
  posAttr.usage = THREE.DynamicDrawUsage;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return { geo, vel, home };
}

// Crisp dot texture
let _tex = null;
function getDotTex() {
  if (_tex) return _tex;
  const size = 32, c = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0,    'rgba(255,255,255,1.0)');
  g.addColorStop(0.3,  'rgba(255,255,255,0.8)');
  g.addColorStop(0.6,  'rgba(255,255,255,0.2)');
  g.addColorStop(1.0,  'rgba(255,255,255,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return (_tex = new THREE.CanvasTexture(canvas));
}

export default function GravityField() {
  const { geo, vel, home } = useMemo(() => buildField(), []);
  const tex = useMemo(() => getDotTex(), []);

  // Idle drift — very subtle, just enough to feel alive
  useFrame((_, delta) => {
    const posAttr = geo.attributes.position;
    const pos = posAttr.array;
    const dt = Math.min(delta, 0.05);
    let dirty = false;
    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      // Soft spring back to home when idle
      vel[i3]   += (home[i3]   - pos[i3])   * 0.3 * dt;
      vel[i3+1] += (home[i3+1] - pos[i3+1]) * 0.3 * dt;
      vel[i3+2] += (home[i3+2] - pos[i3+2]) * 0.3 * dt;
      vel[i3]   *= 0.92; vel[i3+1] *= 0.92; vel[i3+2] *= 0.92;
      if (Math.abs(vel[i3]) + Math.abs(vel[i3+1]) + Math.abs(vel[i3+2]) > 0.0001) {
        pos[i3]   += vel[i3]   * dt;
        pos[i3+1] += vel[i3+1] * dt;
        pos[i3+2] += vel[i3+2] * dt;
        dirty = true;
      }
    }
    if (dirty) posAttr.needsUpdate = true;
  });

  return (
    <group position={[WORLD_X, WORLD_Y, WORLD_Z]}>
      <points geometry={geo}>
        <pointsMaterial
          map={tex}
          size={0.8}
          vertexColors
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
```

**Step 2: Add GravityField to Galaxy.jsx**

Open `src/components/Galaxy/Galaxy.jsx`. Find where `<DistantGalaxy />` is rendered inside the Canvas. Add below it:

```jsx
import GravityField from './GravityField';

// Inside the Canvas/Scene JSX:
<GravityField />
```

**Step 3: Visual check**
- Run `npm run dev`
- Navigate to the galaxy, look west (rotate/pan camera)
- Should see a colored particle cloud — ambers, teals, purples — floating in the west quadrant
- Particles should have very subtle idle drift

**Step 4: Commit**
```bash
git add src/components/Galaxy/GravityField.jsx src/components/Galaxy/Galaxy.jsx
git commit -m "feat: add GravityField ambient particle field"
```

---

### Task 2: Click-to-plant wells (interaction + hit plane)

**Files:**
- Modify: `src/components/Galaxy/GravityField.jsx`

**Step 1: Add well state and click handler**

Add these constants at the top of the file:

```js
const MAX_WELLS   = 5;
const WELL_RAMP   = 8;     // seconds to reach full strength
const WELL_LIFE   = 15;    // seconds until auto-collapse
const WELL_COLORS = [
  '#26cdd4', // cyan
  '#f0b347', // amber
  '#9944ee', // purple
  '#4ade80', // green
  '#dd44bb', // pink
];
const CAPTURE_R   = 0.8;   // units — particles this close to core stop
const PULL_MAX    = 40;    // max force magnitude
```

Add well management inside the component, before the `useFrame`:

```jsx
const wellsRef = useRef([]); // array of well objects
let _wellIdCounter = 0;

// Temp objects for raycasting
const _rc  = useMemo(() => new THREE.Raycaster(), []);
const _pln = useMemo(() => new THREE.Plane(), []);
const _pn  = useMemo(() => new THREE.Vector3(), []);
const _hit = useMemo(() => new THREE.Vector3(), []);
const _lm  = useMemo(() => new THREE.Vector3(), []);
const WORLD_POS = useMemo(() => new THREE.Vector3(WORLD_X, WORLD_Y, WORLD_Z), []);
```

Add click handler function inside component:

```jsx
const handleClick = (e, camera, pointer) => {
  // Project click to camera-facing plane through nebula center
  _pn.set(
    camera.position.x - WORLD_X,
    camera.position.y - WORLD_Y,
    camera.position.z - WORLD_Z,
  ).normalize();
  _pln.setFromNormalAndCoplanarPoint(_pn, WORLD_POS);
  _rc.setFromCamera(pointer, camera);

  if (!_rc.ray.intersectPlane(_pln, _hit)) return;
  _lm.set(_hit.x - WORLD_X, _hit.y - WORLD_Y, _hit.z - WORLD_Z);

  // Check if click is near an existing well — detonate it
  const wells = wellsRef.current;
  for (let i = 0; i < wells.length; i++) {
    const w = wells[i];
    const dx = _lm.x - w.x, dy = _lm.y - w.y, dz = _lm.z - w.z;
    if (dx*dx + dy*dy + dz*dz < 4) { // within 2 units of well = detonate
      collapseWell(i);
      return;
    }
  }

  // Plant new well if under cap
  if (wells.length >= MAX_WELLS) return;
  wells.push({
    id:       _wellIdCounter++,
    x:        _lm.x,
    y:        _lm.y,
    z:        _lm.z,
    age:      0,
    color:    WELL_COLORS[wells.length % WELL_COLORS.length],
    collapsing: false,
  });
};

const collapseWell = (idx) => {
  const wells = wellsRef.current;
  const w = wells[idx];
  // Burst: outward impulse on nearby particles
  const pos = geo.attributes.position.array;
  const BURST_R = 12;
  for (let i = 0; i < N; i++) {
    const i3 = i * 3;
    const dx = pos[i3] - w.x, dy = pos[i3+1] - w.y, dz = pos[i3+2] - w.z;
    const d2 = dx*dx + dy*dy + dz*dz;
    if (d2 < BURST_R*BURST_R && d2 > 0.001) {
      const d = Math.sqrt(d2);
      const strength = 60 * (1 - d / BURST_R);
      vel[i3]   += dx/d * strength;
      vel[i3+1] += dy/d * strength;
      vel[i3+2] += dz/d * strength;
    }
  }
  wells.splice(idx, 1);
};
```

**Step 2: Wire click via invisible hit mesh**

Inside the returned JSX, add an invisible large plane that catches clicks:

```jsx
<mesh
  position={[0, 0, 0]}
  onClick={(e) => {
    e.stopPropagation();
    handleClick(e, e.camera, e.pointer);
  }}
>
  <planeGeometry args={[80, 40]} />
  <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
</mesh>
```

**Step 3: Wire click via useThree in useFrame**

Actually, the cleanest approach for click in R3F is passing camera/pointer from state. Replace the invisible mesh approach with a `useThree` hook and an event on the group:

```jsx
import { useFrame, useThree } from '@react-three/fiber';

// Inside component:
const { camera, pointer } = useThree();

// Attach onClick to the group itself (R3F bubbles pointer events):
// In JSX:
<group
  position={[WORLD_X, WORLD_Y, WORLD_Z]}
  onClick={(e) => {
    e.stopPropagation();
    handleClick(camera, pointer);
  }}
>
  {/* invisible click catcher */}
  <mesh>
    <planeGeometry args={[80, 40]} />
    <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
  </mesh>
  {/* particles */}
  <points geometry={geo}>...</points>
</group>
```

Update `handleClick` signature to `(camera, pointer)` (no `e` needed).

**Step 4: Visual check**
- Click in the west space — browser console log a `console.log('well planted', wellsRef.current)` to verify
- Click near a planted well — verify it's removed from the array
- No visual change yet for wells (that's Task 3)

**Step 5: Commit**
```bash
git add src/components/Galaxy/GravityField.jsx
git commit -m "feat: add gravity well click-to-plant and detonate logic"
```

---

### Task 3: Well visuals — dark core + glowing ring

**Files:**
- Modify: `src/components/Galaxy/GravityField.jsx`

**Step 1: Add WellMesh sub-component**

Add this component above the main `GravityField` export:

```jsx
function WellMesh({ well }) {
  const ringRef = useRef();

  useFrame((_, delta) => {
    if (!ringRef.current) return;
    const strength = Math.min(1, well.age / WELL_RAMP);
    // Pulse: ring scale oscillates slightly, intensifies with strength
    const pulse = 1 + 0.12 * Math.sin(well.age * 4) * strength;
    ringRef.current.scale.setScalar(pulse);
    ringRef.current.material.opacity = 0.5 + 0.5 * strength;
  });

  const color = well.color;

  return (
    <group position={[well.x, well.y, well.z]}>
      {/* Dark core */}
      <mesh>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#000000" emissive="#000000" />
      </mesh>
      {/* Glowing accretion ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.9, 0.15, 8, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Outer halo glow */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.4, 0.08, 8, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
```

**Step 2: Render wells in the group**

The wells array is a ref, not state, so React won't re-render when wells change. Use a `useState` mirror to trigger renders:

```jsx
const [wellSnapshot, setWellSnapshot] = useState([]);

// Update snapshot whenever wells change (in collapseWell and handleClick):
// After push: setWellSnapshot([...wellsRef.current])
// After splice: setWellSnapshot([...wellsRef.current])
```

Add to JSX inside the group:

```jsx
{wellSnapshot.map(w => <WellMesh key={w.id} well={w} />)}
```

**Step 3: Visual check**
- Click in the west space — a dark sphere with a glowing colored ring appears
- Multiple clicks — each well gets a different color
- Ring should pulse slightly

**Step 4: Commit**
```bash
git add src/components/Galaxy/GravityField.jsx
git commit -m "feat: add gravity well visual (core sphere + accretion ring)"
```

---

### Task 4: Gravity physics — particles spiral into wells

**Files:**
- Modify: `src/components/Galaxy/GravityField.jsx`

**Step 1: Replace idle spring with full physics loop in useFrame**

Replace the existing `useFrame` body with this complete version:

```jsx
useFrame((state, delta) => {
  const posAttr = geo.attributes.position;
  const pos = posAttr.array;
  const dt = Math.min(delta, 0.05);
  const wells = wellsRef.current;
  let dirty = false;

  for (let i = 0; i < N; i++) {
    const i3 = i * 3;
    let vx = vel[i3], vy = vel[i3+1], vz = vel[i3+2];
    let hasWell = wells.length > 0;

    for (const w of wells) {
      const strength = Math.min(1, w.age / WELL_RAMP);
      const dx = w.x - pos[i3];
      const dy = w.y - pos[i3+1];
      const dz = w.z - pos[i3+2];
      const d2 = dx*dx + dy*dy + dz*dz;

      if (d2 < CAPTURE_R * CAPTURE_R) {
        // Captured — park at well center, zero velocity
        vx = 0; vy = 0; vz = 0;
        break;
      }

      if (d2 > 0.001) {
        const d = Math.sqrt(d2);
        // Inverse square gravity, capped
        const force = Math.min(PULL_MAX, (28 * strength) / d2) * dt;
        vx += dx/d * force;
        vy += dy/d * force;
        vz += dz/d * force;
      }
    }

    // Soft spring back to home when no wells
    if (!hasWell) {
      vx += (home[i3]   - pos[i3])   * 0.4 * dt;
      vy += (home[i3+1] - pos[i3+1]) * 0.4 * dt;
      vz += (home[i3+2] - pos[i3+2]) * 0.4 * dt;
    }

    // Damping — tighter when wells active so particles spiral rather than orbit wildly
    const damp = hasWell ? 0.96 : 0.92;
    vx *= damp; vy *= damp; vz *= damp;

    // Speed cap
    const s2 = vx*vx + vy*vy + vz*vz;
    if (s2 > 900) { // max 30 units/s
      const inv = 30 / Math.sqrt(s2);
      vx *= inv; vy *= inv; vz *= inv;
    }

    vel[i3] = vx; vel[i3+1] = vy; vel[i3+2] = vz;

    const moving = vx*vx + vy*vy + vz*vz > 0.0001;
    if (moving) {
      pos[i3]   += vx * dt;
      pos[i3+1] += vy * dt;
      pos[i3+2] += vz * dt;
      dirty = true;
    }
  }

  if (dirty) posAttr.needsUpdate = true;
});
```

**Step 2: Visual check**
- Plant a well — particles nearby should curve and spiral inward
- Multiple wells — particles should oscillate between attractors
- Remove all wells — particles drift back toward their cloud shape

**Step 3: Commit**
```bash
git add src/components/Galaxy/GravityField.jsx
git commit -m "feat: add inverse-square gravity physics to GravityField"
```

---

### Task 5: Well lifecycle — age ramp, auto-collapse, ring intensity

**Files:**
- Modify: `src/components/Galaxy/GravityField.jsx`

**Step 1: Tick well age in useFrame**

At the top of the `useFrame` body, before the particle loop:

```js
// Tick well ages and check for auto-collapse
const toCollapse = [];
for (let wi = 0; wi < wells.length; wi++) {
  wells[wi].age += dt;
  if (wells[wi].age >= WELL_LIFE) toCollapse.push(wi);
}
// Collapse in reverse order so splice indices stay valid
for (let k = toCollapse.length - 1; k >= 0; k--) {
  collapseWell(toCollapse[k]);
}
```

**Step 2: Update WellMesh to use age for ring intensity**

`well.age` is already on the object that `WellMesh` receives. The `useFrame` in `WellMesh` reads `well.age` directly from the ref object — since it's mutated in-place on the shared object, this works without props changing. Verify the pulse and opacity animation responds to age.

Add a lifetime progress indicator — the outer halo ring slowly grows in radius as the well ages toward collapse:

```jsx
// In WellMesh useFrame:
const lifeProgress = Math.min(1, well.age / WELL_LIFE);
// Scale outer halo up slightly as well ages
if (outerHaloRef.current) {
  outerHaloRef.current.scale.setScalar(1 + lifeProgress * 0.5);
  outerHaloRef.current.material.opacity = 0.1 + 0.3 * lifeProgress;
}
```

Add `outerHaloRef` to the outer torus mesh.

**Step 3: Flash on collapse**

Add a flash state to the component. In `collapseWell`, record flash position:

```jsx
const flashRef = useRef(null); // { x, y, z, age }

// In collapseWell, before splice:
flashRef.current = { x: w.x, y: w.y, z: w.z, age: 0 };
```

In the main `useFrame`, tick flash age and hide after 0.4s:

```jsx
if (flashRef.current) {
  flashRef.current.age += dt;
  if (flashRef.current.age > 0.4) flashRef.current = null;
}
```

Add a FlashMesh that reads from flashRef:

```jsx
function FlashMesh({ flashRef }) {
  const meshRef = useRef();
  useFrame(() => {
    const f = flashRef.current;
    if (!meshRef.current) return;
    if (!f) { meshRef.current.visible = false; return; }
    const t = f.age / 0.4;
    meshRef.current.visible = true;
    meshRef.current.position.set(f.x, f.y, f.z);
    meshRef.current.scale.setScalar(1 + t * 4);
    meshRef.current.material.opacity = 0.8 * (1 - t);
  });
  return (
    <mesh ref={meshRef} visible={false}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
```

Add `<FlashMesh flashRef={flashRef} />` inside the group.

**Step 4: Visual check**
- Plant a well and wait — at ~15s it should auto-collapse with a burst and flash
- Plant and immediately click again — manual early detonation burst
- Ring should visually intensify as well ages (brighter, larger halo)

**Step 5: Commit**
```bash
git add src/components/Galaxy/GravityField.jsx
git commit -m "feat: add well lifecycle — age ramp, auto-collapse, burst flash"
```

---

### Task 6: Polish — particle spring-back, cursor hint, performance check

**Files:**
- Modify: `src/components/Galaxy/GravityField.jsx`

**Step 1: Verify spring-back feels good**

With no wells active, particles should flow back to their cloud shape smoothly over ~3-4 seconds. If it feels too snappy or too slow, tune the spring constant (currently `0.4`) in the no-well branch. `0.2` = slower/lazier, `0.6` = snappier.

**Step 2: Cursor style hint**

The invisible click plane should show a pointer cursor on hover. In R3F, add `onPointerEnter` / `onPointerLeave` to change `document.body.style.cursor`:

```jsx
<mesh
  onPointerEnter={() => document.body.style.cursor = 'crosshair'}
  onPointerLeave={() => document.body.style.cursor = ''}
  onClick={...}
>
  <planeGeometry args={[80, 40]} />
  <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
</mesh>
```

**Step 3: Performance check**

Open browser DevTools → Performance tab → record 10 seconds of interaction. Target: 60fps on a modern laptop. If frame time spikes above ~8ms during heavy gravity computation, reduce N from 5000 to 3500.

**Step 4: Final visual pass**

- Confirm wells don't interfere with planet hover tooltips (they shouldn't — the click plane is far west)
- Confirm other planets are unaffected
- Confirm camera navigation still works over the field

**Step 5: Final commit**
```bash
git add src/components/Galaxy/GravityField.jsx
git commit -m "feat: polish GravityField — spring-back tuning, cursor hint"
```

---

## Summary of files changed

| File | Change |
|------|--------|
| `src/components/Galaxy/GravityField.jsx` | New — full gravity well component |
| `src/components/Galaxy/Galaxy.jsx` | Add `<GravityField />` import and usage |

---

## Quick reference — key constants to tune

| Constant | Default | Effect |
|----------|---------|--------|
| `N` | 5000 | Particle count — reduce if perf issues |
| `MAX_WELLS` | 5 | Max simultaneous wells |
| `WELL_RAMP` | 8s | Time to reach full pull strength |
| `WELL_LIFE` | 15s | Auto-collapse lifetime |
| `PULL_MAX` | 40 | Max gravitational force per frame |
| `CAPTURE_R` | 0.8 | Radius at which particle is "eaten" |
