# AlienSnake Organic Blob Animation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove 3D shading from all entity caches, redesign 10 player stages with larger radii and organic bezier blob animation, and update inner detail shapes per era.

**Architecture:** Three isolated changes to `AlienSnake.jsx`: (1) strip radial gradient passes from collectible/enemy/obstacle caches, (2) replace STAGES with new headR values + ambient-glow-only creature cache + repurposed per-stage draw() as inner detail, (3) add `drawBlobCreature` per-frame animated blob system wired into the draw loop and player state.

**Tech Stack:** Canvas 2D, existing geometry helpers (`drawCircle`, `drawDot`, `drawPolygon`, `drawStar`, `drawRing`, `drawTicks`), quadratic bezier curves.

---

## Context You Must Read First

File: `src/components/UI/AlienSnake.jsx`

- Lines 213–275: `getCreatureCanvas` — has volumetric shading to strip/replace
- Lines 387–443: `getCollectibleCanvas` — has volumetric shading to strip
- Lines 463–519: `getEnemyCanvas` — has volumetric shading to strip
- Lines 541–606: `getObstacleCanvas` — has volumetric shading to strip
- Lines 72–189: `STAGES` array — 10 stages with old headR values (8–33), `draw()` draws full shape
- Line 697–720: `buildInitialState` — `player` object (add `blobPhases` here)
- Lines 892–905: `applyDamage` — stage-down (add `blobPhases` reassignment)
- Lines 970–976: stage-up block in `update()` (add `blobPhases` reassignment)
- Lines 1117–1119: `draw()` — `drawCreature` call (replace with `drawBlobCreature`)
- Lines 1121–1139: inner layer rotation block
- Lines 290–305: `drawCreature` function (keep as-is — only used by cache internals after this plan; actually it's the main draw call, we replace it)

Geometry helpers (lines 10–68): `drawCircle(ctx, r)`, `drawDot(ctx, r)`, `drawPolygon(ctx, r, sides, rotation)`, `drawStar(ctx, outerR, innerR, points, rotation)`, `drawRing(ctx, outerR, innerR)`, `drawTicks(ctx, r, count, len)`.

All `draw(ctx)` calls operate on a context already translated to entity center.

---

## Task 1: Strip volumetric shading from collectible, enemy, and obstacle caches

**Files:**
- Modify: `src/components/UI/AlienSnake.jsx` (lines 387–606)

**Step 1: Strip shading from `getCollectibleCanvas` (lines 402–433)**

Find and remove everything between `octx.translate(logSize / 2, logSize / 2);` and the `// Glow strokes` comment block in `getCollectibleCanvas`. The function should go directly from the translate to the glow strokes.

Find:
```js
  octx.scale(_cachedDPR, _cachedDPR);
  octx.translate(logSize / 2, logSize / 2);

  // Volumetric fill (shadowBlur OFF)
  octx.save();
  octx.globalAlpha = 0.15;
  octx.fillStyle = '#00ff6a';
  octx.beginPath();
  octx.arc(0, 0, rKey, 0, Math.PI * 2);
  octx.fill();
  octx.restore();

  const cShadowGrad = octx.createRadialGradient(rKey * 0.1, rKey * 0.15, 0, 0, 0, rKey);
  cShadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
  cShadowGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
  octx.fillStyle = cShadowGrad;
  octx.beginPath();
  octx.arc(0, 0, rKey, 0, Math.PI * 2);
  octx.fill();

  const cHlGrad = octx.createRadialGradient(-rKey * 0.35, -rKey * 0.35, 0, 0, 0, rKey);
  cHlGrad.addColorStop(0, 'rgba(255,255,255,0.2)');
  cHlGrad.addColorStop(0.45, 'rgba(255,255,255,0)');
  octx.fillStyle = cHlGrad;
  octx.beginPath();
  octx.arc(0, 0, rKey, 0, Math.PI * 2);
  octx.fill();

  const cSpecGrad = octx.createRadialGradient(-rKey * 0.3, -rKey * 0.32, 0, -rKey * 0.3, -rKey * 0.32, rKey * 0.22);
  cSpecGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
  cSpecGrad.addColorStop(1, 'rgba(255,255,255,0)');
  octx.fillStyle = cSpecGrad;
  octx.beginPath();
  octx.arc(-rKey * 0.3, -rKey * 0.32, rKey * 0.22, 0, Math.PI * 2);
  octx.fill();

  octx.shadowColor = '#00ff6a';
```

Replace with:
```js
  octx.scale(_cachedDPR, _cachedDPR);
  octx.translate(logSize / 2, logSize / 2);

  octx.shadowColor = '#00ff6a';
```

**Step 2: Strip shading from `getEnemyCanvas` (lines 476–507)**

Find:
```js
  octx.scale(_cachedDPR, _cachedDPR);
  octx.translate(logSize / 2, logSize / 2);

  // Volumetric fill (shadowBlur OFF)
  octx.save();
  octx.globalAlpha = 0.18;
  octx.fillStyle = color;
  octx.beginPath();
  octx.arc(0, 0, r, 0, Math.PI * 2);
  octx.fill();
  octx.restore();

  const shadowGrad = octx.createRadialGradient(r * 0.1, r * 0.15, 0, 0, 0, r);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
  octx.fillStyle = shadowGrad;
  octx.beginPath();
  octx.arc(0, 0, r, 0, Math.PI * 2);
  octx.fill();

  const hlGrad = octx.createRadialGradient(-r * 0.35, -r * 0.35, 0, 0, 0, r);
  hlGrad.addColorStop(0, 'rgba(255,255,255,0.2)');
  hlGrad.addColorStop(0.45, 'rgba(255,255,255,0)');
  octx.fillStyle = hlGrad;
  octx.beginPath();
  octx.arc(0, 0, r, 0, Math.PI * 2);
  octx.fill();

  const specGrad = octx.createRadialGradient(-r * 0.3, -r * 0.32, 0, -r * 0.3, -r * 0.32, r * 0.22);
  specGrad.addColorStop(0, 'rgba(255,255,255,0.55)');
  specGrad.addColorStop(1, 'rgba(255,255,255,0)');
  octx.fillStyle = specGrad;
  octx.beginPath();
  octx.arc(-r * 0.3, -r * 0.32, r * 0.22, 0, Math.PI * 2);
  octx.fill();

  // Glow strokes (shadowBlur ON)
  octx.shadowColor = '#ff3300';
```

Replace with:
```js
  octx.scale(_cachedDPR, _cachedDPR);
  octx.translate(logSize / 2, logSize / 2);

  // Glow strokes (shadowBlur ON)
  octx.shadowColor = '#ff3300';
```

**Step 3: Strip shading from `getObstacleCanvas` (lines 554–585)**

Find:
```js
  octx.scale(_cachedDPR, _cachedDPR);
  octx.translate(logSize / 2, logSize / 2);

  // Volumetric fill (shadowBlur OFF)
  octx.save();
  octx.globalAlpha = 0.2;
  octx.fillStyle = '#ff3300';
  octx.beginPath();
  octx.arc(0, 0, rKey, 0, Math.PI * 2);
  octx.fill();
  octx.restore();

  const oShadowGrad = octx.createRadialGradient(rKey * 0.1, rKey * 0.15, 0, 0, 0, rKey);
  oShadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
  oShadowGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
  octx.fillStyle = oShadowGrad;
  octx.beginPath();
  octx.arc(0, 0, rKey, 0, Math.PI * 2);
  octx.fill();

  const oHlGrad = octx.createRadialGradient(-rKey * 0.35, -rKey * 0.35, 0, 0, 0, rKey);
  oHlGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
  oHlGrad.addColorStop(0.45, 'rgba(255,255,255,0)');
  octx.fillStyle = oHlGrad;
  octx.beginPath();
  octx.arc(0, 0, rKey, 0, Math.PI * 2);
  octx.fill();

  const oSpecGrad = octx.createRadialGradient(-rKey * 0.3, -rKey * 0.32, 0, -rKey * 0.3, -rKey * 0.32, rKey * 0.2);
  oSpecGrad.addColorStop(0, 'rgba(255,200,180,0.5)');
  oSpecGrad.addColorStop(1, 'rgba(255,200,180,0)');
  octx.fillStyle = oSpecGrad;
  octx.beginPath();
  octx.arc(-rKey * 0.3, -rKey * 0.32, rKey * 0.2, 0, Math.PI * 2);
  octx.fill();

  octx.shadowColor = '#ff2200';
```

Replace with:
```js
  octx.scale(_cachedDPR, _cachedDPR);
  octx.translate(logSize / 2, logSize / 2);

  octx.shadowColor = '#ff2200';
```

**Step 4: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓|built"
```

Expected: `✓ built` with no errors.

**Step 5: Commit**

```bash
git add src/components/UI/AlienSnake.jsx
git commit -m "feat: strip volumetric shading from collectible, enemy, and obstacle caches"
```

---

## Task 2: Redesign STAGES array + convert creature cache to ambient glow

**Files:**
- Modify: `src/components/UI/AlienSnake.jsx` (lines 72–275)

**Step 1: Replace the STAGES array (lines 72–189)**

Each stage now has `blobAnchors` and `blobAmpR` (amplitude as fraction of headR). The `draw(ctx)` method draws only the inner detail strokes/fills — the outer blob is handled per-frame by `drawBlobCreature` in Task 3.

Find everything from `const STAGES = [` through the closing `];` (lines 72–189) and replace with:

```js
const STAGES = [
  null, // 0-indexed placeholder
  // Stage 1 — Cellular: center dot
  {
    headR: 12,
    trailLen: 12,
    blobAnchors: 5,
    blobAmpR: 0.30,
    draw(ctx) {
      drawDot(ctx, 2);
    },
  },
  // Stage 2 — Cellular: 3 dots in triangle
  {
    headR: 16,
    trailLen: 18,
    blobAnchors: 5,
    blobAmpR: 0.28,
    draw(ctx) {
      const triR = 5, dotR = 1.8;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * triR, Math.sin(a) * triR, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  // Stage 3 — Cellular: inner ring
  {
    headR: 20,
    trailLen: 24,
    blobAnchors: 6,
    blobAmpR: 0.25,
    draw(ctx) {
      drawCircle(ctx, 7);
    },
  },
  // Stage 4 — Crystalline: two triangles (same dir) + inner dot
  {
    headR: 25,
    trailLen: 32,
    blobAnchors: 6,
    blobAmpR: 0.20,
    draw(ctx) {
      drawPolygon(ctx, 15, 3, -Math.PI / 2);
      drawPolygon(ctx, 7, 3, -Math.PI / 2);
      drawDot(ctx, 2);
    },
  },
  // Stage 5 — Crystalline: pentagon + inner circle
  {
    headR: 28,
    trailLen: 40,
    blobAnchors: 7,
    blobAmpR: 0.18,
    draw(ctx) {
      drawPolygon(ctx, 15, 5, -Math.PI / 2);
      drawCircle(ctx, 8);
    },
  },
  // Stage 6 — Crystalline: hexagon + inverted triangle
  {
    headR: 31,
    trailLen: 50,
    blobAnchors: 7,
    blobAmpR: 0.15,
    draw(ctx) {
      drawPolygon(ctx, 19, 6, 0);
      drawPolygon(ctx, 9, 3, Math.PI / 2);
    },
  },
  // Stage 7 — Crystalline: two overlapping squares (octagram)
  {
    headR: 34,
    trailLen: 60,
    blobAnchors: 8,
    blobAmpR: 0.13,
    draw(ctx) {
      drawPolygon(ctx, 19, 4, 0);
      drawPolygon(ctx, 19, 4, Math.PI / 4);
    },
  },
  // Stage 8 — Apex: 6-star + center dot
  {
    headR: 37,
    trailLen: 70,
    blobAnchors: 8,
    blobAmpR: 0.10,
    draw(ctx) {
      drawStar(ctx, 22, 12, 6, 0);
      drawDot(ctx, 2.5);
    },
  },
  // Stage 9 — Apex: 6-star + octagon
  {
    headR: 40,
    trailLen: 80,
    blobAnchors: 10,
    blobAmpR: 0.07,
    draw(ctx) {
      drawStar(ctx, 23, 13, 6, 0);
      drawPolygon(ctx, 15, 8, Math.PI / 8);
    },
  },
  // Stage 10 — Apex: full complexity
  {
    headR: 43,
    trailLen: 95,
    blobAnchors: 12,
    blobAmpR: 0.05,
    draw(ctx) {
      drawStar(ctx, 26, 16, 6, 0);
      drawPolygon(ctx, 17, 8, Math.PI / 8);
      drawCircle(ctx, 11);
      drawDot(ctx, 2.5);
      drawTicks(ctx, 26, 12, 5);
    },
  },
];
```

**Step 2: Replace `getCreatureCanvas` body to draw ambient glow only (lines 213–275)**

Find the entire `getCreatureCanvas` function:
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

  // — Volumetric fill (shadowBlur OFF) —
  // Subtle tinted body volume
  octx.save();
  octx.globalAlpha = 0.18;
  octx.fillStyle = color;
  octx.beginPath();
  octx.arc(0, 0, r, 0, Math.PI * 2);
  octx.fill();
  octx.restore();

  // Dark edge shading (bottom-right)
  const shadowGrad = octx.createRadialGradient(r * 0.1, r * 0.15, 0, 0, 0, r);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0.55)');
  octx.fillStyle = shadowGrad;
  octx.beginPath();
  octx.arc(0, 0, r, 0, Math.PI * 2);
  octx.fill();

  // Top-left highlight
  const hlGrad = octx.createRadialGradient(-r * 0.35, -r * 0.35, 0, 0, 0, r);
  hlGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
  hlGrad.addColorStop(0.45, 'rgba(255,255,255,0)');
  octx.fillStyle = hlGrad;
  octx.beginPath();
  octx.arc(0, 0, r, 0, Math.PI * 2);
  octx.fill();

  // Specular dot (small bright highlight)
  const specGrad = octx.createRadialGradient(-r * 0.3, -r * 0.32, 0, -r * 0.3, -r * 0.32, r * 0.22);
  specGrad.addColorStop(0, 'rgba(255,255,255,0.65)');
  specGrad.addColorStop(1, 'rgba(255,255,255,0)');
  octx.fillStyle = specGrad;
  octx.beginPath();
  octx.arc(-r * 0.3, -r * 0.32, r * 0.22, 0, Math.PI * 2);
  octx.fill();

  // — Glow strokes (shadowBlur ON) —
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

**Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓|built"
```

Expected: `✓ built` with no errors.

**Step 4: Commit**

```bash
git add src/components/UI/AlienSnake.jsx
git commit -m "feat: redesign STAGES with new radii + blobAnchors/blobAmpR; creature cache → ambient glow only"
```

---

## Task 3: Add blob draw system + wire into draw loop and player state

**Files:**
- Modify: `src/components/UI/AlienSnake.jsx` (lines 290–305, 697–720, 892–905, 970–976, 1117–1139)

**Step 1: Add `drawBlobCreature` function after `drawCreature`**

The existing `drawCreature` function ends at line 305. Add the new function immediately after it (before `drawTrail`):

Find:
```js
function drawTrail(ctx, trail, headR, damaged, time, stage) {
```

Insert before it:
```js
function drawBlobCreature(ctx, x, y, stage, damaged, now, phases) {
  const stageDef = STAGES[stage];
  if (!stageDef) return;

  const flickerOn = damaged ? Math.floor(now / 120) % 2 === 0 : false;
  const color = (damaged && flickerOn) ? '#ff4444' : '#00ff6a';
  const r = stageDef.headR;
  const amplitude = stageDef.blobAmpR * r;
  const n = phases.length;

  // Drop shadow
  drawDropShadow(ctx, x, y, r);

  // Ambient glow from cache
  const oc = getCreatureCanvas(stage, color);
  const cacheSize = (r + CACHE_PAD) * 2;
  ctx.drawImage(oc, x - cacheSize / 2, y - cacheSize / 2, cacheSize, cacheSize);

  // Animated blob outline — N anchor points connected by quadratic bezier curves
  const pts = [];
  for (let i = 0; i < n; i++) {
    const baseAngle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const ri = r + amplitude * Math.sin(now * 0.0009 + phases[i]);
    pts.push({ x: x + Math.cos(baseAngle) * ri, y: y + Math.sin(baseAngle) * ri });
  }

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  const startMid = { x: (pts[n - 1].x + pts[0].x) / 2, y: (pts[n - 1].y + pts[0].y) / 2 };
  ctx.moveTo(startMid.x, startMid.y);
  for (let i = 0; i < n; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const mid = { x: (curr.x + next.x) / 2, y: (curr.y + next.y) / 2 };
    ctx.quadraticCurveTo(curr.x, curr.y, mid.x, mid.y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Inner detail strokes on top of blob
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.2;
  ctx.shadowBlur = 0;
  stageDef.draw(ctx);
  ctx.restore();
}

```

**Step 2: Add `blobPhases` to `player` in `buildInitialState`**

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
      blobPhases: Array.from({ length: STAGES[1].blobAnchors }, () => Math.random() * Math.PI * 2),
    },
```

**Step 3: Add `blobPhases` reassignment on stage-up in `update()`**

Find:
```js
        if (stage < 10 && g.absorbCount >= threshold) {
          player.stage++;
          g.absorbCount = 0;
          player.hp = 2;
          spawnEnemiesForStage(player.stage, W, H, enemies);
        }
```

Replace with:
```js
        if (stage < 10 && g.absorbCount >= threshold) {
          player.stage++;
          g.absorbCount = 0;
          player.hp = 2;
          player.blobPhases = Array.from({ length: STAGES[player.stage].blobAnchors }, () => Math.random() * Math.PI * 2);
          spawnEnemiesForStage(player.stage, W, H, enemies);
        }
```

**Step 4: Add `blobPhases` reassignment on stage-down in `applyDamage`**

Find:
```js
      player.stage--;
      player.hp = 2;
      g.absorbCount = 0;
```

Replace with:
```js
      player.stage--;
      player.hp = 2;
      g.absorbCount = 0;
      player.blobPhases = Array.from({ length: STAGES[player.stage].blobAnchors }, () => Math.random() * Math.PI * 2);
```

**Step 5: Replace `drawCreature` call with `drawBlobCreature` in `draw()`**

Find:
```js
    drawTrail(ctx, player.trail, stageDef?.headR ?? 10, damaged, now, player.stage);
    drawCreature(ctx, player.x, player.y, player.stage, damaged, now);
```

Replace with:
```js
    drawTrail(ctx, player.trail, stageDef?.headR ?? 10, damaged, now, player.stage);
    drawBlobCreature(ctx, player.x, player.y, player.stage, damaged, now, player.blobPhases);
```

**Step 6: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓|built"
```

Expected: `✓ built` with no errors.

**Step 7: Visual verification**

Run `npm run dev`, open the game. Confirm:
- Player creature has an organic wobbly outline that shifts continuously
- Stage 1 blob is small and visibly wobbly; stage 10 barely pulses
- Inner details (dot, dots, ring, triangles, etc.) are visible inside the blob
- Drop shadow still appears beneath the creature
- Enemies/collectibles/obstacles are flat neon stroke shapes (no 3D gradient)
- No visual glitches or stuck shapes on evolve

**Step 8: Commit**

```bash
git add src/components/UI/AlienSnake.jsx
git commit -m "feat: add bezier blob animation to player creature across all 10 stages"
```
