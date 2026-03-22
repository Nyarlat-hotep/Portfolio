# AlienSnake Geometric Layers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the bezier blob animation with multi-layer counter-rotating geometric forms — a baked outer shape per stage plus 1–2 thin-stroke rotating layers drawn per frame.

**Architecture:** Two isolated changes to `AlienSnake.jsx`: (1) restore the geometry pipeline — `drawRing` helper, full outer shapes in `STAGES`, `getCreatureCanvas` baking shapes with glow, `drawCreature` function; (2) wire up player state (`outerAngle`, remove `blobPhases`) and replace the draw loop's single inner-layer block with a two-layer block.

**Tech Stack:** Canvas 2D, existing geometry helpers (`drawCircle`, `drawDot`, `drawPolygon`, `drawStar`, `drawTicks`), `drawRing` (restored).

---

## Context You Must Read First

File: `src/components/UI/AlienSnake.jsx`

- Lines 8–59: geometry helpers (no `drawRing` currently — it was deleted)
- Lines 63–182: `STAGES` array — currently has `blobAnchors`/`blobAmpR`, `draw()` has inner details only
- Lines 203–230: `getCreatureCanvas` — currently draws ambient glow only (no shape)
- Lines 246–299: `drawBlobCreature` — to be removed entirely
- Lines 592–616: `buildInitialState` — player has `blobPhases`, no `outerAngle`
- Lines 788–802: `applyDamage` — reassigns `blobPhases` on stage-down
- Line 843: `update()` — increments `innerAngle`, line 872 reassigns `blobPhases` on stage-up
- Lines 1014–1017: `draw()` — calls `drawBlobCreature`
- Lines 1019–1037: existing inner layer rotation block (to be replaced)

Geometry helpers (lines 10–59): `drawCircle(ctx, r)`, `drawDot(ctx, r)`, `drawPolygon(ctx, r, sides, rotation)`, `drawStar(ctx, outerR, innerR, points, rotation)`, `drawTicks(ctx, r, count, len)`.

All `draw(ctx)` functions operate on a context already translated to entity center and scaled for DPR. Origin = center of entity. All measurements are in logical pixels relative to `headR`.

---

## Task 1: Restore geometry pipeline

**Files:**
- Modify: `src/components/UI/AlienSnake.jsx` (lines 8–299)

### Step 1: Restore `drawRing` helper

Find:
```js
function drawTicks(ctx, r, count, len = 5) {
```

Insert immediately **before** it:
```js
function drawRing(ctx, outerR, innerR) {
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.stroke();
}

```

### Step 2: Replace the STAGES array (lines 63–182)

Find everything from `const STAGES = [` through the closing `];` and replace with:

```js
const STAGES = [
  null, // 0-indexed placeholder
  // Stage 1 — Cellular: filled dot
  {
    headR: 12,
    trailLen: 12,
    draw(ctx) {
      drawDot(ctx, 6);
    },
  },
  // Stage 2 — Cellular: circle + 3 dots in triangle
  {
    headR: 16,
    trailLen: 18,
    draw(ctx) {
      drawCircle(ctx, 16);
      const triR = 7, dotR = 2;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * triR, Math.sin(a) * triR, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  // Stage 3 — Cellular: double ring + 3 dots
  {
    headR: 20,
    trailLen: 24,
    draw(ctx) {
      drawRing(ctx, 20, 10);
      const triR = 6, dotR = 1.8;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * triR, Math.sin(a) * triR, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  // Stage 4 — Crystalline: outer tri + inner tri (same dir) + dot
  {
    headR: 25,
    trailLen: 32,
    draw(ctx) {
      drawPolygon(ctx, 25, 3, -Math.PI / 2);
      drawPolygon(ctx, 12, 3, -Math.PI / 2);
      drawDot(ctx, 3);
    },
  },
  // Stage 5 — Crystalline: circle + pentagon
  {
    headR: 28,
    trailLen: 40,
    draw(ctx) {
      drawCircle(ctx, 28);
      drawPolygon(ctx, 18, 5, -Math.PI / 2);
    },
  },
  // Stage 6 — Crystalline: hexagon + inverted triangle
  {
    headR: 31,
    trailLen: 50,
    draw(ctx) {
      drawPolygon(ctx, 31, 6, 0);
      drawPolygon(ctx, 14, 3, Math.PI / 2);
    },
  },
  // Stage 7 — Crystalline: one square (static; second square is rotating Layer 2)
  {
    headR: 34,
    trailLen: 60,
    draw(ctx) {
      drawPolygon(ctx, 26, 4, 0);
    },
  },
  // Stage 8 — Apex: circle + 6-star
  {
    headR: 37,
    trailLen: 70,
    draw(ctx) {
      drawCircle(ctx, 37);
      drawStar(ctx, 27, 15, 6, 0);
    },
  },
  // Stage 9 — Apex: 6-star + inner ring
  {
    headR: 40,
    trailLen: 80,
    draw(ctx) {
      drawStar(ctx, 31, 18, 6, 0);
      drawCircle(ctx, 14);
    },
  },
  // Stage 10 — Apex: full complexity
  {
    headR: 43,
    trailLen: 95,
    draw(ctx) {
      drawCircle(ctx, 43);
      drawStar(ctx, 34, 19, 6, 0);
      drawPolygon(ctx, 19, 8, Math.PI / 8);
      drawCircle(ctx, 11);
      drawDot(ctx, 3);
      drawTicks(ctx, 43, 12, 5);
    },
  },
];
```

### Step 3: Restore `getCreatureCanvas` to bake full shapes

Find the entire `getCreatureCanvas` function (currently draws ambient glow only):
```js
function getCreatureCanvas(stage, color) {
  const key = `${stage}|${color}`;
  if (_creatureCache.has(key)) return _creatureCache.get(key);

  const stageDef = STAGES[stage];
  const r = stageDef.headR;
  const logSize = (r + CACHE_PAD) * 2;
  const oc = document.createElement('canvas');
  oc.width = logSize * _cachedDPR;
  oc.height = logSize * _cachedDPR;
  const octx = oc.getContext('2d');
  octx.scale(_cachedDPR, _cachedDPR);
  octx.translate(logSize / 2, logSize / 2);

  // Ambient glow — soft blurred filled circle, no shape geometry
  octx.shadowColor = color;
  octx.shadowBlur = 22;
  octx.globalAlpha = 0.35;
  octx.fillStyle = color;
  octx.beginPath();
  octx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
  octx.fill();
  octx.shadowBlur = 0;
  octx.globalAlpha = 1;

  _creatureCache.set(key, oc);
  return oc;
}
```

Replace with:
```js
function getCreatureCanvas(stage, color) {
  const key = `${stage}|${color}`;
  if (_creatureCache.has(key)) return _creatureCache.get(key);

  const stageDef = STAGES[stage];
  const r = stageDef.headR;
  const logSize = (r + CACHE_PAD) * 2;
  const oc = document.createElement('canvas');
  oc.width = logSize * _cachedDPR;
  oc.height = logSize * _cachedDPR;
  const octx = oc.getContext('2d');
  octx.scale(_cachedDPR, _cachedDPR);
  octx.translate(logSize / 2, logSize / 2);

  // Glow strokes (shadowBlur ON)
  octx.shadowColor = color;
  octx.shadowBlur = 18;
  octx.strokeStyle = color;
  octx.fillStyle = color;
  octx.lineWidth = 1.5;
  stageDef.draw(octx);
  octx.shadowBlur = 0;

  _creatureCache.set(key, oc);
  return oc;
}
```

### Step 4: Add `drawCreature` function and remove `drawBlobCreature`

Find the entire `drawBlobCreature` function (lines 246–299):
```js
function drawBlobCreature(ctx, x, y, stage, damaged, now, phases) {
```
...through its closing `}`.

Replace the entire function with:
```js
function drawCreature(ctx, x, y, stage, damaged, now) {
  const stageDef = STAGES[stage];
  if (!stageDef) return;
  const flickerOn = damaged ? Math.floor(now / 120) % 2 === 0 : false;
  const color = (damaged && flickerOn) ? '#ff4444' : '#00ff6a';

  const oc = getCreatureCanvas(stage, color);
  const size = (stageDef.headR + CACHE_PAD) * 2;
  ctx.save();
  drawDropShadow(ctx, x, y, stageDef.headR);
  ctx.drawImage(oc, x - size / 2, y - size / 2, size, size);
  ctx.restore();
}
```

### Step 5: Verify build

```bash
cd /Users/taylorcornelius/Desktop/portfolio && npm run build 2>&1 | grep -E "error|Error|✓|built"
```

Expected: `✓ built` with no errors.

### Step 6: Commit

```bash
cd /Users/taylorcornelius/Desktop/portfolio && git add src/components/UI/AlienSnake.jsx && git commit -m "feat: restore geometric creature pipeline — full shapes baked in cache"
```

---

## Task 2: Wire player state and two-layer draw block

**Files:**
- Modify: `src/components/UI/AlienSnake.jsx` (lines 592–1037)

### Step 1: Update `buildInitialState` player object

Find:
```js
    player: {
      x: W / 2,
      y: H / 2,
      vx: 0,
      vy: 0,
      stage: 1,
      hp: 2,
      damagedUntil: 0,
      trail: [],
      totalAbsorbs: 0,
      innerAngle: 0,
      blobPhases: Array.from({ length: STAGES[1].blobAnchors }, () => Math.random() * Math.PI * 2),
    },
```

Replace with:
```js
    player: {
      x: W / 2,
      y: H / 2,
      vx: 0,
      vy: 0,
      stage: 1,
      hp: 2,
      damagedUntil: 0,
      trail: [],
      totalAbsorbs: 0,
      innerAngle: 0,
      outerAngle: 0,
    },
```

### Step 2: Remove `blobPhases` reassignment from `applyDamage`

Find:
```js
        player.stage--;
        player.hp = 2;
        g.absorbCount = 0;
        player.blobPhases = Array.from({ length: STAGES[player.stage].blobAnchors }, () => Math.random() * Math.PI * 2);
```

Replace with:
```js
        player.stage--;
        player.hp = 2;
        g.absorbCount = 0;
```

### Step 3: Add `outerAngle` increment + remove `blobPhases` on stage-up in `update()`

Find:
```js
    player.innerAngle = (player.innerAngle + delta * 2.2) % (Math.PI * 2); // ~2.2 rad/sec counter-rotation
```

Replace with:
```js
    player.innerAngle = (player.innerAngle + delta * 2.2) % (Math.PI * 2);
    player.outerAngle = (player.outerAngle - delta * 0.4 + Math.PI * 2) % (Math.PI * 2);
```

Then find the stage-up block:
```js
        if (stage < 10 && g.absorbCount >= threshold) {
          player.stage++;
          g.absorbCount = 0;
          player.hp = 2;
          player.blobPhases = Array.from({ length: STAGES[player.stage].blobAnchors }, () => Math.random() * Math.PI * 2);
          spawnEnemiesForStage(player.stage, W, H, enemies);
        }
```

Replace with:
```js
        if (stage < 10 && g.absorbCount >= threshold) {
          player.stage++;
          g.absorbCount = 0;
          player.hp = 2;
          spawnEnemiesForStage(player.stage, W, H, enemies);
        }
```

### Step 4: Replace draw call + inner layer block in `draw()`

Find:
```js
    drawTrail(ctx, player.trail, stageDef?.headR ?? 10, damaged, now, player.stage);
    drawBlobCreature(ctx, player.x, player.y, player.stage, damaged, now, player.blobPhases);

    // Inner layer — independent rotation, no shadowBlur, no cache
    if (player.stage >= 2) {
      const flickerOn = damaged ? Math.floor(now / 120) % 2 === 0 : false;
      const innerColor = (damaged && flickerOn) ? 'rgba(255,68,68,0.5)' : 'rgba(0,255,106,0.5)';
      const r = stageDef.headR;
      const s = player.stage;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.innerAngle);
      ctx.strokeStyle = innerColor;
      ctx.lineWidth = 0.8;
      if (s <= 4) drawPolygon(ctx, r * 0.4, 3, -Math.PI / 2);
      else if (s === 5) drawPolygon(ctx, r * 0.45, 5, -Math.PI / 2);
      else if (s === 6) drawPolygon(ctx, r * 0.4, 3, Math.PI / 2);
      else if (s === 7) drawPolygon(ctx, r * 0.45, 4, Math.PI / 8);
      else if (s <= 9) drawStar(ctx, r * 0.4, r * 0.18, 6, 0);
      else drawStar(ctx, r * 0.45, r * 0.2, 6, 0);
      ctx.restore();
    }
```

Replace with:
```js
    drawTrail(ctx, player.trail, stageDef?.headR ?? 10, damaged, now, player.stage);
    drawCreature(ctx, player.x, player.y, player.stage, damaged, now);

    // Rotating layers — no shadowBlur, no cache
    if (player.stage >= 2) {
      const flickerOn = damaged ? Math.floor(now / 120) % 2 === 0 : false;
      const layerColor = (damaged && flickerOn) ? 'rgba(255,68,68,0.5)' : 'rgba(0,255,106,0.5)';
      const r = stageDef.headR;
      const s = player.stage;

      // Layer 1 — inner, fast rotation (stages 2–10)
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.innerAngle);
      ctx.strokeStyle = layerColor;
      ctx.lineWidth = 0.8;
      if (s <= 4) drawPolygon(ctx, r * 0.38, 3, -Math.PI / 2);
      else if (s === 5) drawPolygon(ctx, r * 0.4, 5, -Math.PI / 2);
      else if (s === 6) drawPolygon(ctx, r * 0.35, 3, Math.PI / 2);
      else if (s === 7) drawPolygon(ctx, r * 0.5, 4, Math.PI / 8);
      else drawStar(ctx, r * 0.38, r * 0.17, 6, 0);
      ctx.restore();

      // Layer 2 — outer, slow counter-rotation (stages 5–10)
      if (s >= 5) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.outerAngle);
        ctx.strokeStyle = layerColor;
        ctx.lineWidth = 0.8;
        if (s === 5) drawPolygon(ctx, r * 0.88, 5, 0);
        else if (s === 6) drawPolygon(ctx, r * 0.85, 6, 0);
        else if (s === 7) drawPolygon(ctx, r * 0.55, 4, Math.PI / 4);
        else if (s === 8) drawPolygon(ctx, r * 0.9, 6, 0);
        else if (s === 9) drawPolygon(ctx, r * 0.7, 8, 0);
        else drawPolygon(ctx, r * 0.72, 8, 0);
        ctx.restore();
      }
    }
```

### Step 5: Verify build

```bash
cd /Users/taylorcornelius/Desktop/portfolio && npm run build 2>&1 | grep -E "error|Error|✓|built"
```

Expected: `✓ built` with no errors.

### Step 6: Visual verification

Run `npm run dev`, open the game. Confirm:
- Stage 1: glowing filled dot, no rotating layers
- Stage 2: circle + 3 dots, small triangle spinning inside
- Stage 4: two triangles pointing same direction, small triangle spinning inside
- Stage 7: one static square + one fast-spinning square (L1) + one slow-spinning square at 45° (L2) — three-layer "gear" effect
- Stage 10: full apex with spinning 6-star inner and slow octagon outer
- Damaged state: all layers flicker red simultaneously

### Step 7: Commit

```bash
cd /Users/taylorcornelius/Desktop/portfolio && git add src/components/UI/AlienSnake.jsx && git commit -m "feat: wire two-layer counter-rotating draw system for all 10 stages"
```
