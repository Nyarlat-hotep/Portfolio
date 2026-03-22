# AlienSnake Visual Depth — Design Doc
**Date:** 2026-03-22

## Goal
Make the AlienSnake game entities feel dimensional and alive — bridging the visual gap between the polished 3D galaxy scene and the current flat 2D game.

## Approved Approach: Volumetric Shading (A) + Living Organisms (B)

---

## Section 1: Volumetric Shading

**Scope:** All four offscreen cache functions — `getCreatureCanvas`, `getEnemyCanvas`, `getCollectibleCanvas`, `getObstacleCanvas`.

### Changes
- **Radial gradient fill**: Replace flat `fillStyle = color` with `createRadialGradient`. Light source offset top-left (~-30% of entity radius), fading to a darker tone at the outer edge. Makes circles and polygons read as spheres or faceted gems.
- **Specular highlight**: A small secondary radial gradient (white → transparent), radius ~25% of entity size, placed at the top-left of each entity. Simulates light catching a reflective surface.
- **Drop shadow ellipse**: A small semi-transparent dark ellipse drawn slightly offset (right + down) before blitting each cached canvas on the main canvas. Classic 2.5D floating-object illusion.

### Performance
All shading changes are baked into the offscreen cache at build time. Zero additional per-frame cost beyond what already exists.

---

## Section 2: Living Organisms

### Enemy breathing
- When blitting each enemy's cached canvas, apply `ctx.scale(breatheScale, breatheScale)` where:
  ```
  breatheScale = 1 + 0.06 * Math.sin(time * breatheSpeed + enemy.breathePhase)
  ```
- Each enemy gets a random `breathePhase` at spawn so enemies pulse out of sync.
- Cost: one `Math.sin` per enemy per frame.

### Player inner layer rotation
- The existing baked cache is unchanged (outer glow shell preserved).
- A second small inner geometric element (the innermost polygon/ring for the current stage) is drawn directly on the main canvas each frame with a faster independent rotation angle.
- No `shadowBlur`, no fill — thin stroke only. 5–8 line segments max.
- As the outer shell rotates one way, the inner core rotates faster, creating a "spinning engine" or "living cell nucleus" feel.
- Cost: one small polygon draw per frame, trivially fast.

### Collectibles
No changes — they already rotate and feel alive.

---

## Out of Scope
- Z-depth field (entity size/opacity by depth) — saved for a future pass.
- Parallax background layers — separate concern.
- Scan-pulse sweep effect — adds complexity without proportionate impact; skipped.

---

## Files to Modify
- `src/components/UI/AlienSnake.jsx` — cache functions + draw loop (inner layer, enemy breathing)
