# Monolith & Tetris Refinements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reshape the monolith into a pyramid with geometric canvas symbols and hover-spin acceleration; redesign the Tetris overlay with bigger/sparser UI and wireframe-only blocks.

**Architecture:** Three targeted file rewrites — Monolith.jsx (geometry + texture + spin), AlienTetris.css (cell wireframe + typography scale-up), AlienTetris.jsx (remove glyphs, simplify sidebar). No new files. No Galaxy.jsx changes needed.

**Tech Stack:** React Three Fiber + Three.js ConeGeometry (monolith), Canvas 2D API (symbol texture), plain CSS custom properties (wireframe cell coloring), React state (unchanged game logic).

---

## Task 1: Rewrite Monolith.jsx

**Files:**
- Modify: `src/components/Galaxy/Monolith.jsx` (full rewrite — all 182 lines replaced)

The entire file is replaced. Key changes vs current:
1. `createRuneTexture` → `createSymbolTexture` (canvas-drawn geometric shapes, no Unicode)
2. `RUNE_CHARS` constant deleted
3. `spinSpeedRef` added for lerped spin acceleration on hover
4. Box geometries → ConeGeometry (4-sided pyramid)
5. Rim glow updated to matching ConeGeometry

**Step 1: Replace the file**

Write `src/components/Galaxy/Monolith.jsx` with the full content below:

```jsx
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const EMISSIVE_IDLE  = new THREE.Color('#00ff6a');
const EMISSIVE_PULSE = new THREE.Color('#aaffee');

const IDLE_SPIN  = 0.09;
const HOVER_SPIN = 0.9;

// ── 8 canvas-drawn geometric symbols ─────────────────────────────────────────

function drawSymbol(ctx, idx, cx, cy, r, alpha) {
  ctx.save();
  ctx.strokeStyle = `rgba(0, 255, 106, ${alpha})`;
  ctx.lineWidth   = Math.max(1, r * 0.12);
  ctx.fillStyle   = `rgba(0, 255, 106, ${alpha})`;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  switch (idx) {
    case 0: // Dotted circle
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2); ctx.fill();
      break;
    case 1: // Bisected triangle (upward, horizontal line through center)
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.87, cy + r * 0.5);
      ctx.lineTo(cx - r * 0.87, cy + r * 0.5);
      ctx.closePath(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.44, cy); ctx.lineTo(cx + r * 0.44, cy);
      ctx.stroke();
      break;
    case 2: { // Crossed square
      const hs = r * 0.8;
      ctx.beginPath(); ctx.rect(cx - hs, cy - hs, hs * 2, hs * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - hs, cy - hs); ctx.lineTo(cx + hs, cy + hs);
      ctx.moveTo(cx + hs, cy - hs); ctx.lineTo(cx - hs, cy + hs);
      ctx.stroke();
      break;
    }
    case 3: // Concentric rings
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.stroke();
      break;
    case 4: // Inverted triangle
      ctx.beginPath();
      ctx.moveTo(cx, cy + r);
      ctx.lineTo(cx + r * 0.87, cy - r * 0.5);
      ctx.lineTo(cx - r * 0.87, cy - r * 0.5);
      ctx.closePath(); ctx.stroke();
      break;
    case 5: // Diamond + center dot
      ctx.beginPath();
      ctx.moveTo(cx,          cy - r);
      ctx.lineTo(cx + r * 0.65, cy);
      ctx.lineTo(cx,          cy + r);
      ctx.lineTo(cx - r * 0.65, cy);
      ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2); ctx.fill();
      break;
    case 6: // Mirrored arcs
      ctx.beginPath();
      ctx.arc(cx - r * 0.3, cy, r * 0.65, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + r * 0.3, cy, r * 0.65, Math.PI - Math.PI * 0.6, Math.PI + Math.PI * 0.6);
      ctx.stroke();
      break;
    case 7: // Radial spokes (6 lines from a central ring)
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2); ctx.stroke();
      for (let s = 0; s < 6; s++) {
        const a = (s / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.35, cy + Math.sin(a) * r * 0.35);
        ctx.lineTo(cx + Math.cos(a) * r,         cy + Math.sin(a) * r);
        ctx.stroke();
      }
      break;
    default: break;
  }
  ctx.restore();
}

function createSymbolTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, size, size);

  const seed = 99;
  const rng = (i) => ((Math.sin(i * 127.1 + seed) * 43758.5453) % 1 + 1) % 1;

  for (let i = 0; i < 14; i++) {
    const x     = rng(i * 4)     * size;
    const y     = rng(i * 4 + 1) * size;
    const r     = size * (0.03 + rng(i * 4 + 2) * 0.04);
    const alpha = 0.2 + rng(i * 4 + 3) * 0.3;
    drawSymbol(ctx, i % 8, x, y, r, alpha);
  }

  return new THREE.CanvasTexture(canvas);
}

let _symbolTexCache = null;
function getSymbolTexture() {
  if (!_symbolTexCache) _symbolTexCache = createSymbolTexture();
  return _symbolTexCache;
}

// ── Wisp glow sprite ──────────────────────────────────────────────────────────

function createWispGlow() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0,   'rgba(0, 255, 106, 1.0)');
  grad.addColorStop(0.3, 'rgba(0, 200, 80,  0.5)');
  grad.addColorStop(1.0, 'rgba(0, 100, 40,  0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

let _wispCache = null;
function getWispTex() {
  if (!_wispCache) _wispCache = createWispGlow();
  return _wispCache;
}

// ── Wisp orbit data ───────────────────────────────────────────────────────────

const WISP_COUNT = 4;

function buildWispData() {
  return Array.from({ length: WISP_COUNT }, (_, i) => ({
    theta:    (i / WISP_COUNT) * Math.PI * 2,
    speed:    (0.25 + i * 0.07) * (i % 2 === 0 ? 1 : -1),
    radius:   2.2 + i * 0.15,
    bobPhase: i * 1.3,
    bobAmp:   0.15 + i * 0.04,
    bobSpeed: 0.4 + i * 0.1,
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Monolith({ position = [2, 28, -3], onOpen, pulse = false }) {
  const groupRef     = useRef();
  const mainMatRef   = useRef();
  const hoverRef     = useRef(false);
  const pulseRef     = useRef(0);
  const spinSpeedRef = useRef(IDLE_SPIN);
  const basePosRef   = useRef(position);

  const symbolTex = useMemo(() => getSymbolTexture(), []);
  const wispTex   = useMemo(() => getWispTex(),        []);
  const wispData  = useMemo(() => buildWispData(),     []);

  const wispGeo = useMemo(() => {
    const positions = new Float32Array(WISP_COUNT * 3);
    const geo  = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(positions, 3);
    attr.usage = THREE.DynamicDrawUsage;
    geo.setAttribute('position', attr);
    return geo;
  }, []);

  useEffect(() => {
    return () => { wispGeo.dispose(); };
  }, [wispGeo]);

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;

    // Lerped spin — accelerates on hover
    const targetSpin = hoverRef.current ? HOVER_SPIN : IDLE_SPIN;
    spinSpeedRef.current += (targetSpin - spinSpeedRef.current) * Math.min(delta * 4, 1);
    g.rotation.y += spinSpeedRef.current * delta;

    // Y bob
    const t = state.clock.elapsedTime;
    g.position.x = basePosRef.current[0];
    g.position.y = basePosRef.current[1] + Math.sin(t * 0.5) * 0.2;
    g.position.z = basePosRef.current[2];

    // Emissive intensity lerp
    const targetIntensity = pulse ? 1.8 : (hoverRef.current ? 0.55 : 0.15);
    pulseRef.current += (targetIntensity - pulseRef.current) * Math.min(delta * 3, 1);
    if (mainMatRef.current) {
      mainMatRef.current.emissiveIntensity = pulseRef.current;
      mainMatRef.current.emissive.copy(pulse ? EMISSIVE_PULSE : EMISSIVE_IDLE);
    }

    // Wisp orbit
    const posAttr = wispGeo.attributes.position;
    wispData.forEach((w, i) => {
      w.theta += w.speed * delta;
      const r = w.radius + Math.sin(t * w.bobSpeed + w.bobPhase) * w.bobAmp;
      posAttr.setXYZ(i, Math.cos(w.theta) * r, Math.sin(t * 0.3 + w.bobPhase) * 0.4, Math.sin(w.theta) * r);
    });
    posAttr.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Invisible hit zone — generous cone around the pyramid */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onOpen?.(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; hoverRef.current = true; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; hoverRef.current = false; }}
      >
        <coneGeometry args={[3.5, 9, 4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Main pyramid */}
      <mesh>
        <coneGeometry args={[2.5, 7, 4]} />
        <meshStandardMaterial
          ref={mainMatRef}
          color="#0a0a0f"
          map={symbolTex}
          emissiveMap={symbolTex}
          emissive="#00ff6a"
          emissiveIntensity={0.15}
          metalness={0.7}
          roughness={0.4}
        />
      </mesh>

      {/* Rim glow — slightly larger BackSide copy */}
      <mesh>
        <coneGeometry args={[2.7, 7.2, 4]} />
        <meshBasicMaterial
          color="#00ff6a"
          side={THREE.BackSide}
          transparent
          opacity={0.07}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Energy wisps */}
      <points renderOrder={1} geometry={wispGeo}>
        <pointsMaterial
          map={wispTex}
          color="#88ffaa"
          size={0.22}
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          alphaTest={0.01}
        />
      </points>
    </group>
  );
}
```

**Step 2: Verify the file saved correctly**

Read back the file. Confirm:
- `createSymbolTexture` present (not `createRuneTexture`)
- `RUNE_CHARS` is gone
- `spinSpeedRef` declared and used in `useFrame`
- JSX has `<coneGeometry args={[2.5, 7, 4]} />` (not boxGeometry)
- Hit zone has `<coneGeometry args={[3.5, 9, 4]} />`

---

## Task 2: Rewrite AlienTetris.css

**Files:**
- Modify: `src/components/UI/AlienTetris.css` (full rewrite)

Key changes vs current:
- Cell size 28px → 36px (affects board grid and `.tetris-cell`)
- `.tetris-cell.filled`: background transparent, border + glow via `--cell-color` CSS var
- `.tetris-cell.ghost`: dashed border, no glow
- Remove `.cell-glyph` show rule (kept for safety but hidden via display:none)
- Typography blown up throughout
- Sidebar width 110px → 140px, padding 20px → 28px

**Step 1: Replace the file**

Write `src/components/UI/AlienTetris.css` with the full content below:

```css
/* ── Overlay ─────────────────────────────────────────────────────── */
.alien-tetris-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.8);
}

/* ── Container ───────────────────────────────────────────────────── */
.alien-tetris-container {
  display: flex;
  gap: 28px;
  align-items: flex-start;
  background: rgba(0, 0, 0, 0.97);
  border: 1px solid rgba(0, 255, 106, 0.6);
  box-shadow: 0 0 32px rgba(0, 255, 106, 0.18), inset 0 0 32px rgba(0, 255, 106, 0.03);
  padding: 28px;
  font-family: 'Courier New', monospace;
  color: rgba(0, 255, 106, 0.9);
  position: relative;
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 255, 106, 0.012) 2px,
    rgba(0, 255, 106, 0.012) 4px
  );
}

/* ── Header ──────────────────────────────────────────────────────── */
.tetris-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  letter-spacing: 0.15em;
}
.tetris-title {
  font-size: 18px;
  font-weight: bold;
  color: rgba(0, 255, 106, 0.95);
  letter-spacing: 0.25em;
  text-shadow: 0 0 12px rgba(0, 255, 106, 0.4);
}
.tetris-close-btn {
  background: none;
  border: 1px solid rgba(0, 255, 106, 0.3);
  color: rgba(0, 255, 106, 0.5);
  font-family: monospace;
  font-size: 12px;
  padding: 4px 10px;
  cursor: pointer;
  letter-spacing: 0.12em;
  transition: all 0.2s;
}
.tetris-close-btn:hover {
  border-color: rgba(0, 255, 106, 0.8);
  color: rgba(0, 255, 106, 1);
}

/* ── Sidebar ─────────────────────────────────────────────────────── */
.tetris-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 140px;
}
.tetris-sidebar-label {
  font-size: 13px;
  letter-spacing: 0.2em;
  color: rgba(0, 255, 106, 0.5);
  margin-bottom: 8px;
}
.tetris-next-box {
  border: 1px solid rgba(0, 255, 106, 0.25);
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 90px;
}
.tetris-signal-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tetris-signal-value {
  font-size: 28px;
  font-weight: bold;
  color: rgba(0, 255, 106, 1);
  letter-spacing: 0.05em;
  line-height: 1;
  text-shadow: 0 0 16px rgba(0, 255, 106, 0.5);
}
.tetris-signal-label {
  font-size: 13px;
  letter-spacing: 0.2em;
  color: rgba(0, 255, 106, 0.5);
  margin-bottom: 4px;
}
.tetris-signal-secondary {
  font-size: 10px;
  letter-spacing: 0.12em;
  color: rgba(0, 255, 106, 0.35);
  margin-top: 6px;
}

/* Signal bar */
.signal-bar-track {
  height: 5px;
  background: rgba(0, 255, 106, 0.08);
  border: 1px solid rgba(0, 255, 106, 0.18);
  margin-top: 6px;
}
.signal-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #003322, #00ff6a);
  transition: width 0.3s ease;
  box-shadow: 0 0 8px rgba(0, 255, 106, 0.6);
}

/* ── Board ───────────────────────────────────────────────────────── */
.tetris-board-wrap {
  display: flex;
  flex-direction: column;
}
.tetris-board {
  display: grid;
  grid-template-columns: repeat(10, 36px);
  grid-template-rows: repeat(20, 36px);
  border: 1px solid rgba(0, 255, 106, 0.25);
  box-shadow: 0 0 16px rgba(0, 255, 106, 0.08);
  gap: 1px;
  background: rgba(0, 0, 0, 0.9);
  position: relative;
}

/* ── Cells ───────────────────────────────────────────────────────── */
.tetris-cell {
  width: 36px;
  height: 36px;
  box-sizing: border-box;
  position: relative;
}
.tetris-cell.empty {
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(0, 255, 106, 0.05);
}

/* Wireframe filled cell — border + glow, no fill */
.tetris-cell.filled {
  background: transparent;
  border: 2px solid var(--cell-color, rgba(0, 255, 106, 0.8));
  box-shadow:
    0 0 6px var(--cell-color, rgba(0, 255, 106, 0.8)),
    inset 0 0 8px color-mix(in srgb, var(--cell-color, rgba(0,255,106,0.8)) 15%, transparent);
}

/* No glyphs */
.tetris-cell .cell-glyph {
  display: none;
}

/* Ghost — dashed outline only */
.tetris-cell.ghost {
  background: transparent;
  border: 1px dashed var(--cell-color, rgba(0, 255, 106, 0.3));
  opacity: 0.3;
}

/* Line-clear flash */
@keyframes lineClearFlash {
  0%   { background: rgba(255, 255, 255, 0.6); box-shadow: 0 0 20px rgba(255, 255, 255, 0.8); }
  100% { background: transparent; box-shadow: none; }
}
.tetris-cell.clearing {
  animation: lineClearFlash 0.25s ease-out forwards;
}

/* ── Controls hint ───────────────────────────────────────────────── */
.tetris-controls {
  margin-top: 12px;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: rgba(0, 255, 106, 0.3);
  text-align: center;
}

/* ── Game Over ───────────────────────────────────────────────────── */
.tetris-gameover-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.88);
  z-index: 10;
  gap: 20px;
}
.tetris-gameover-title {
  font-size: 26px;
  font-weight: bold;
  letter-spacing: 0.25em;
  color: #ff4444;
  text-shadow: 0 0 20px rgba(255, 68, 68, 0.8);
}
.tetris-gameover-sub {
  font-size: 11px;
  letter-spacing: 0.18em;
  color: rgba(255, 68, 68, 0.5);
}
.tetris-btn-row {
  display: flex;
  gap: 14px;
}
.tetris-btn {
  background: none;
  border: 1px solid rgba(0, 255, 106, 0.4);
  color: rgba(0, 255, 106, 0.8);
  font-family: monospace;
  font-size: 12px;
  letter-spacing: 0.18em;
  padding: 8px 20px;
  cursor: pointer;
  transition: all 0.2s;
}
.tetris-btn:hover {
  border-color: rgba(0, 255, 106, 1);
  color: #fff;
  box-shadow: 0 0 10px rgba(0, 255, 106, 0.4);
}

/* ── Victory ─────────────────────────────────────────────────────── */

@keyframes boardGlowPulse {
  0%   { box-shadow: 0 0 16px rgba(0, 255, 106, 0.08); }
  50%  { box-shadow: 0 0 60px rgba(0, 255, 106, 1), 0 0 100px rgba(0, 255, 106, 0.3); }
  100% { box-shadow: 0 0 24px rgba(0, 255, 106, 0.4); }
}
.tetris-board.win-glow {
  animation: boardGlowPulse 0.6s ease-in-out;
}

@keyframes cellCascade {
  0%   { background: rgba(0, 255, 106, 0.05); }
  40%  { background: rgba(0, 255, 106, 0.85); box-shadow: 0 0 12px rgba(0, 255, 106, 1); }
  100% { background: rgba(0, 255, 106, 0.25); }
}
.tetris-cell.cascade {
  animation: cellCascade 0.5s ease-out forwards;
  animation-delay: calc(var(--cascade-delay, 0) * 1ms);
}

@keyframes signalAcquiredIn {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.7); letter-spacing: 0.6em; }
  60%  { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
.win-signal-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  font-weight: bold;
  letter-spacing: 0.3em;
  color: #00ff6a;
  text-shadow: 0 0 28px rgba(0, 255, 106, 1), 0 0 56px rgba(0, 255, 106, 0.4);
  white-space: nowrap;
  z-index: 20;
  animation: signalAcquiredIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  pointer-events: none;
}

@keyframes particleFly {
  0%   { opacity: 1; transform: translate(0, 0) scale(1); }
  100% { opacity: 0; transform: translate(var(--px), var(--py)) scale(0.3); }
}
.win-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 16px;
  color: #00ff6a;
  text-shadow: 0 0 10px rgba(0, 255, 106, 0.9);
  pointer-events: none;
  animation: particleFly 1.2s ease-out forwards;
  animation-delay: var(--pdelay, 0ms);
  z-index: 25;
}

.tetris-close-channel {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  background: none;
  border: 1px solid rgba(0, 255, 106, 0.6);
  color: rgba(0, 255, 106, 0.9);
  font-family: monospace;
  font-size: 13px;
  letter-spacing: 0.22em;
  padding: 10px 24px;
  cursor: pointer;
  animation: signalAcquiredIn 0.4s 0.2s both;
  transition: all 0.2s;
}
.tetris-close-channel:hover {
  background: rgba(0, 255, 106, 0.08);
  box-shadow: 0 0 16px rgba(0, 255, 106, 0.4);
}
```

**Step 2: Verify the key changes**

Read the file back. Confirm:
- `grid-template-columns: repeat(10, 36px)` (not 28px)
- `.tetris-cell.filled` has `background: transparent` and `border: 2px solid var(--cell-color, ...)`
- `.tetris-title` has `font-size: 18px`
- `.tetris-signal-value` has `font-size: 28px`
- `.tetris-gameover-title` has `font-size: 26px`
- `.win-signal-text` has `font-size: 32px`

---

## Task 3: Update AlienTetris.jsx

**Files:**
- Modify: `src/components/UI/AlienTetris.jsx`

Changes (targeted edits, not a full rewrite):
1. Remove `glyph` properties from PIECES and the `RUNE_CHARS` constant
2. Update `WinParticles` to use geometric unicode chars instead of runic ones
3. Remove `<span className="cell-glyph">` from board cell render
4. Update cells to use `--cell-color` CSS var (remove `background: color` inline style)
5. Update `NextPiecePreview` cells to wireframe style
6. Replace sidebar: remove LINES + LEVEL sections, add combined `.tetris-signal-block`

**Step 1: Update PIECES — remove glyph properties**

In the PIECES object (lines 10–18), remove the `glyph` property from every piece. Each entry becomes e.g.:
```js
I: { cells: [[0,0],[0,1],[0,2],[0,3]], color: '#00ffff' },
```

Do this for all 7 pieces.

**Step 2: Remove RUNE_CHARS**

Delete the line `const RUNE_CHARS = ['ᚠ', 'ᛒ', 'ᚢ', 'ᛖ', 'ᛗ', 'ᚾ', 'ᛏ'];` (line 21).

**Step 3: Update WinParticles to use geometric chars**

Find `WinParticles` function. Replace the internal `RUNE_CHARS` array reference. The module-level `RUNE_CHARS` is now gone. Instead, `WinParticles` should define its own local geometric chars:

```js
function WinParticles() {
  const GEO_CHARS = ['+', '×', '◆', '◇', '△', '▽', '○'];
  const particles = useRef(
    Array.from({ length: 28 }, (_, i) => {
      const angle = (i / 28) * Math.PI * 2;
      const dist  = 80 + Math.random() * 120;
      return {
        px: `${Math.cos(angle) * dist}px`,
        py: `${Math.sin(angle) * dist}px`,
        delay: `${Math.random() * 400}ms`,
        char: GEO_CHARS[i % GEO_CHARS.length],
      };
    })
  );
  return (
    <>
      {particles.current.map((p, i) => (
        <span key={i} className="win-particle"
          style={{ '--px': p.px, '--py': p.py, '--pdelay': p.delay }}>
          {p.char}
        </span>
      ))}
    </>
  );
}
```

**Step 4: Update board cell render — wireframe, no glyphs**

Find the cell render inside `renderBoard.map(...)`. The current filled cell looks like:

```jsx
style={{
  background: cell && !cell.ghost ? color : undefined,
  color: color,
  '--cascade-delay': ...,
  borderColor: cell && !cell.ghost ? `${color}44` : undefined,
}}
```

Replace with:

```jsx
style={{
  '--cell-color': color || undefined,
  '--cascade-delay': winPhase >= 2 ? (ri * 18 + ci * 5) : 0,
}}
```

And remove the `<span className="cell-glyph">` inside cells entirely. The full cell render becomes:

```jsx
<div
  key={`${ri}-${ci}`}
  className={[
    'tetris-cell',
    cell ? (cell.ghost ? 'ghost' : 'filled') : 'empty',
    isClearing ? 'clearing' : '',
    winPhase >= 2 ? 'cascade' : '',
  ].filter(Boolean).join(' ')}
  style={{
    '--cell-color': color || undefined,
    '--cascade-delay': winPhase >= 2 ? (ri * 18 + ci * 5) : 0,
  }}
/>
```

Note the self-closing tag — no children.

**Step 5: Update NextPiecePreview to wireframe style**

Find `NextPiecePreview`. The filled cell style currently uses `background: filled ? color : ...`. Update to wireframe:

```jsx
<div key={ci} style={{
  width: 20, height: 20,
  background: 'transparent',
  border: filled ? `2px solid ${color}` : '1px solid rgba(0,255,106,0.06)',
  boxShadow: filled ? `0 0 5px ${color}` : 'none',
}}>
</div>
```

Note: no children (no glyph text).

**Step 6: Replace sidebar sections in JSX**

Find the sidebar `<div className="tetris-sidebar">` block. Currently it has 4 child divs: INCOMING (next piece), SIGNAL (score+bar), LINES, LEVEL. Replace the 4 children with just 2:

```jsx
<div className="tetris-sidebar">
  {/* Next piece */}
  <div>
    <div className="tetris-sidebar-label">INCOMING</div>
    <div className="tetris-next-box">
      <NextPiecePreview type={nextType} />
    </div>
  </div>

  {/* Signal block — score + bar + secondary stats */}
  <div className="tetris-signal-block">
    <div className="tetris-signal-label">SIGNAL</div>
    <div className="tetris-signal-value">{score}</div>
    <div className="signal-bar-track">
      <div className="signal-bar-fill" style={{ width: `${pct}%` }} />
    </div>
    <div style={{ marginTop: 2, fontSize: 9, opacity: 0.4, letterSpacing: '0.1em' }}>
      TARGET: {WIN_SCORE}
    </div>
    <div className="tetris-signal-secondary">
      L:{level} &nbsp;|&nbsp; {lines} LINES
    </div>
  </div>
</div>
```

**Step 7: Verify the file**

Read back the relevant sections. Confirm:
- PIECES entries have no `glyph` property
- `RUNE_CHARS` constant is gone from module scope
- `WinParticles` uses `GEO_CHARS` internally
- Board cell render has `'--cell-color': color || undefined` and NO `<span className="cell-glyph">`
- Sidebar has exactly 2 children: INCOMING and SIGNAL block
- `NextPiecePreview` cells have `background: 'transparent'` and `border: filled ? ...`

---

## Verification

```bash
npm run build
```
Expected: `✓ built` with no errors.

Then `npm run dev` and visually confirm:

1. **Monolith in scene**: pyramid shape (4-sided cone pointing up), visibly larger than before
2. **Monolith texture**: geometric symbols visible on faces (dotted circles, triangles, etc.) — no runic text
3. **Hover monolith**: spin noticeably accelerates; winds down smoothly after cursor leaves
4. **Win pulse**: monolith flashes bright teal after winning
5. **Game opens**: board cells are 36px, bigger overall feel
6. **Header**: "◈ SIGNAL INTERCEPT ◈" at ~18px — prominent
7. **Sidebar**: only INCOMING (next piece) + SIGNAL block with big score + `L:1 | 0 LINES` secondary line
8. **Blocks**: wireframe outlines only — colored borders with glow, transparent fill, no glyphs inside
9. **Ghost piece**: dashed border outline, very faint
10. **Win overlay**: "SIGNAL ACQUIRED" at 32px
11. **Loss overlay**: "SIGNAL LOST" at 26px
