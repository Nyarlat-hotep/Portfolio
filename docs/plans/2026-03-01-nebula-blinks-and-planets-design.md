# Nebula Blinks + Planets Design

**Date:** 2026-03-01

## Overview

Two additive features for the GravityField nebula:
1. **Blink Stars** — random periodic color flashes scattered through the nebula for ambient dynamism
2. **Planets** — 5 small textured spheres that orbit, get gravitationally attracted to the black hole, and spaghettify before being destroyed; respawn when the well collapses

---

## Feature 1: Blink Stars

### What
A separate `<points>` geometry of ~250 stars randomly distributed through the nebula. Each blinks on/off independently using a sine wave, never reaching full opacity. Colors drawn from a wide chromatic palette distinct from the main particle cyan/purple.

### Palette
Greens, yellows, reds, oranges, warm whites — contrasting with the existing cyan/purple nebula particles.

### Behaviour
- Each star has a random: period (1–4s), phase offset, and peak brightness (25–45% of full white)
- Brightness driven by `(sin(time/period + phase) * 0.5 + 0.5) * peakBrightness`
- Color attribute updated via `DynamicDrawUsage` each frame

### Implementation
- New `buildBlinks()` function returns a BufferGeometry with position + color attributes
- Rendered as a second `<points>` inside `GravityField` alongside the existing particle cloud
- Separate `blinkMeta` array holds `{ period, phase, peakR, peakG, peakB }` per star
- Color recomputed each frame in the existing `useFrame` (or a small secondary pass)

---

## Feature 2: Planets

### What
5 small textured spheres (radius ~0.15 units) using existing textures from `public/textures/`. Each planet:
- Has a fixed home position in the nebula
- Slowly rotates on its own axis and revolves around its home center on the XZ plane
- Is affected by the black hole's gravity when one exists
- Spaghettifies as it nears the black hole
- Disappears on capture; reappears when the well collapses

### Textures Used
earth, mars, jupiter, neptune, venus (one per planet)

### Planet Config (per planet)
```js
{
  texture: 'earth',
  homePos: [x, y, z],         // fixed home position in local space
  orbitRadius: float,          // orbit circle radius around homePos
  orbitSpeed: float,           // radians/second revolution speed
  orbitPhase: float,           // initial orbit angle
  rotSpeed: float,             // self-rotation speed (radians/second)
}
```

### Gravity Behaviour
- Same inverse-linear force as particles: `force = (PLANET_PULL / d) * dt`
- `PLANET_PULL` constant lower than particles (~20) — planets move more deliberately
- Velocity accumulates each frame; damping ~0.97
- Planet position = orbit position + velocity displacement

### Spaghettification
- Activates when `d < SPAG_START` (≈ 8 units from well)
- Stretch factor: `s = 1 + ((1 - d / SPAG_START) ^ 2) * 6`
- Mesh scaled along radial vector toward well: elongated axis gets `s`, perpendicular axes get `1/sqrt(s)`
- Mesh `quaternion` rotated each frame to align stretch axis toward the well
- Disappears (scale → 0) when `d < CAPTURE_R` (≈ 2)

### Respawn
- On well collapse: planet position reset to home, velocity zeroed, opacity fades in over ~1.5s (same pattern as particle fade-back)
- `fadeIn` per-planet flag drives material opacity 0 → 1

### Implementation
- New `<PlanetField>` component in `src/components/Galaxy/PlanetField.jsx`
- Receives `wells` array as prop (snapshot from GravityField state)
- 5 `<mesh>` elements, each with `<sphereGeometry args={[0.15, 24, 24]}>` + `<meshStandardMaterial map={texture}>`
- All planet state (pos, vel, alive, fadeIn) held in refs, updated in `useFrame`
- Textures loaded via `useLoader(THREE.TextureLoader, ...)`
- Rendered inside `<GravityField>` group via prop-drilling of `wellSnapshot`

---

## Files Touched

| File | Change |
|------|--------|
| `src/components/Galaxy/GravityField.jsx` | Add `buildBlinks()`, blink render pass, import + render `<PlanetField>` |
| `src/components/Galaxy/PlanetField.jsx` | New file — planet meshes, gravity, spaghettification, respawn |

---

## Non-Goals
- No planet-to-planet gravity interaction
- No planet collision with particles
- No audio
- Planets do not appear in the constellation easter egg view
