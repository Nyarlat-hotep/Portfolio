# Prismatic Sigil — Design Document

## Overview

A new interactive object in the Galaxy scene: a morphing faceted crystal eye that links to the sci-fi kaleidoscope project. Positioned as a discoverable off-to-the-side object, similar in size to a planet. Tooltip reads "Prismatic Sigil". Click opens the kaleidoscope in a new tab.

---

## Visual Design

### Mesh
- `THREE.IcosahedronGeometry` at detail level 2 — 80 triangular faces
- Faceted enough for a crystal/geometric read, not subdivided to near-sphere

### Vertex Shader (GPU morphing)
- Each vertex displaced along its normal by a sum of three sin/cos waves keyed on vertex position + time
- Three different frequencies produce complex, non-repeating organic movement
- Amplitude ~0.22 units — shape shifts noticeably without losing identity
- On hover: amplitude ramps up slightly

### Fragment Shader (warp surface pattern)
- Polar coordinates in local space
- Concentric rings distorted by sinusoidal angular warp: `angle + sin(r * 4 + t) * warpAmt`
- Color cycling through a teal → violet → cyan alien palette
- Fresnel-style rim glow — edges brighten outward into space
- On hover: warp amplitude and glow intensity increase

### Crystal Edges
- `EdgesGeometry` + thin `<Line>` overlay (pale cyan-white)
- Edge lines follow vertex morphing — facets visibly warp with the shape
- This is the key detail that sells "living crystal"

### Idle Behaviour
- Slow Y-axis rotation (~0.04 rad/s), matching planet rotation convention

---

## Interaction & Integration

### Position & Scale
- Position: `[25, 10, -18]` — right of and slightly above planet cluster
- Discoverable by orbiting; not immediately in frame at scene load
- Scale: `1.1` — mid-sized planet equivalent

### Click
- `window.open(kaleidoscopeUrl, '_blank')`
- Kaleidoscope URL: sci-fi-kaleidoscope gh-pages deployment

### Hover
- Tooltip label: **"Prismatic Sigil"**
- Uses existing `onHover` callback pattern (same as Planet)
- Hover state increases morph speed and glow intensity

### Component
- New file: `src/components/Galaxy/KaleidoscopeEye.jsx`
- Added to Galaxy.jsx Canvas scene directly (no Suspense — no textures)
- No new state in Galaxy.jsx
- Click handler inline (simple `window.open`, no callback needed)

---

## Architecture Notes

- Full custom `ShaderMaterial` — same pattern as CosmicVoid
- Vertex displacement on GPU — zero CPU buffer update overhead
- `EdgesGeometry` recomputed once on mount from the base geometry; edge Lines use the same morphed positions visually (Lines are a separate static mesh — they don't follow vertex displacement, but the overall read still works)
- Hover state tracked via `useRef` + `onPointerEnter` / `onPointerLeave`, lerped in `useFrame`
