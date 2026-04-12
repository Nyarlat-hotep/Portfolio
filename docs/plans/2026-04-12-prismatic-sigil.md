# Prismatic Sigil Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a morphing faceted crystal eye ("Prismatic Sigil") to the Galaxy scene that links to the sci-fi kaleidoscope project when clicked.

**Architecture:** A single new R3F component (`KaleidoscopeEye.jsx`) using a full custom `ShaderMaterial` — vertex shader displaces icosahedron vertices on the GPU for organic morphing; fragment shader renders a polar warp + color-cycling surface pattern. A `lineSegments` overlay with `EdgesGeometry` draws the crystal facet edges. Wired into Galaxy.jsx as a standalone scene object, no new state.

**Tech Stack:** React Three Fiber, Three.js, GLSL shaders, `@react-three/drei` (unused here — plain R3F primitives only)

---

## Task 1: Create `KaleidoscopeEye.jsx`

**Files:**
- Create: `src/components/Galaxy/KaleidoscopeEye.jsx`

**Step 1: Create the file with vertex + fragment shaders and full component**

```jsx
// src/components/Galaxy/KaleidoscopeEye.jsx
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const KALEIDOSCOPE_URL = 'https://nyarlat-hotep.github.io/sci-fi-kaleidoscope/'

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
    vNormal   = normalMatrix * normal;
    vBasePos  = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`

const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vBasePos;
  uniform float uTime;
  uniform float uGlow;

  void main() {
    vec2 p  = vBasePos.xy;
    float r = length(p);
    float a = atan(p.y, p.x);

    // Angular warp — polar rings twisted by a sinusoidal offset
    float warpA  = a + sin(r * 4.2 + uTime * 0.38) * uGlow * 1.4;
    float rings  = sin(r * 11.0 - uTime * 0.75 + warpA * 0.6) * 0.5 + 0.5;
    float ripple = sin(r * 22.0 - uTime * 1.1) * 0.15;
    float pattern = clamp(rings + ripple, 0.0, 1.0);

    // Teal → violet → cyan color palette
    vec3 teal   = vec3(0.00, 0.85, 0.90);
    vec3 violet = vec3(0.55, 0.10, 0.90);
    vec3 cyan   = vec3(0.00, 0.95, 0.85);
    float t    = sin(uTime * 0.14 + r * 1.8) * 0.5 + 0.5;
    vec3 color = mix(mix(teal, violet, pattern), cyan, t * 0.5);

    // Fresnel rim — brightens at glancing angles (eye-space normal.z approximation)
    float fresnel = pow(1.0 - abs(normalize(vNormal).z), 1.8);
    color += fresnel * vec3(0.3, 0.8, 1.0) * uGlow;

    float alpha = 0.82 + fresnel * 0.18;
    gl_FragColor = vec4(color * (0.7 + pattern * 0.3), alpha);
  }
`

export default function KaleidoscopeEye({ onHover }) {
  const meshRef  = useRef()
  const matRef   = useRef()
  const hoverRef = useRef(false)
  const glowRef  = useRef(0.5)

  const geo = useMemo(() => new THREE.IcosahedronGeometry(1.0, 2), [])

  const uniforms = useMemo(() => ({
    uTime:     { value: 0 },
    uMorphAmp: { value: 0.22 },
    uGlow:     { value: 0.5 },
  }), [])

  useFrame((_, delta) => {
    if (!matRef.current || !meshRef.current) return

    // Slow idle rotation
    meshRef.current.rotation.y += 0.04 * delta

    // Lerp glow toward hover target
    const targetGlow = hoverRef.current ? 1.0 : 0.5
    glowRef.current += (targetGlow - glowRef.current) * Math.min(1, delta * 3)

    const u = matRef.current.uniforms
    u.uTime.value     += delta
    u.uGlow.value      = glowRef.current
    u.uMorphAmp.value  = 0.18 + glowRef.current * 0.08
  })

  return (
    <group position={[25, 10, -18]}>
      {/* Morphing crystal body */}
      <mesh
        ref={meshRef}
        geometry={geo}
        onClick={() => window.open(KALEIDOSCOPE_URL, '_blank')}
        onPointerEnter={() => { hoverRef.current = true;  onHover?.('Prismatic Sigil') }}
        onPointerLeave={() => { hoverRef.current = false; onHover?.(null) }}
      >
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Crystal facet edge overlay — static EdgesGeometry on base icosahedron */}
      <lineSegments geometry={new THREE.EdgesGeometry(geo)}>
        <lineBasicMaterial color="#88eeff" transparent opacity={0.35} />
      </lineSegments>
    </group>
  )
}
```

**Step 2: Verify the file was created**

```bash
ls src/components/Galaxy/KaleidoscopeEye.jsx
```

Expected: file listed.

**Step 3: Commit**

```bash
git add src/components/Galaxy/KaleidoscopeEye.jsx
git commit -m "feat: add KaleidoscopeEye (Prismatic Sigil) component"
```

---

## Task 2: Wire into Galaxy.jsx

**Files:**
- Modify: `src/components/Galaxy/Galaxy.jsx`

The Galaxy.jsx file is large. Two surgical edits needed:

**Step 1: Add the import**

Find the block of lazy imports near the top of Galaxy.jsx (around line 26–32). Add `KaleidoscopeEye` as a regular (non-lazy) import alongside the other Galaxy component imports — it has no textures or heavy assets so Suspense is not needed.

Add after `import Monolith from './Monolith';` (around line 20):

```js
import KaleidoscopeEye from './KaleidoscopeEye'
```

**Step 2: Add to the Canvas scene**

Find where `<Monolith>` is rendered in the JSX (around line 666). Add `<KaleidoscopeEye>` directly after it:

```jsx
{/* Alien monolith — floating above planet cluster */}
<Monolith position={[2, 35, -3]} onOpen={() => setShowSnake(true)} />

{/* Prismatic Sigil — morphing crystal eye, links to kaleidoscope */}
<KaleidoscopeEye onHover={handleHover} />
```

**Step 3: Run dev server and verify visually**

```bash
npm run dev
```

Check:
- "Prismatic Sigil" appears in the scene at roughly [25, 10, -18] — visible by orbiting right/up from the planet cluster
- Shape slowly rotates and morphs
- Hover shows tooltip "Prismatic Sigil" and increases glow
- Click opens `https://nyarlat-hotep.github.io/sci-fi-kaleidoscope/` in a new tab
- No console errors (check for GLSL compile errors in particular)

**Step 4: Commit**

```bash
git add src/components/Galaxy/Galaxy.jsx
git commit -m "feat: add Prismatic Sigil to Galaxy scene"
```

---

## Task 3: Build check

**Step 1: Run production build**

```bash
npm run build
```

Expected: build completes with no errors. Warnings about unused vars are fine; GLSL errors or import errors are not.

**Step 2: Commit if any fixes were needed, then push when ready**

User controls when to push — do not push automatically.
