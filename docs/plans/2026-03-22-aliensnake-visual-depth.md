# AlienSnake Visual Depth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add volumetric shading and living-organism animation to AlienSnake entities to make the game feel dimensional rather than flat.

**Architecture:** Two independent improvements — (1) baked shading gradients added to all four offscreen caches (zero per-frame cost), and (2) runtime animations: drop shadow ellipses per entity, enemy breathing via scale transform, and player inner-layer counter-rotation drawn fresh each frame. All changes are isolated to `AlienSnake.jsx`.

**Tech Stack:** Canvas 2D, `createRadialGradient`, `requestAnimationFrame` delta-time loop already in place.

---

## Context You Must Read First

File: `src/components/UI/AlienSnake.jsx`

Key sections:
- Lines 162–183: `getCreatureCanvas(stage, color)` — offscreen cache for player
- Lines 320–338: `getEnemyCanvas(type)` — offscreen cache for enemies
- Lines 281–302: `getCollectibleCanvas(shapeIdx, r)` — offscreen cache for collectibles
- Lines 357–387: `getObstacleCanvas(shapeType, r)` — offscreen cache for obstacles
- Lines 340–348: `drawEnemy(ctx, e)` — blits enemy cache each frame
- Lines 304–313: `drawCollectible(ctx, c)` — blits collectible cache each frame
- Lines 185–199: `drawCreature(ctx, x, y, stage, damaged, time, scale, alpha)` — blits creature cache
- Lines 389–398: `drawObstacle(ctx, o)` — blits obstacle cache
- Lines 460–473: `spawnEnemy(type, W, H)` — creates enemy object
- Lines 475–497: `buildInitialState(W, H, isTouch)` — player starts with `{ x, y, vx, vy, stage:1, hp:2, ... }`
- Lines 849–903: `draw(now, W, H)` — main draw function, render order: grid → obstacles → collectibles → effects → enemies → particles → trail → creature → label
- Lines 681+: `update(delta, now, W, H)` — game logic loop

Key geometry helpers (lines 10–68): `drawCircle`, `drawDot`, `drawPolygon`, `drawStar`, `drawRing`, `drawTicks` — all operate on a translated/rotated context centered at (0,0).

---

## Task 1: Volumetric shading — creature cache

**Files:**
- Modify: `src/components/UI/AlienSnake.jsx` (function `getCreatureCanvas`, lines ~162–183)

**Step 1: Replace `getCreatureCanvas` body with shading version**

The shading is drawn in two passes — gradients BEFORE the glow strokes (so `shadowBlur` doesn't bleed into the fill). The base fill + highlight/shadow gradients + specular dot all have `shadowBlur = 0`.

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
  octx.globalAlpha = 0.18;
  octx.fillStyle = color;
  octx.beginPath();
  octx.arc(0, 0, r, 0, Math.PI * 2);
  octx.fill();
  octx.globalAlpha = 1;

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

  _creatureCache.set(key, oc);
  return oc;
}
```

**Step 2: Verify visually**
Run `npm run dev`, open the game, start playing. The player shape should now look like a glowing sphere/orb — bright top-left, darker bottom-right, with a small white specular dot. The outer glow strokes should appear unchanged.

**Step 3: Commit**
```bash
git add src/components/UI/AlienSnake.jsx
git commit -m "feat: volumetric shading on creature cache"
```

---

## Task 2: Volumetric shading — enemy, collectible, obstacle caches

**Files:**
- Modify: `src/components/UI/AlienSnake.jsx` (functions `getEnemyCanvas`, `getCollectibleCanvas`, `getObstacleCanvas`)

### Enemy cache

Replace `getEnemyCanvas` with the shaded version. Enemy radius is `15`.

```js
function getEnemyCanvas(type) {
  if (_enemyCache.has(type)) return _enemyCache.get(type);

  const color = type === 'chaser' ? '#ff6644' : '#ff4400';
  const r = 15;
  const logSize = (r + ENEMY_PAD) * 2;
  const oc = document.createElement('canvas');
  oc.width = logSize * _cachedDPR;
  oc.height = logSize * _cachedDPR;
  const octx = oc.getContext('2d');
  octx.scale(_cachedDPR, _cachedDPR);
  octx.translate(logSize / 2, logSize / 2);

  // Volumetric fill
  octx.globalAlpha = 0.18;
  octx.fillStyle = color;
  octx.beginPath();
  octx.arc(0, 0, r, 0, Math.PI * 2);
  octx.fill();
  octx.globalAlpha = 1;

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

  // Glow strokes
  octx.shadowColor = '#ff3300';
  octx.shadowBlur = 16;
  octx.strokeStyle = color;
  octx.lineWidth = 1.8;
  drawStar(octx, r, 8, 4, 0);

  _enemyCache.set(type, oc);
  return oc;
}
```

### Collectible cache

In `getCollectibleCanvas`, add the same shading block between the `octx.translate` and the existing `octx.shadowColor` lines. Use `rKey` as the radius:

```js
  // — Volumetric fill (before glow strokes) —
  octx.globalAlpha = 0.15;
  octx.fillStyle = '#00ff6a';
  octx.beginPath();
  octx.arc(0, 0, rKey, 0, Math.PI * 2);
  octx.fill();
  octx.globalAlpha = 1;

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
  // — End volumetric fill —
```

### Obstacle cache

In `getObstacleCanvas`, add same shading block using `rKey` as radius, before the existing `octx.shadowColor` line. Use `'rgba(200,50,0,0.6)'` for the dark edge instead of pure black (keeps it in the red palette):

```js
  // — Volumetric fill —
  octx.globalAlpha = 0.2;
  octx.fillStyle = '#ff3300';
  octx.beginPath();
  octx.arc(0, 0, rKey, 0, Math.PI * 2);
  octx.fill();
  octx.globalAlpha = 1;

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
  // — End volumetric fill —
```

**Verify:** All entity types — player, enemies, collectibles, red obstacles — should now have visible shading depth.

**Commit:**
```bash
git add src/components/UI/AlienSnake.jsx
git commit -m "feat: volumetric shading on enemy, collectible, obstacle caches"
```

---

## Task 3: Drop shadow ellipses

**Files:**
- Modify: `src/components/UI/AlienSnake.jsx`

**Step 1: Add `drawDropShadow` helper** (place near the other draw helpers, around line 400)

```js
function drawDropShadow(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x + 4, y + 6);
  ctx.scale(1, 0.3);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fill();
  ctx.restore();
}
```

**Step 2: Call `drawDropShadow` in each draw function, before the cache blit**

In `drawCreature` (before `ctx.drawImage`):
```js
  drawDropShadow(ctx, x, y, stageDef.headR * scale);
  ctx.drawImage(oc, x - size / 2, y - size / 2, size, size);
```

In `drawEnemy` (before `ctx.drawImage`):
```js
  drawDropShadow(ctx, e.x, e.y, 15);
  // existing ctx.save/translate/rotate/drawImage
```

In `drawCollectible` (before `ctx.drawImage`):
```js
  drawDropShadow(ctx, c.x, c.y, c.r);
  // existing ctx.save/translate/rotate/drawImage
```

In `drawObstacle` (before `ctx.drawImage`):
```js
  drawDropShadow(ctx, o.x, o.y, o.r);
  // existing ctx.save/translate/rotate/drawImage
```

**Note:** `drawDropShadow` has its own `ctx.save/restore` so it doesn't affect surrounding state.

**Verify:** Each entity should cast a subtle flat shadow offset below and to the right — classic floating-object illusion.

**Commit:**
```bash
git add src/components/UI/AlienSnake.jsx
git commit -m "feat: drop shadow ellipses on all game entities"
```

---

## Task 4: Enemy breathing

**Files:**
- Modify: `src/components/UI/AlienSnake.jsx` (functions `spawnEnemy`, `drawEnemy`, call site in `draw`)

**Step 1: Add breathe properties to `spawnEnemy`**

```js
function spawnEnemy(type, W, H) {
  const pos = randomPos(W, H, 60);
  return {
    ...pos,
    type,
    rotation: 0,
    lastShot: performance.now() + 800 + Math.random() * 1200,
    speed: type === 'chaser' ? 75 : 90,
    waypoints: type === 'patroller' ? makeWaypoints(W, H) : [],
    waypointIdx: 0,
    vx: 0,
    vy: 0,
    breathePhase: Math.random() * Math.PI * 2,
    breatheSpeed: 0.0015 + Math.random() * 0.001,
  };
}
```

**Step 2: Update `drawEnemy` to accept `now` and apply scale**

```js
function drawEnemy(ctx, e, now) {
  const logSize = (15 + ENEMY_PAD) * 2;
  const oc = getEnemyCanvas(e.type);
  const breatheScale = 1 + 0.06 * Math.sin(now * e.breatheSpeed + e.breathePhase);
  drawDropShadow(ctx, e.x, e.y, 15 * breatheScale);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.rotation);
  ctx.scale(breatheScale, breatheScale);
  ctx.drawImage(oc, -logSize / 2, -logSize / 2, logSize, logSize);
  ctx.restore();
}
```

**Step 3: Pass `now` to `drawEnemy` in `draw()`**

Find the line (around line 882):
```js
enemies.forEach(e => drawEnemy(ctx, e));
```
Change to:
```js
enemies.forEach(e => drawEnemy(ctx, e, now));
```

**Verify:** Enemies should slowly pulse in size, each on a different rhythm. The effect is subtle — a 6% scale oscillation at roughly a 4-second period.

**Commit:**
```bash
git add src/components/UI/AlienSnake.jsx
git commit -m "feat: enemy breathing animation via scale oscillation"
```

---

## Task 5: Player inner layer independent rotation

**Files:**
- Modify: `src/components/UI/AlienSnake.jsx` (functions `buildInitialState`, `update`, `draw`)

**Step 1: Add `innerAngle` to player in `buildInitialState`**

In the `player` object inside `buildInitialState`:
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

**Step 2: Increment `innerAngle` in `update`**

In `update(delta, now, W, H)`, find where `player` is destructured from `g`, then after the player movement block, add:

```js
player.innerAngle += delta * 2.2; // ~2.2 rad/sec counter-rotation
```

**Step 3: Draw inner layer in `draw()`**

After the `drawCreature(...)` call (around line 894), add:

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

**Verify:**
- At stage 1 (SPORE) nothing extra renders — correct, there's no inner layer.
- At stage 2+ the inner polygon counter-rotates independently of the outer shell.
- When damaged, the inner layer flickers red along with the outer creature.
- Performance: this is 5–8 line segments per frame, negligible.

**Commit:**
```bash
git add src/components/UI/AlienSnake.jsx
git commit -m "feat: player inner layer counter-rotation for living organism feel"
```
