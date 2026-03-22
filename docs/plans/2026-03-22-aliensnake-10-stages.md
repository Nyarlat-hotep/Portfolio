# AlienSnake 10-Stage Evolution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 5-stage player evolution with 10 stages across three visual eras — Cellular (1–3), Crystalline (4–7), Apex (8–10).

**Architecture:** Three isolated changes in `AlienSnake.jsx`: (1) replace the `STAGES` array with 10 new stage definitions, (2) update thresholds and enemy escalation logic, (3) update the inner-layer rotation draw block and UI label.

**Tech Stack:** Canvas 2D, existing geometry helpers (`drawCircle`, `drawDot`, `drawPolygon`, `drawStar`, `drawRing`, `drawTicks`).

---

## Context You Must Read First

File: `src/components/UI/AlienSnake.jsx`

- Lines 72–138: `STAGES` array (5 entries, replace entirely)
- Line 141: `ABSORB_THRESHOLDS` (replace)
- Line 920: `if (stage < 5 && g.absorbCount >= threshold)` (change 5 → 10)
- Lines 1005–1018: `spawnEnemiesForStage` (replace body)
- Lines 1070–1085: inner layer rotation block (replace)
- Line 1092: UI label (update)

Geometry helpers (lines 10–68): `drawCircle(ctx, r)`, `drawDot(ctx, r)`, `drawPolygon(ctx, r, sides, rotation)`, `drawStar(ctx, outerR, innerR, points, rotation)`, `drawRing(ctx, outerR, innerR)`, `drawTicks(ctx, r, count, len)`.

All stage `draw(ctx)` functions operate on a context already translated to entity center and scaled for DPR. Origin = center of entity.

---

## Task 1: Replace the STAGES array

**Files:**
- Modify: `src/components/UI/AlienSnake.jsx` (lines 72–138)

**Step 1: Replace the entire STAGES array**

Replace everything from `const STAGES = [` through the closing `];` (lines 72–138) with:

```js
const STAGES = [
  null, // 0-indexed placeholder
  // Stage 1 — Cellular: 3 dots in triangle
  {
    headR: 8,
    trailLen: 12,
    draw(ctx) {
      const triR = 3.5, dotR = 1.5;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * triR, Math.sin(a) * triR, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  // Stage 2 — Cellular: 3 dots + outer circle
  {
    headR: 10,
    trailLen: 18,
    draw(ctx) {
      drawCircle(ctx, 10);
      const triR = 3.5, dotR = 1.5;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * triR, Math.sin(a) * triR, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  // Stage 3 — Cellular: 3 dots + outer circle + inner ring
  {
    headR: 12,
    trailLen: 24,
    draw(ctx) {
      drawRing(ctx, 12, 7);
      const triR = 3.5, dotR = 1.5;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * triR, Math.sin(a) * triR, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  // Stage 4 — Crystalline: outer triangle + inner triangle (same dir) + dot
  {
    headR: 15,
    trailLen: 32,
    draw(ctx) {
      drawPolygon(ctx, 15, 3, -Math.PI / 2);
      drawPolygon(ctx, 7, 3, -Math.PI / 2);
      drawDot(ctx, 2);
    },
  },
  // Stage 5 — Crystalline: pentagon + circle outline
  {
    headR: 17,
    trailLen: 40,
    draw(ctx) {
      drawCircle(ctx, 17);
      drawPolygon(ctx, 11, 5, -Math.PI / 2);
    },
  },
  // Stage 6 — Crystalline: hexagon + inner inverted triangle
  {
    headR: 19,
    trailLen: 50,
    draw(ctx) {
      drawPolygon(ctx, 19, 6, 0);
      drawPolygon(ctx, 9, 3, Math.PI / 2);
    },
  },
  // Stage 7 — Crystalline: octagram (two squares) + outer ring
  {
    headR: 22,
    trailLen: 60,
    draw(ctx) {
      drawCircle(ctx, 22);
      drawPolygon(ctx, 14, 4, 0);
      drawPolygon(ctx, 14, 4, Math.PI / 4);
    },
  },
  // Stage 8 — Apex: 6-star + bounding circle + dot
  {
    headR: 25,
    trailLen: 70,
    draw(ctx) {
      drawCircle(ctx, 25);
      drawStar(ctx, 18, 10, 6, 0);
      drawDot(ctx, 2.5);
    },
  },
  // Stage 9 — Apex: 6-star + octagon + inner ring
  {
    headR: 29,
    trailLen: 80,
    draw(ctx) {
      drawStar(ctx, 22, 13, 6, 0);
      drawPolygon(ctx, 13, 8, Math.PI / 8);
      drawCircle(ctx, 8);
    },
  },
  // Stage 10 — Apex: full complexity (unchanged from original APEX)
  {
    headR: 33,
    trailLen: 95,
    draw(ctx) {
      drawCircle(ctx, 33);
      drawStar(ctx, 25, 15, 6, 0);
      drawPolygon(ctx, 16, 8, Math.PI / 8);
      drawCircle(ctx, 10);
      drawDot(ctx, 2.5);
      drawTicks(ctx, 33, 12, 6);
    },
  },
];
```

**Note:** The `name` and `segments` properties are removed — they are no longer used. `name` will be replaced by `STAGE N` text in the UI label (Task 3). `segments` was unused in the codebase.

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓|built"
```

Expected: `✓ built` with no errors.

**Step 3: Commit**

```bash
git add src/components/UI/AlienSnake.jsx
git commit -m "feat: redesign STAGES array — 10 stages across three visual eras"
```

---

## Task 2: Update thresholds, stage cap, and enemy escalation

**Files:**
- Modify: `src/components/UI/AlienSnake.jsx` (lines ~141, ~920, ~1005–1018)

**Step 1: Replace ABSORB_THRESHOLDS**

Find:
```js
const ABSORB_THRESHOLDS = [0, 3, 6, 10, 15];
```

Replace with:
```js
const ABSORB_THRESHOLDS = [0, 2, 4, 7, 10, 14, 18, 23, 29, 36];
```

Index = current stage number. Value = absorbs needed this stage to advance to next.

**Step 2: Update stage advance cap**

Find:
```js
if (stage < 5 && g.absorbCount >= threshold) {
```

Replace with:
```js
if (stage < 10 && g.absorbCount >= threshold) {
```

**Step 3: Replace `spawnEnemiesForStage` body**

Find and replace the entire body of `spawnEnemiesForStage`:

```js
function spawnEnemiesForStage(stage, W, H, enemies) {
  if (stage === 3) {
    enemies.push(spawnEnemy('chaser', W, H));
  } else if (stage === 5) {
    enemies.push(spawnEnemy('chaser', W, H));
    enemies.forEach(e => { if (e.type === 'patroller') e.speed = 110; });
  } else if (stage === 7) {
    enemies.push(spawnEnemy('chaser', W, H));
    enemies.push(spawnEnemy('chaser', W, H));
    enemies.forEach(e => { if (e.type === 'patroller') e.speed = 125; });
  } else if (stage === 9) {
    enemies.push(spawnEnemy('chaser', W, H));
    enemies.forEach(e => { if (e.type === 'patroller') e.speed = 145; });
  }
}
```

**Step 4: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓|built"
```

Expected: `✓ built` with no errors.

**Step 5: Commit**

```bash
git add src/components/UI/AlienSnake.jsx
git commit -m "feat: update thresholds, stage cap, and enemy escalation for 10 stages"
```

---

## Task 3: Update inner layer rotation and UI label

**Files:**
- Modify: `src/components/UI/AlienSnake.jsx` (lines ~1070–1092)

**Step 1: Replace inner layer rotation block**

Find the entire block:
```js
    // Inner layer — independent rotation, no shadowBlur, no cache
    if (player.stage >= 2) {
      const flickerOn = damaged ? Math.floor(now / 120) % 2 === 0 : false;
      const innerColor = (damaged && flickerOn) ? 'rgba(255,68,68,0.5)' : 'rgba(0,255,106,0.5)';
      const r = stageDef.headR;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.innerAngle);
      ctx.strokeStyle = innerColor;
      ctx.lineWidth = 0.8;
      if (player.stage === 2) drawPolygon(ctx, r * 0.45, 5, -Math.PI / 2);
      else if (player.stage === 3) drawPolygon(ctx, r * 0.4, 3, Math.PI);
      else if (player.stage === 4) drawPolygon(ctx, r * 0.5, 4, Math.PI / 8);
      else if (player.stage === 5) drawStar(ctx, r * 0.45, r * 0.2, 6, 0);
      ctx.restore();
    }
```

Replace with:
```js
    // Inner layer — independent rotation, no shadowBlur, no cache
    if (player.stage >= 2) {
      const flickerOn = damaged ? Math.floor(now / 120) % 2 === 0 : false;
      const innerColor = (damaged && flickerOn) ? 'rgba(255,68,68,0.5)' : 'rgba(0,255,106,0.5)';
      const r = stageDef.headR;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.innerAngle);
      ctx.strokeStyle = innerColor;
      ctx.lineWidth = 0.8;
      const s = player.stage;
      if (s === 2) drawPolygon(ctx, r * 0.4, 3, -Math.PI / 2);
      else if (s === 3) drawPolygon(ctx, r * 0.4, 3, -Math.PI / 2);
      else if (s === 4) drawPolygon(ctx, r * 0.4, 3, -Math.PI / 2);
      else if (s === 5) drawPolygon(ctx, r * 0.45, 5, -Math.PI / 2);
      else if (s === 6) drawPolygon(ctx, r * 0.4, 3, Math.PI / 2);
      else if (s === 7) drawPolygon(ctx, r * 0.45, 4, Math.PI / 8);
      else if (s === 8) drawStar(ctx, r * 0.4, r * 0.18, 6, 0);
      else if (s === 9) drawStar(ctx, r * 0.4, r * 0.18, 6, 0);
      else if (s === 10) drawStar(ctx, r * 0.45, r * 0.2, 6, 0);
      ctx.restore();
    }
```

Inner layer shapes match each era:
- Stages 2–4 (Cellular/early Crystalline): small triangle
- Stage 5: small pentagon
- Stage 6: small inverted triangle
- Stage 7: small rotated square
- Stages 8–10: small 6-star

**Step 2: Update UI label**

Find:
```js
    ctx.fillText(`${stageDef?.name ?? ''} — ${player.totalAbsorbs} ABSORBS`, W - 20, 28);
```

Replace with:
```js
    ctx.fillText(`STAGE ${player.stage} — ${player.totalAbsorbs} ABSORBS`, W - 20, 28);
```

**Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓|built"
```

Expected: `✓ built` with no errors.

**Step 4: Verify visually**

Run `npm run dev`, open the game. Confirm:
- Stage 1 shows 3 dots in a triangle arrangement
- Stage label reads `STAGE 1 — 0 ABSORBS`
- After 2 absorbs the player evolves to stage 2 (dots + circle)
- Era transitions feel visually distinct at stages 4 and 8

**Step 5: Commit**

```bash
git add src/components/UI/AlienSnake.jsx
git commit -m "feat: update inner layer rotation and UI label for 10 stages"
```
