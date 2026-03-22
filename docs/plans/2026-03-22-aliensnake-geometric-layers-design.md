# AlienSnake Geometric Layers — Design Doc
**Date:** 2026-03-22

## Goal
Replace the bezier blob animation with multi-layer counter-rotating geometric forms. Each stage has a baked outer shape plus 1–2 thin-stroke rotating layers drawn per frame, creating a mechanical/alien "living engine" feel.

## Architecture

**Cache layer:** Full outer shape per stage baked into `getCreatureCanvas` with `shadowBlur` glow. Zero per-frame cost.

**Layer 1 — inner fast rotation:** Small inner element drawn per frame using `player.innerAngle` (~2.2 rad/s). Already exists in codebase. Active stages 2–10.

**Layer 2 — outer slow counter-rotation:** Secondary outer element drawn per frame using `player.outerAngle` (~−0.4 rad/s, opposite direction). New addition. Active stages 5–10.

Both rotating layers: thin stroke only (`lineWidth 0.8`), no `shadowBlur`, no fill.

## Per-Stage Breakdown

| Stage | headR | Cache (baked) | L1 inner — fast | L2 outer — slow |
|-------|-------|---------------|-----------------|-----------------|
| 1 | 12 | filled dot | — | — |
| 2 | 16 | circle + 3 dots | small triangle | — |
| 3 | 20 | double ring + 3 dots | small triangle | — |
| 4 | 25 | outer tri + inner tri + dot | small triangle | — |
| 5 | 28 | circle + pentagon | small pentagon | slow outer ring |
| 6 | 31 | hexagon + inv triangle | small inv triangle | slow hexagon |
| 7 | 34 | one square (static) | one square fast | one square slow |
| 8 | 37 | circle + 6-star | small 6-star | slow ring |
| 9 | 40 | 6-star + inner ring | small 6-star | slow octagon |
| 10 | 43 | full apex | 6-star | slow octagon |

### Layer dimensions (relative to headR `r`)

**Layer 1 shapes:**
- Stages 2–4: `drawPolygon(ctx, r * 0.38, 3, innerAngle)` — small triangle
- Stage 5: `drawPolygon(ctx, r * 0.4, 5, innerAngle)` — small pentagon
- Stage 6: `drawPolygon(ctx, r * 0.35, 3, innerAngle + Math.PI / 2)` — inverted triangle
- Stage 7: `drawPolygon(ctx, r * 0.5, 4, innerAngle)` — square, fast
- Stages 8–10: `drawStar(ctx, r * 0.38, r * 0.17, 6, innerAngle)` — small 6-star

**Layer 2 shapes:**
- Stage 5: `drawCircle(ctx, r * 0.88)` — outer ring (near edge of head)
- Stage 6: `drawPolygon(ctx, r * 0.85, 6, outerAngle)` — slow hexagon
- Stage 7: `drawPolygon(ctx, r * 0.55, 4, outerAngle + Math.PI / 4)` — second square rotated 45°
- Stage 8: `drawCircle(ctx, r * 0.88)` — slow ring (same as stage 5 size)
- Stage 9: `drawPolygon(ctx, r * 0.7, 8, outerAngle)` — slow octagon
- Stage 10: `drawPolygon(ctx, r * 0.72, 8, outerAngle)` — slow octagon

## Cache Shape Details (`STAGES[n].draw(ctx)`)

```
Stage 1:  drawDot(ctx, r * 0.5)
Stage 2:  drawCircle(ctx, r) + 3 filled dots at triR = r*0.45
Stage 3:  drawRing(ctx, r, r*0.5) + 3 filled dots at triR = r*0.45
Stage 4:  drawPolygon(ctx, r, 3, -PI/2) + drawPolygon(ctx, r*0.5, 3, -PI/2) + drawDot(ctx, r*0.12)
Stage 5:  drawCircle(ctx, r) + drawPolygon(ctx, r*0.65, 5, -PI/2)
Stage 6:  drawPolygon(ctx, r, 6, 0) + drawPolygon(ctx, r*0.45, 3, PI/2)
Stage 7:  drawPolygon(ctx, r*0.75, 4, 0)
Stage 8:  drawCircle(ctx, r) + drawStar(ctx, r*0.72, r*0.4, 6, 0)
Stage 9:  drawStar(ctx, r*0.78, r*0.44, 6, 0) + drawCircle(ctx, r*0.35)
Stage 10: drawCircle(ctx, r) + drawStar(ctx, r*0.78, r*0.44, 6, 0) + drawPolygon(ctx, r*0.44, 8, PI/8) + drawCircle(ctx, r*0.25) + drawDot(ctx, r*0.07) + drawTicks(ctx, r, 12, 5)
```

(All values relative to `headR r`. `drawRing` helper to be restored — it was deleted in a prior cleanup pass.)

## Player State Changes

**Remove:** `blobPhases`, `blobAnchors`, `blobAmpR` properties
**Add:** `player.outerAngle: 0`
**Keep:** `player.innerAngle: 0`

In `update()`:
```js
player.innerAngle = (player.innerAngle + delta * 2.2) % (Math.PI * 2);   // already exists
player.outerAngle = (player.outerAngle - delta * 0.4 + Math.PI * 2) % (Math.PI * 2); // new, opposite dir
```

## Draw Loop Changes

Replace `drawBlobCreature` call with `drawCreature` (restored). After the creature draw, the two rotating layer blocks run in sequence:

```
// Layer 1 — inner fast (stages 2–10)
// Layer 2 — outer slow (stages 5–10)
```

Both blocks: `ctx.save()` → `ctx.translate(x, y)` → `ctx.rotate(angle)` → thin stroke draw → `ctx.restore()`

## Files to Modify
- `src/components/UI/AlienSnake.jsx`
  - Restore `drawRing` helper (deleted in prior pass)
  - Restore `getCreatureCanvas` to bake full shape (call `stageDef.draw(octx)`)
  - Restore `drawCreature` function (cache blit + drop shadow)
  - Replace `STAGES` draw methods with full outer shapes (using relative `r` sizing)
  - Remove `blobAnchors`, `blobAmpR` from each stage entry
  - Remove `drawBlobCreature` function
  - Add `player.outerAngle` to `buildInitialState`
  - Remove `player.blobPhases` and all reassignment sites
  - Add `outerAngle` increment in `update()`
  - Replace `drawBlobCreature` call with `drawCreature` in `draw()`
  - Replace inner layer block with updated 2-layer block

## Unchanged
- `ABSORB_THRESHOLDS`
- `headR` values (12–43)
- `trailLen` values
- `spawnEnemiesForStage`
- All enemy/collectible/obstacle drawing (already flat after Task 1)
