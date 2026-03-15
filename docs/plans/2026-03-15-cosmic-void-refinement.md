# Cosmic Void Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the CosmicVoid black hole feel like cosmic horror — biological, viscous, organic — with proper depth and surface texture across all three visual layers, and fix tentacles clipping through the accretion rings.

**Architecture:** All changes are self-contained in `CosmicVoid.jsx`. Four independent shader/geometry passes: (1) event horizon biological surface, (2) ring viscous depth, (3) tentacle organic surface, (4) tentacle/ring intersection clamp. No new files. No new components.

**Tech Stack:** React Three Fiber, Three.js, GLSL (inline shader strings), simplex noise (already in file as `glslNoise`)

---

## Reference: Key Geometry

The rings lie flat in the XZ plane (rotation `[PI/2, 0, 0]`):
- Inner ring: `TorusGeometry(5.2, 0.3, 8, 64)`
- Main disk: `TorusGeometry(7, 0.35, 16, 64)`
- Outer ring: `TorusGeometry(9, 0.25, 8, 64)`

Tentacles:
- 6 total, emerge from event horizon surface at radius `4.2`
- Length `9.0–12.0` units, writhing amplitude `2.5–3.5` units
- `TENT_Y_OFFSETS = [0.15, -0.20, 0.30, -0.10, 0.20, -0.25]` — currently too flat

The `glslNoise` block (simplex 3D) is already defined at the top of the file and injected into shaders via template literals. Use `${glslNoise}` to access it in any new shader.

---

### Task 1: Fix Tentacle / Ring Intersection

**Files:**
- Modify: `src/components/Galaxy/CosmicVoid.jsx`

This is the cleanest task with no visual subjectivity — fix it first so later visual work is assessed correctly.

**Step 1: Update TENT_Y_OFFSETS**

Find this line (around line 333):
```js
const TENT_Y_OFFSETS = [0.15, -0.20, 0.30, -0.10, 0.20, -0.25];
```

Replace with:
```js
const TENT_Y_OFFSETS = [0.85, -0.85, 1.0, -1.0, 0.75, -0.75];
```

This gives alternating above/below emergence. After normalization with horizontal components ~√2, tentacles emerge at y ≈ ±2 units — above/below all ring geometry (ring plane is y=0).

**Step 2: Add ring exclusion clamp to updateVoidTent**

In `updateVoidTent`, after the spine positions loop (after the block ending with `_cvSp[s].set(...)`), add a ring exclusion pass. Find the comment `// ── 2. Tangents` and insert before it:

```js
  // ── 1b. Ring exclusion — push spine points out of ring annulus ────────────
  const RING_INNER = 3.5;
  const RING_OUTER = 10.0;
  const RING_Y_CLEAR = 1.5;
  for (let s = 1; s < CV_SEGS; s++) {
    const xzDist = Math.sqrt(_cvSp[s].x * _cvSp[s].x + _cvSp[s].z * _cvSp[s].z);
    if (xzDist > RING_INNER && xzDist < RING_OUTER && Math.abs(_cvSp[s].y) < RING_Y_CLEAR) {
      _cvSp[s].y = _cvSp[s].y >= 0 ? RING_Y_CLEAR : -RING_Y_CLEAR;
    }
  }
```

**Step 3: Visual check**

Run `npm run dev`. Orbit around the black hole and verify:
- No tentacle visibly passes through any of the three rings from any angle
- Tentacles still move fluidly — the clamp should be rarely triggered given the new Y offsets

**Step 4: Commit**
```bash
git add src/components/Galaxy/CosmicVoid.jsx
git commit -m "fix: tentacles no longer intersect accretion rings"
```

---

### Task 2: Event Horizon — Biological Surface Shader

**Files:**
- Modify: `src/components/Galaxy/CosmicVoid.jsx`

Replace the `meshBasicMaterial` black sphere with a shader that generates a veined biological surface.

**Step 1: Add the horizon biological shader strings**

Add two new shader constants after the existing `tentacleFragmentShader` block (around line 185), before the geometry constants section:

```js
// ============================================================
// Event Horizon — Biological Surface Shaders
// ============================================================
const horizonVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  uniform float uTime;

  ${glslNoise}

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    // Subtle organic pulsing displacement
    float pulse = snoise(vec3(position.x * 1.2, position.y * 1.2 + uTime * 0.08, position.z * 1.2)) * 0.12;
    vec3 displaced = position + normal * pulse;
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const horizonFragmentShader = `
  uniform float uTime;
  uniform float uHover;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  ${glslNoise}

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

    // Layered vein noise — branching pattern
    float v1 = snoise(vec3(vUv.x * 12.0, vUv.y * 12.0, uTime * 0.04));
    float v2 = snoise(vec3(vUv.x * 28.0 + 4.0, vUv.y * 28.0, uTime * 0.06 + 2.0));
    float v3 = snoise(vec3(vUv.x * 6.0,  vUv.y * 6.0,  uTime * 0.02 + 5.0));

    // Sharp vein lines from the noise gradient
    float veins = abs(v1) * 0.5 + abs(v2) * 0.3 + abs(v3) * 0.2;
    veins = 1.0 - smoothstep(0.0, 0.25, veins);

    // Slow irregular pulse (compound sine)
    float pulse = sin(uTime * 0.4) * 0.5 + sin(uTime * 0.17 + 1.3) * 0.3 + 0.5;

    // Deep subsurface color — dark flesh
    vec3 subsurface = vec3(0.28, 0.02, 0.06) * pulse * 0.6;
    vec3 veinColor  = vec3(0.08, 0.0,  0.02);
    vec3 rimColor   = vec3(0.55 + uHover * 0.3, 0.05, 0.12 + uHover * 0.1);

    vec3 color = mix(veinColor, subsurface, veins * 0.7);
    // Rim glow — ragged membrane edge
    color += rimColor * fresnel * (1.2 + uHover * 1.0) * (0.8 + veins * 0.4);

    // Surface stays very dark — just let rim and veins breathe
    color = clamp(color, 0.0, 1.0);

    // Alpha: opaque core, slight translucency at very edge
    float alpha = 1.0 - fresnel * 0.15;

    gl_FragColor = vec4(color, alpha);
  }
`;
```

**Step 2: Replace the event horizon mesh**

In `BlackHoleCore`, find the existing horizon mesh and rim mesh. The `eventHorizonRef` mesh currently uses `meshBasicMaterial`. Replace both the horizon mesh and the rim glow mesh with a single biological shader mesh:

Find:
```jsx
      <mesh ref={eventHorizonRef} geometry={horizonGeo}>
        <meshBasicMaterial color="#000000" />
      </mesh>

      <mesh geometry={rimGeo}>
        <shaderMaterial
          ref={rimGlowMaterial}
          ...
        />
      </mesh>
```

Replace with:
```jsx
      <mesh ref={eventHorizonRef} geometry={horizonGeo}>
        <shaderMaterial
          ref={rimGlowMaterial}
          uniforms={{
            uTime:  { value: 0 },
            uHover: { value: 0 },
          }}
          vertexShader={horizonVertexShader}
          fragmentShader={horizonFragmentShader}
          transparent
          side={THREE.FrontSide}
          depthWrite={true}
        />
      </mesh>
```

Note: `rimGeo` and its mesh are removed. The biological shader handles the rim effect internally via fresnel. Remove the `rimGeo` from the `useMemo` list and the `dispose` cleanup too.

**Step 3: Update the useFrame to drive uTime/uHover on the horizon material**

In the `useFrame` block of `BlackHoleCore`, find where `rimGlowMaterial.current.uniforms.uHover.value` is set and replace that block:

Find:
```js
    if (rimGlowMaterial.current) {
      rimGlowMaterial.current.uniforms.uHover.value = h;
    }
```

Replace with:
```js
    if (rimGlowMaterial.current) {
      rimGlowMaterial.current.uniforms.uTime.value  = time;
      rimGlowMaterial.current.uniforms.uHover.value = h;
    }
```

**Step 4: Remove rimGeo from memo and dispose**

Find and remove:
```js
  const rimGeo = useMemo(() => new THREE.SphereGeometry(4.3, 32, 32), []);
```

And remove `rimGeo.dispose()` from the cleanup effect, and remove `rimGeo` from the dependency array.

**Step 5: Visual check**

Run `npm run dev`. The event horizon should:
- Look dark and organic — veined surface visible, not plain black
- Have a red/crimson rim glow at the edges
- Pulse subtly and irregularly
- Brighten on hover

**Step 6: Commit**
```bash
git add src/components/Galaxy/CosmicVoid.jsx
git commit -m "feat: biological surface shader for event horizon"
```

---

### Task 3: Rings — Viscous Physical Depth

**Files:**
- Modify: `src/components/Galaxy/CosmicVoid.jsx`

Upgrade `ringFragmentShader` and slightly thicken the main disk.

**Step 1: Replace ringFragmentShader**

Find the existing `ringFragmentShader` constant and replace it entirely:

```js
const ringFragmentShader = `
  uniform float uTime;
  uniform float uHover;
  uniform vec3  uColorHot;
  uniform vec3  uColorMid;
  uniform vec3  uColorCool;
  uniform float uFlowSpeed;

  varying vec2 vUv;

  ${glslNoise}

  void main() {
    float angle = vUv.x;
    float side  = vUv.y;

    // Distance from equator (0 = edge, 1 = center)
    float equator = 1.0 - abs(side - 0.5) * 2.0;
    float equatorSharp = pow(equator, 2.0);

    float flowAngle = angle - uTime * uFlowSpeed;

    // Tighter, more turbulent noise for liquid feel
    float n1 = snoise(vec3(flowAngle * 14.0,  side * 8.0,  uTime * 0.3));
    float n2 = snoise(vec3(flowAngle * 32.0,  side * 16.0, uTime * 0.45 + 5.0));
    float n3 = snoise(vec3(flowAngle * 70.0,  side * 30.0, uTime * 0.2  + 10.0));
    float turb = n1 * 0.50 + n2 * 0.33 + n3 * 0.17;
    turb = turb * 0.5 + 0.5;

    // Hotspot — intense consumption point
    float hotspot = smoothstep(0.65, 0.95, turb) * equatorSharp;

    // Base color — dark ichor
    vec3 col = mix(uColorCool, uColorMid, equatorSharp);
    col = mix(col, uColorHot, equatorSharp * turb * 1.2);
    col *= (0.4 + turb * 0.7);
    col = mix(col, uColorHot * 2.2, hotspot * 0.85);
    col *= (1.0 + uHover * 0.6);

    // Specular highlight — wet surface
    float spec = pow(hotspot, 3.0) * equatorSharp;
    col += vec3(1.0, 0.92, 0.8) * spec * (0.6 + uHover * 0.4);

    // Rim lighting — edges of the tube catch light (physical volume feel)
    float rim = pow(1.0 - equator, 4.0);
    col += uColorMid * rim * 0.4;

    // Edge fade with tighter falloff for crisper edge
    float edgeFade = smoothstep(0.0, 0.15, side) * smoothstep(1.0, 0.85, side);
    float alpha = edgeFade * (0.65 + turb * 0.25 + hotspot * 0.1);
    alpha = clamp(alpha, 0.0, 0.97);

    gl_FragColor = vec4(col, alpha);
  }
`;
```

**Step 2: Update ring color uniforms to ichor palette**

Find the main disk `shaderMaterial` uniforms (the one with `uColorHot: '#ffeebb'`) and update the three color values:

```js
            uColorHot:  { value: new THREE.Color('#ff8833') },
            uColorMid:  { value: new THREE.Color('#8a0a22') },
            uColorCool: { value: new THREE.Color('#1a0005') },
            uFlowSpeed: { value: 0.14 },
```

Find the inner ring uniforms (currently `uColorHot: '#ccddff'`) and update:

```js
            uColorHot:  { value: new THREE.Color('#ffbb66') },
            uColorMid:  { value: new THREE.Color('#6b1a3a') },
            uColorCool: { value: new THREE.Color('#0d0008') },
            uFlowSpeed: { value: 0.22 },
```

Find the outer ring uniforms (currently `uColorHot: '#44aa77'`) and update:

```js
            uColorHot:  { value: new THREE.Color('#cc4422') },
            uColorMid:  { value: new THREE.Color('#440a10') },
            uColorCool: { value: new THREE.Color('#080002') },
            uFlowSpeed: { value: 0.07 },
```

**Step 3: Thicken main disk slightly**

Find:
```js
  const diskGeo = useMemo(() => new THREE.TorusGeometry(7, 0.35, 16, 64), []);
```

Replace with:
```js
  const diskGeo = useMemo(() => new THREE.TorusGeometry(7, 0.55, 16, 64), []);
```

**Step 4: Visual check**

Run `npm run dev`. The rings should:
- Read as dark churning ichor/blood, not plasma light
- Show bright orange-white hotspots that suggest wet surfaces
- Edges of the torus tube should catch subtle rim light (showing volume)
- Main disk visibly thicker than before

**Step 5: Commit**
```bash
git add src/components/Galaxy/CosmicVoid.jsx
git commit -m "feat: viscous ichor ring shaders with physical depth"
```

---

### Task 4: Tentacles — Organic Surface Depth

**Files:**
- Modify: `src/components/Galaxy/CosmicVoid.jsx`

Upgrade `tentacleFragmentShader` for organic tissue feel.

**Step 1: Replace tentacleFragmentShader**

Find the existing `tentacleFragmentShader` and replace it entirely:

```js
const tentacleFragmentShader = `
  uniform float uTime;
  uniform float uIndex;
  uniform float uHover;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  ${glslNoise}

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.5);

    // Surface normal variation — bumpy organic texture
    float bump1 = snoise(vec3(vUv.x * 18.0 + uTime * 0.3, vUv.y * 10.0, uIndex * 4.0));
    float bump2 = snoise(vec3(vUv.x * 40.0 + uTime * 0.5, vUv.y * 22.0, uIndex * 7.0 + 2.0));
    float surface = bump1 * 0.6 + bump2 * 0.4;

    // Longitudinal ridges — tendon/muscle anatomy
    float ridgeFreq = 6.0 + uIndex * 0.5;
    float ridge = smoothstep(0.3, 0.7, sin(vUv.y * ridgeFreq * 3.14159) * 0.5 + 0.5);

    // Vein / internal structure
    float veinNoise = snoise(vec3(
      vUv.x * 12.0 + uTime * 0.4,
      vUv.y * 7.0,
      uIndex * 5.0
    ));
    float veinPattern = smoothstep(0.25, 0.55, veinNoise);

    // Pulse — slower, more visceral
    float pulse = sin(uTime * 0.9 + uIndex * 1.8 + vUv.x * 5.0) * 0.5 + 0.5;

    // Base flesh color — very dark
    vec3 baseColor = vec3(0.04, 0.01, 0.08);
    // Subsurface — dark crimson bleeds through thin areas
    vec3 subColor  = vec3(0.22, 0.01, 0.04) * (1.0 - vUv.x * 0.4);
    // Vein color — sickly amber/crimson instead of green
    vec3 veinColor = vec3(0.7, 0.18, 0.0) * veinPattern * pulse * (0.15 + uHover * 0.5);

    // Rim / fresnel — membrane edge, transmits subsurface color
    vec3 rimColor = vec3(0.45 + uHover * 0.3, 0.06, 0.15 + uHover * 0.1);

    // Compose
    vec3 color = mix(baseColor, subColor, fresnel * 0.7);
    color += ridge * vec3(0.06, 0.01, 0.03);              // ridges catch slight light
    color += surface * 0.04 * vec3(0.5, 0.1, 0.2);        // surface bump variation
    color += rimColor * fresnel * (0.8 + uHover * 0.9);
    color += veinColor;

    // Wet specular — small bright points at surface bumps
    float spec = pow(max(0.0, surface * 0.5 + 0.5), 12.0) * fresnel * 0.3;
    color += vec3(0.8, 0.5, 0.4) * spec;

    // Alpha — fade at tip, slight translucency at fresnel edges
    float alpha = (1.0 - smoothstep(0.80, 1.0, vUv.x)) * (1.0 - fresnel * 0.25);

    gl_FragColor = vec4(color, alpha);
  }
`;
```

**Step 2: Visual check**

Run `npm run dev`. The tentacles should:
- Show visible surface texture — bumpy, not smooth plastic
- Have subtle longitudinal ridges along their length
- Glow dark crimson/amber at their edges (not green)
- Subsurface crimson visible through thin areas (tips, edges)
- Remain dark overall — texture shows through light variation, not bright color

**Step 3: Commit**
```bash
git add src/components/Galaxy/CosmicVoid.jsx
git commit -m "feat: organic tissue surface shader for tentacles"
```

---

## Final Check

After all four tasks:
1. Orbit 360° around the CosmicVoid — no tentacle intersects any ring from any angle
2. Hover the black hole — all three layers respond and intensify
3. View from above/below — rings show physical volume, tentacles arc above/below cleanly
4. Confirm the overall read: dark, organic, cosmic horror — not sci-fi clean

---

## Notes for Implementer

- The `glslNoise` block is defined at line ~9 and injected via `${glslNoise}` in template literals. Every new shader already has access to `snoise(vec3)`.
- All geometry dispose/cleanup must be maintained. If removing `rimGeo`, also remove it from `useMemo` and the `useEffect` cleanup array.
- Do not change the `ringVertexShader` — it's a simple passthrough and is fine.
- Do not change `VoidParticles` — the ambient purple cloud is not part of this task.
