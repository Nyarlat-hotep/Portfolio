# Cosmic Void Refinement — Design Doc
_2026-03-15_

## Goal
Make the CosmicVoid (black hole) feel like cosmic horror rather than flat sci-fi. All three visual layers need more depth, texture, and physical presence. Tentacle arms must not intersect the accretion rings.

## Direction
Biological, organic, viscous. Not Interstellar-realistic, not clean sci-fi — unsettling flesh and ichor.

---

## 1. Event Horizon — Biological Surface

**Current state:** Plain black `meshBasicMaterial` sphere + thin fresnel rim glow.

**Changes:**
- Replace `meshBasicMaterial` with a GLSL shader that generates procedural vein patterns using layered simplex noise — dark branching structures over a deep crimson/purple subsurface base color, like the surface of a diseased eye.
- Add slow irregular pulsing — the sphere subtly contracts and expands (scale oscillation with compound sine, not regular).
- Rim/fresnel glow becomes heavier and more ragged — torn membrane aesthetic. Color shifts from clean purple toward dark blood-red at the edges.
- Subsurface-like translucency: slight glow from beneath the vein layer, as if something pulses inside.

---

## 2. Rings — Viscous / Physical Depth

**Current state:** Flat plasma shader with no specular, no sense of thickness or wetness.

**Changes:**
- Add specular highlights to the ring fragment shader — bright hot spots that suggest a wet/liquid surface reflecting internal light.
- Add rim lighting: edges of the torus tube catch more light than the face, showing real volume.
- Shift color palette: base color shifts to deep ichor (dark blood-red/black). Hot spots become bright orange-white where matter is being consumed most violently.
- Increase tube thickness slightly on the main disk to support the sense of physical volume.
- Turbulence parameters tightened to feel like churning liquid flow rather than gaseous plasma.

---

## 3. Tentacles — Organic Surface Depth

**Current state:** Smooth tubes with a simple vein/bioluminescence pattern, feels like plastic.

**Changes:**
- Add surface normal variation in the fragment shader via layered noise — bumpy, ridged surface that catches light unevenly.
- Shift vein color from bioluminescent green toward deep crimson/sickly amber — more flesh, less alien jellyfish.
- Stronger subsurface-like translucency at thin edges (tips, sides) — light should seem to pass through the thinnest parts.
- Heavier specular/fresnel on the surface — wet organic tissue look.
- Add longitudinal ridges using noise — anatomy-like, tendon/muscle feel.

---

## 4. Tentacle / Ring Intersection Fix

**Current state:** `TENT_Y_OFFSETS = [0.15, -0.20, 0.30, -0.10, 0.20, -0.25]` — nearly flat, tentacles pass through ring plane. Writhing amplitude 2.5–3.5 units compounds the problem.

**Changes — two-part fix:**

**Part 1 — Increase Y offsets:**
New offsets alternate strongly above/below: `[0.85, -0.85, 1.0, -1.0, 0.75, -0.75]`. After normalization with horizontal components ~√2, tentacles emerge at y ≈ ±2 units from center — above/below all ring geometry.

**Part 2 — Ring exclusion clamp in spine update:**
In `updateVoidTent`, after computing each spine point, check if the point falls within the ring annulus zone (XZ radius between 3.5 and 10.0, |y| < 1.5). If so, push the Y coordinate away from 0 to ±1.5. This makes tentacles visually curve around the rings rather than clip through, even under heavy writhing.

---

## Files Changed
- `src/components/Galaxy/CosmicVoid.jsx` — all changes are self-contained here

## No New Files
All shader code lives inline in CosmicVoid.jsx as it does today.
