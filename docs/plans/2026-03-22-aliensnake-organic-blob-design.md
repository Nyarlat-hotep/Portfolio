# AlienSnake Organic Blob Animation — Design Doc
**Date:** 2026-03-22

## Goal
Remove 3D shading/gradients from all entity caches, make all 10 player stages bigger with more unique shapes, and add an amoeba-like bezier blob animation to the player creature across all 10 stages.

## Changes in Scope

### 1. Remove Volumetric Shading
Strip the radial gradient passes (dark edge highlight, specular dot) from all four cache functions:
- `getCreatureCanvas` — remove gradient fills, keep glow strokes + drop shadow
- `getEnemyCanvas` — remove gradient fills, keep glow strokes + drop shadow + breathing
- `getCollectibleCanvas` — remove gradient fills, keep glow strokes
- `getObstacleCanvas` — remove gradient fills, keep glow strokes

The flat neon-on-black aesthetic is more consistent with the overall game tone. Drop shadows and enemy breathing remain.

### 2. Bezier Blob Animation System

**Cache redesign:** `getCreatureCanvas` no longer draws the shape. Instead it draws only a soft ambient glow circle (blurred arc, no stroke). This is blitted once per frame as the background halo.

**Per-frame blob draw:** Each frame, N anchor points are positioned around the entity center. Each anchor oscillates radially:
```
r_i(t) = baseR + amplitude × sin(t × speed + phase_i)
```
where `phase_i` is a random per-entity offset assigned at spawn. Anchors are connected by quadratic bezier curves using midpoint-as-control-point — producing a smooth closed organic outline.

**Blob is drawn with thin stroke only** (no fill, no shadowBlur) in the entity's glow color. Inner detail geometry is drawn on top with the same thin stroke.

**Per-era tuning:**
- Cellular (stages 1–3): high amplitude, few anchors — very wobbly, amoeba-like
- Crystalline (stages 4–7): medium amplitude, more anchors — still alive but more structured
- Apex (stages 8–10): low amplitude, many anchors — barely perceptible pulse, nearly geometric

**Oscillation speed:** ~0.0009 rad/ms for all stages. Same tempo across eras; amplitude difference makes cellular look frantic and apex barely breathing.

### 3. Per-Stage Specifics

| Stage | Era | r | Anchors | Amplitude | Inner details (thin stroke / fill) |
|-------|-----|---|---------|-----------|-------------------------------------|
| 1 | Cellular | 12 | 5 | 30% | center dot (fill) |
| 2 | Cellular | 16 | 5 | 28% | 3 dots in triangle (fill) |
| 3 | Cellular | 20 | 6 | 25% | inner ring |
| 4 | Crystalline | 25 | 6 | 20% | two triangles same dir + inner dot |
| 5 | Crystalline | 28 | 7 | 18% | pentagon + inner circle |
| 6 | Crystalline | 31 | 7 | 15% | hexagon + inverted triangle |
| 7 | Crystalline | 34 | 8 | 13% | two overlapping squares (octagram) |
| 8 | Apex | 37 | 8 | 10% | 6-star + center dot |
| 9 | Apex | 40 | 10 | 7% | 6-star + octagon |
| 10 | Apex | 43 | 12 | 5% | 6-star + octagon + inner circle + 12 ticks |

### 4. Inner Layer Counter-Rotation
Preserved and updated to match new radii and inner detail shapes per era (same logic as current implementation).

## Updated STAGES Array
New `headR` values: `[12, 16, 20, 25, 28, 31, 34, 37, 40, 43]` (index 1–10).

`trailLen` scales proportionally from current values: `[12, 18, 24, 32, 40, 50, 60, 70, 80, 95]`.

The `draw(ctx)` method on each stage definition is **repurposed**: it now draws only the inner detail strokes (no outer blob — that's handled by the per-frame blob draw). This keeps stage-specific geometry self-contained.

## Performance
- Cache blit: one `drawImage` per frame (ambient glow) — unchanged cost
- Blob draw: N bezier segments per frame, no `shadowBlur` — trivially fast
- `Math.sin` calls: N per frame (one per anchor) — negligible
- Total overhead vs. current: near zero

## Files to Modify
- `src/components/UI/AlienSnake.jsx`
  - `getCreatureCanvas`: strip shading, draw only blurred ambient glow circle
  - `getEnemyCanvas`, `getCollectibleCanvas`, `getObstacleCanvas`: strip shading passes only
  - `STAGES` array: update `headR` values, repurpose `draw()` to inner details only
  - `ABSORB_THRESHOLDS`: unchanged
  - Add `drawBlobCreature(ctx, x, y, stageDef, color, phase, now)` helper
  - `player` object: add `blobPhases` array (N random phases, assigned at stage-up or init)
  - `draw()` loop: replace `drawCreature` call with `drawBlobCreature`
  - Inner layer rotation block: update radii to match new `headR` values
