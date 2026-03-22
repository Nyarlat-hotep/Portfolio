# AlienSnake 10-Stage Evolution — Design Doc
**Date:** 2026-03-22

## Goal
Redesign the player evolution from 5 stages to 10, with a more gradual progression organized into three distinct visual eras.

## Stage Progression

| Stage | r | Description |
|-------|---|-------------|
| 1 | 8 | 3 dots arranged in a triangle |
| 2 | 10 | 3 dots + outer circle |
| 3 | 12 | 3 dots + circle + inner ring |
| 4 | 15 | outer triangle + inner triangle (same direction) + dot |
| 5 | 17 | pentagon + circle outline |
| 6 | 19 | hexagon + inner inverted triangle |
| 7 | 22 | octagram (two overlapping squares) + outer ring |
| 8 | 25 | 6-pointed star + bounding circle + dot |
| 9 | 29 | 6-star + octagon + inner ring |
| 10 | 33 | 6-star + octagon + inner circle + dot + 12 ticks (current APEX) |

### Three Eras
- **Era 1 — Cellular (stages 1–3):** organic, circular, soft. Dots and circles only.
- **Era 2 — Crystalline (stages 4–7):** angular polygons emerge. Clear era shift at stage 4.
- **Era 3 — Apex (stages 8–10):** complex multi-layer star forms. Stage 10 unchanged from current APEX.

## Absorption Thresholds

```js
const ABSORB_THRESHOLDS = [0, 2, 4, 7, 10, 14, 18, 23, 29, 36];
```

Index = stage number (1-based, index 0 unused). Value = cumulative absorbs needed to reach that stage.

## Enemy Escalation

```
Stage 3:  +1 chaser
Stage 5:  +1 chaser, patrollers speed up
Stage 7:  +2 chasers
Stage 9:  +1 chaser, max speed
```

## Trail Lengths

Scale from 12 (stage 1) to 95 (stage 10):
`[null, 12, 18, 24, 32, 40, 50, 60, 70, 80, 95]`

## UI Label

No stage names. Label becomes: `STAGE 3 — 7 ABSORBS` (replaces current `FORM — 7 ABSORBS`).

## Inner Layer Rotation

The independent counter-rotating inner layer (added in visual depth pass) should continue for stages 2–10. Stage-specific shapes need to be updated to match each era. Stages 1–3 draw small dot(s). Stages 4–7 draw a small polygon. Stages 8–10 draw a star or ring.

## Files to Modify
- `src/components/UI/AlienSnake.jsx` — `STAGES` array, `ABSORB_THRESHOLDS`, `spawnEnemiesForStage`, inner layer draw block in `draw()`, UI label in `draw()`
