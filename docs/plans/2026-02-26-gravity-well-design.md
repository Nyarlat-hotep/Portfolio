# Gravity Well — West Space Interactive POI

**Date:** 2026-02-26
**Location in scene:** [-60, 0, 20] — west side, directly opposite DistantGalaxy

---

## Overview

A physics toy occupying the west quadrant of the galaxy scene. An ambient colored particle field signals interactivity at a glance. Clicking plants gravity wells (black holes) that pull particles into spiraling vortices. Wells grow hungrier over time then auto-collapse in a burst — or the user can detonate early. Multiple competing wells create chaotic orbits. No goal, just satisfying cause-and-effect.

---

## Ambient Particle Field

- ~5000 particles scattered in a wide cloud at the west position
- Colors: warm ambers, teals, purples — distinct from the main galaxy's white stars
- Particles drift very faintly at rest (low idle velocity) so the region has visible life
- Each particle stores a home position; after all wells collapse particles drift back to rest

---

## Gravity Wells

### Planting
- Click anywhere in the west space to plant a well
- Uses raycaster + camera-facing plane projection (same technique as prior Nebula work)
- Max 5 simultaneous wells

### Visual
- Dark core sphere (small, ~0.3 units radius)
- Glowing accretion ring mesh (torus) with additive blending, colored per-well
- Pulsing halo glow that intensifies as strength ramps up
- Each well gets its own accent color (cycle through palette)

### Physics
- Pull strength ramps from 0 → max over ~8 seconds
- Per-frame: for each particle, sum gravitational force from all active wells
  - `F = strength / d²` (inverse square, capped at max force to avoid singularity at d≈0)
  - `velocity += F_direction * F_magnitude * dt`
  - Slight velocity damping per frame so particles spiral inward rather than overshooting
- Particles within a small capture radius of the well core stop updating (consumed)

### Collapse
- **Auto-collapse:** after ~15 seconds total lifetime, well self-destructs
- **Manual detonation:** clicking an existing well collapses it immediately
- On collapse:
  - Outward impulse applied to all particles within 2× well radius
  - Brief flash effect at collapse point (spike in ring emissive)
  - Well removed from active list

### Post-collapse
- Particles gradually drift back toward home positions (soft spring, slow)
- If another well is planted before they return, they get pulled again from wherever they are

---

## Files

| File | Role |
|------|------|
| `src/components/Galaxy/GravityField.jsx` | Main component — particle field + well management + physics loop |
| `src/components/Galaxy/Galaxy.jsx` | Add `<GravityField />` to scene |

No new data files needed. Self-contained component.

---

## Interaction Summary

| Action | Result |
|--------|--------|
| Click empty space | Plant gravity well |
| Watch | Particles spiral inward, well grows |
| Click existing well | Early detonation — burst outward |
| Wait ~15s | Auto-collapse — burst outward |
| Multiple wells | Particles compete between attractors |
| All wells gone | Particles drift back to rest |
