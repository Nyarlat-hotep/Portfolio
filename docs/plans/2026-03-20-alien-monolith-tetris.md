# Alien Monolith Tetris Easter Egg — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a floating alien monolith above the planet cluster that launches a Tetris game reskinned in the site's scifi HUD aesthetic, with a victory spectacle when the player reaches 800 points.

**Architecture:** Three new files (Monolith.jsx, AlienTetris.jsx, AlienTetris.css) plus targeted edits to Galaxy.jsx. The Monolith is a React Three Fiber component placed in the 3D Canvas scene. AlienTetris is a pure React game overlay rendered via createPortal to document.body (same pattern as the existing asteroid modal). A shared `tetrisActiveRef` prevents the KeyboardCameraController from consuming arrow keys while the game is open.

**Tech Stack:** React Three Fiber + Three.js (monolith), React hooks + setInterval (game loop), Framer Motion AnimatePresence (overlay), CSS keyframe animations (victory spectacle), canvas API (rune texture).

---

## Task 1: Create Monolith.jsx

**Files:**
- Create: `src/components/Galaxy/Monolith.jsx`

**Reference:** Model closely after `src/components/Galaxy/Asteroid.jsx` for the canvas texture and wisp patterns.

**Step 1: Create the file with rune texture generator**

```jsx
// src/components/Galaxy/Monolith.jsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const RUNE_CHARS = ['ᚠ', 'ᛒ', 'ᚢ', 'ᛖ', 'ᛗ', 'ᚾ', 'ᛏ', 'ᚱ'];

function createRuneTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, size, size);

  ctx.font = `${Math.floor(size / 8)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const seed = 42;
  const rng = (i) => ((Math.sin(i * 127.1 + seed) * 43758.5453) % 1 + 1) % 1;

  for (let i = 0; i < 12; i++) {
    const x = rng(i * 3)     * size;
    const y = rng(i * 3 + 1) * size;
    const alpha = 0.25 + rng(i * 3 + 2) * 0.3;
    ctx.fillStyle = `rgba(0, 255, 106, ${alpha})`;
    ctx.fillText(RUNE_CHARS[i % RUNE_CHARS.length], x, y);
  }

  return new THREE.CanvasTexture(canvas);
}

let _runeTexCache = null;
function getRuneTexture() {
  if (!_runeTexCache) _runeTexCache = createRuneTexture();
  return _runeTexCache;
}
```

**Step 2: Add wisp glow texture (reuse Asteroid's pattern)**

```jsx
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
```

**Step 3: Build the WISP_DATA array and component scaffold**

```jsx
const WISP_COUNT = 4;

function buildWispData() {
  return Array.from({ length: WISP_COUNT }, (_, i) => ({
    theta:    (i / WISP_COUNT) * Math.PI * 2,
    speed:    (0.25 + i * 0.07) * (i % 2 === 0 ? 1 : -1),
    radius:   1.1 + i * 0.08,
    bobPhase: i * 1.3,
    bobAmp:   0.1 + i * 0.03,
    bobSpeed: 0.4 + i * 0.1,
  }));
}

export default function Monolith({ position = [2, 28, -3], onOpen, pulse = false }) {
  const groupRef    = useRef();
  const mainMatRef  = useRef();
  const rimMatRef   = useRef();
  const wispMatRef  = useRef();
  const hoverRef    = useRef(false);
  const pulseRef    = useRef(0); // 0→1 lerp for emissive

  const runeTex  = useMemo(() => getRuneTexture(), []);
  const wispTex  = useMemo(() => getWispTex(),    []);
  const wispData = useMemo(() => buildWispData(), []);

  const wispGeo = useMemo(() => {
    const positions = new Float32Array(WISP_COUNT * 3);
    const geo  = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(positions, 3);
    attr.usage = THREE.DynamicDrawUsage;
    geo.setAttribute('position', attr);
    return geo;
  }, []);
```

**Step 4: Add useFrame animation + JSX return**

```jsx
  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;

    // Slow Y spin
    g.rotation.y += delta * 0.09;

    // Gentle bob
    const t = state.clock.elapsedTime;
    g.position.y = position[1] + Math.sin(t * 0.5) * 0.15;

    // Emissive lerp: pulse > hover > idle
    const targetIntensity = pulse ? 1.8 : (hoverRef.current ? 0.5 : 0.12);
    pulseRef.current += (targetIntensity - pulseRef.current) * Math.min(delta * 3, 1);

    if (mainMatRef.current) {
      mainMatRef.current.emissiveIntensity = pulseRef.current;
      mainMatRef.current.emissive.set(pulse ? '#aaffee' : '#00ff6a');
    }

    // Animate wisps
    const posAttr = wispGeo.attributes.position;
    wispData.forEach((w, i) => {
      w.theta += w.speed * delta;
      const r  = w.radius + Math.sin(t * w.bobSpeed + w.bobPhase) * w.bobAmp;
      posAttr.setXYZ(i, Math.cos(w.theta) * r, Math.sin(t * 0.3 + w.bobPhase) * 0.3, Math.sin(w.theta) * r);
    });
    posAttr.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Invisible hit zone */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onOpen?.(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; hoverRef.current = true; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; hoverRef.current = false; }}
      >
        <boxGeometry args={[2, 8, 2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Main slab */}
      <mesh>
        <boxGeometry args={[0.7, 6, 0.25]} />
        <meshStandardMaterial
          ref={mainMatRef}
          color="#0a0a0f"
          map={runeTex}
          emissiveMap={runeTex}
          emissive="#00ff6a"
          emissiveIntensity={0.12}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>

      {/* Rim glow */}
      <mesh>
        <boxGeometry args={[0.78, 6.1, 0.33]} />
        <meshBasicMaterial
          ref={rimMatRef}
          color="#00ff6a"
          side={THREE.BackSide}
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Wisps */}
      <points renderOrder={1} geometry={wispGeo}>
        <pointsMaterial
          ref={wispMatRef}
          map={wispTex}
          color="#88ffaa"
          size={0.18}
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

**Step 5: Verify no import errors**
Look at the imports at the top of the file — ensure `useRef`, `useMemo` are imported from `'react'` and `useFrame` from `'@react-three/fiber'`. No other imports needed.

---

## Task 2: Create AlienTetris.css

**Files:**
- Create: `src/components/UI/AlienTetris.css`

**Step 1: Write the full CSS file**

```css
/* ── Overlay ─────────────────────────────────────────────────────── */
.alien-tetris-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.75);
}

/* ── Container ───────────────────────────────────────────────────── */
.alien-tetris-container {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  background: rgba(0, 0, 0, 0.97);
  border: 1px solid rgba(0, 255, 106, 0.6);
  box-shadow: 0 0 24px rgba(0, 255, 106, 0.2), inset 0 0 24px rgba(0, 255, 106, 0.03);
  padding: 20px;
  font-family: 'Courier New', monospace;
  color: rgba(0, 255, 106, 0.9);
  position: relative;
  /* scanline overlay */
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 255, 106, 0.015) 2px,
    rgba(0, 255, 106, 0.015) 4px
  );
}

/* ── Header ──────────────────────────────────────────────────────── */
.tetris-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  letter-spacing: 0.15em;
  font-size: 11px;
  color: rgba(0, 255, 106, 0.7);
}
.tetris-title {
  font-size: 13px;
  font-weight: bold;
  color: rgba(0, 255, 106, 0.95);
  letter-spacing: 0.2em;
}
.tetris-close-btn {
  background: none;
  border: 1px solid rgba(0, 255, 106, 0.3);
  color: rgba(0, 255, 106, 0.6);
  font-family: monospace;
  font-size: 10px;
  padding: 3px 8px;
  cursor: pointer;
  letter-spacing: 0.1em;
  transition: all 0.2s;
}
.tetris-close-btn:hover {
  border-color: rgba(0, 255, 106, 0.8);
  color: rgba(0, 255, 106, 1);
}

/* ── Sidebar (left panel) ────────────────────────────────────────── */
.tetris-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 110px;
}
.tetris-sidebar-label {
  font-size: 9px;
  letter-spacing: 0.2em;
  color: rgba(0, 255, 106, 0.5);
  margin-bottom: 6px;
}
.tetris-next-box {
  border: 1px solid rgba(0, 255, 106, 0.25);
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70px;
}
.tetris-stat {
  font-size: 10px;
  letter-spacing: 0.1em;
  line-height: 1.9;
  color: rgba(0, 255, 106, 0.7);
}
.tetris-stat-value {
  color: rgba(0, 255, 106, 1);
  font-size: 13px;
}

/* Signal bar */
.signal-bar-track {
  height: 6px;
  background: rgba(0, 255, 106, 0.1);
  border: 1px solid rgba(0, 255, 106, 0.2);
  margin-top: 4px;
  position: relative;
}
.signal-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #003322, #00ff6a);
  transition: width 0.3s ease;
  box-shadow: 0 0 6px rgba(0, 255, 106, 0.5);
}

/* ── Board ───────────────────────────────────────────────────────── */
.tetris-board-wrap {
  display: flex;
  flex-direction: column;
}
.tetris-board {
  display: grid;
  grid-template-columns: repeat(10, 28px);
  grid-template-rows: repeat(20, 28px);
  border: 1px solid rgba(0, 255, 106, 0.3);
  box-shadow: 0 0 12px rgba(0, 255, 106, 0.1);
  gap: 1px;
  background: rgba(0, 255, 106, 0.05);
}

.tetris-cell {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  box-sizing: border-box;
  position: relative;
}
.tetris-cell.empty {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(0, 255, 106, 0.04);
}
.tetris-cell.filled {
  border: 1px solid rgba(255,255,255,0.15);
  box-shadow: inset 0 0 4px rgba(255,255,255,0.1);
}
.tetris-cell.filled .cell-glyph {
  opacity: 0.35;
  font-size: 12px;
  pointer-events: none;
  user-select: none;
  color: rgba(255,255,255,0.9);
}
.tetris-cell.ghost {
  opacity: 0.25;
  border: 1px dashed currentColor;
  background: transparent !important;
}
.tetris-cell.ghost .cell-glyph { display: none; }

/* Line-clear flash */
@keyframes lineClearFlash {
  0%   { background: rgba(255,255,255,0.8); box-shadow: 0 0 16px rgba(255,255,255,0.9); }
  100% { background: transparent; }
}
.tetris-cell.clearing {
  animation: lineClearFlash 0.25s ease-out forwards;
}

/* ── Controls hint ───────────────────────────────────────────────── */
.tetris-controls {
  margin-top: 10px;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: rgba(0, 255, 106, 0.35);
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
  background: rgba(0,0,0,0.85);
  z-index: 10;
  gap: 16px;
}
.tetris-gameover-title {
  font-size: 15px;
  font-weight: bold;
  letter-spacing: 0.2em;
  color: #ff4444;
  text-shadow: 0 0 12px rgba(255,68,68,0.7);
}
.tetris-gameover-sub {
  font-size: 9px;
  letter-spacing: 0.15em;
  color: rgba(255,68,68,0.6);
}
.tetris-btn-row {
  display: flex;
  gap: 12px;
}
.tetris-btn {
  background: none;
  border: 1px solid rgba(0, 255, 106, 0.4);
  color: rgba(0, 255, 106, 0.8);
  font-family: monospace;
  font-size: 10px;
  letter-spacing: 0.15em;
  padding: 6px 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.tetris-btn:hover {
  border-color: rgba(0, 255, 106, 1);
  color: #fff;
  box-shadow: 0 0 8px rgba(0, 255, 106, 0.4);
}

/* ── Victory ─────────────────────────────────────────────────────── */

/* Phase 1 — board glow pulse */
@keyframes boardGlowPulse {
  0%   { box-shadow: 0 0 12px rgba(0, 255, 106, 0.1); }
  50%  { box-shadow: 0 0 40px rgba(0, 255, 106, 0.9), 0 0 80px rgba(0, 255, 106, 0.3); }
  100% { box-shadow: 0 0 20px rgba(0, 255, 106, 0.4); }
}
.tetris-board.win-glow {
  animation: boardGlowPulse 0.6s ease-in-out;
}

/* Phase 2 — cell cascade */
@keyframes cellCascade {
  0%   { background: rgba(0, 255, 106, 0.1); }
  40%  { background: rgba(0, 255, 106, 0.9); box-shadow: 0 0 10px rgba(0, 255, 106, 1); }
  100% { background: rgba(0, 255, 106, 0.3); }
}
.tetris-cell.cascade {
  animation: cellCascade 0.5s ease-out forwards;
  animation-delay: calc(var(--cascade-delay, 0) * 1ms);
}

/* Phase 3 — SIGNAL ACQUIRED text */
@keyframes signalAcquiredIn {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.7); letter-spacing: 0.5em; }
  60%  { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
@keyframes textGlitch {
  0%, 100% { clip-path: inset(0 0 100% 0); }
  10%       { clip-path: inset(10% 0 60% 0); transform: translate(-50%, -50%) translateX(-3px); }
  20%       { clip-path: inset(40% 0 30% 0); transform: translate(-50%, -50%) translateX(3px); }
  30%       { clip-path: inset(0 0 0 0);     transform: translate(-50%, -50%); }
}
.win-signal-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 22px;
  font-weight: bold;
  letter-spacing: 0.25em;
  color: #00ff6a;
  text-shadow: 0 0 20px rgba(0,255,106,0.9), 0 0 40px rgba(0,255,106,0.4);
  white-space: nowrap;
  z-index: 20;
  animation: signalAcquiredIn 0.5s cubic-bezier(0.4,0,0.2,1) forwards;
  pointer-events: none;
}

/* Phase 4 — particle burst */
@keyframes particleFly {
  0%   { opacity: 1; transform: translate(0, 0) scale(1); }
  100% { opacity: 0; transform: translate(var(--px), var(--py)) scale(0.3); }
}
.win-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 14px;
  color: #00ff6a;
  text-shadow: 0 0 8px rgba(0, 255, 106, 0.9);
  pointer-events: none;
  animation: particleFly 1.2s ease-out forwards;
  animation-delay: var(--pdelay, 0ms);
  z-index: 25;
}

/* Close channel button (phase 4) */
.tetris-close-channel {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  background: none;
  border: 1px solid rgba(0, 255, 106, 0.6);
  color: rgba(0, 255, 106, 0.9);
  font-family: monospace;
  font-size: 11px;
  letter-spacing: 0.2em;
  padding: 8px 20px;
  cursor: pointer;
  animation: signalAcquiredIn 0.4s 0.2s both;
  transition: all 0.2s;
}
.tetris-close-channel:hover {
  background: rgba(0, 255, 106, 0.1);
  box-shadow: 0 0 12px rgba(0, 255, 106, 0.4);
}
```

---

## Task 3: Create AlienTetris.jsx

**Files:**
- Create: `src/components/UI/AlienTetris.jsx`

**Step 1: Imports + piece definitions**

```jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import './AlienTetris.css';

const COLS = 10;
const ROWS = 20;
const WIN_SCORE = 800;

// Standard tetrominoes in rotation 0 — [row][col] offset from origin
const PIECES = {
  I: { cells: [[0,0],[0,1],[0,2],[0,3]], color: '#00ffff', glyph: 'ᚠ' },
  O: { cells: [[0,0],[0,1],[1,0],[1,1]], color: '#ffd700', glyph: 'ᛒ' },
  T: { cells: [[0,1],[1,0],[1,1],[1,2]], color: '#cc44ff', glyph: 'ᚢ' },
  S: { cells: [[0,1],[0,2],[1,0],[1,1]], color: '#00ff6a', glyph: 'ᛖ' },
  Z: { cells: [[0,0],[0,1],[1,1],[1,2]], color: '#ff4444', glyph: 'ᛗ' },
  J: { cells: [[0,0],[1,0],[1,1],[1,2]], color: '#4488ff', glyph: 'ᚾ' },
  L: { cells: [[0,2],[1,0],[1,1],[1,2]], color: '#ff8844', glyph: 'ᛏ' },
};
const PIECE_TYPES = Object.keys(PIECES);
const SCORE_TABLE = [0, 40, 100, 300, 1200]; // 0,1,2,3,4 lines

function randomType() {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}
```

**Step 2: Pure helper functions (no React)**

```jsx
// Rotate a cells array 90° clockwise
function rotateCW(cells) {
  // Normalize to 0-based, rotate, re-normalize
  const maxR = Math.max(...cells.map(c => c[0]));
  return cells.map(([r, c]) => [c, maxR - r]);
}

// Build a fresh empty board
function emptyBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
}

// Check if a piece placement is valid on the board
function isValid(board, cells, ox, oy) {
  return cells.every(([r, c]) => {
    const nr = r + oy, nc = c + ox;
    return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !board[nr][nc];
  });
}

// Lock piece onto board, return new board
function lockPiece(board, cells, ox, oy, pieceType) {
  const next = board.map(row => [...row]);
  cells.forEach(([r, c]) => {
    const nr = r + oy, nc = c + ox;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
      next[nr][nc] = pieceType;
    }
  });
  return next;
}

// Clear full lines, return { board, linesCleared }
function clearLines(board) {
  const remaining = board.filter(row => row.some(cell => !cell));
  const cleared = ROWS - remaining.length;
  const newBoard = [
    ...Array.from({ length: cleared }, () => new Array(COLS).fill(null)),
    ...remaining,
  ];
  return { board: newBoard, linesCleared: cleared };
}

// Compute ghost piece Y (lowest valid Y)
function ghostY(board, cells, ox, oy) {
  let y = oy;
  while (isValid(board, cells, ox, y + 1)) y++;
  return y;
}

// Initial piece state (spawned at top center)
function spawnPiece(type) {
  const cells = PIECES[type].cells;
  const minC = Math.min(...cells.map(c => c[1]));
  const maxC = Math.max(...cells.map(c => c[1]));
  const ox = Math.floor((COLS - (maxC - minC + 1)) / 2) - minC;
  return { type, cells, x: ox, y: 0 };
}
```

**Step 3: useGameState hook (all game logic)**

```jsx
function useGameState() {
  const [board,      setBoard]      = useState(emptyBoard);
  const [current,    setCurrent]    = useState(() => spawnPiece(randomType()));
  const [nextType,   setNextType]   = useState(randomType);
  const [score,      setScore]      = useState(0);
  const [lines,      setLines]      = useState(0);
  const [level,      setLevel]      = useState(1);
  const [gameState,  setGameState]  = useState('playing'); // playing | lost | won
  const [clearing,   setClearing]   = useState([]); // row indices being cleared

  // Lock current piece, clear lines, spawn next
  const lockAndAdvance = useCallback((boardSnap, piece) => {
    const locked = lockPiece(boardSnap, piece.cells, piece.x, piece.y, piece.type);
    const { board: cleared, linesCleared } = clearLines(locked);

    if (linesCleared > 0) {
      // Find which rows were cleared (the full rows in `locked`)
      const clearedRows = [];
      locked.forEach((row, ri) => { if (row.every(c => c)) clearedRows.push(ri); });
      setClearing(clearedRows);
      setTimeout(() => setClearing([]), 300);
    }

    const addScore = SCORE_TABLE[linesCleared] * (level);
    const newScore = score + addScore;
    const newLines = lines + linesCleared;
    const newLevel = 1 + Math.floor(newLines / 10);

    setBoard(cleared);
    setScore(newScore);
    setLines(newLines);
    setLevel(newLevel);

    if (newScore >= WIN_SCORE) {
      setGameState('won');
      return;
    }

    // Spawn next piece
    const np = spawnPiece(nextType);
    if (!isValid(cleared, np.cells, np.x, np.y)) {
      setGameState('lost');
    } else {
      setCurrent(np);
      setNextType(randomType());
    }
  }, [board, score, lines, level, nextType]);

  // Drop tick
  const tickRef = useRef({ board, current, lockAndAdvance });
  tickRef.current = { board, current, lockAndAdvance };

  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = Math.max(100, 800 - (level - 1) * 70);
    const id = setInterval(() => {
      const { board: b, current: c, lockAndAdvance: lock } = tickRef.current;
      if (isValid(b, c.cells, c.x, c.y + 1)) {
        setCurrent(prev => ({ ...prev, y: prev.y + 1 }));
      } else {
        lock(b, c);
      }
    }, interval);
    return () => clearInterval(id);
  }, [gameState, level]);

  const reset = useCallback(() => {
    setBoard(emptyBoard());
    const t = randomType();
    setCurrent(spawnPiece(t));
    setNextType(randomType());
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameState('playing');
    setClearing([]);
  }, []);

  return { board, current, nextType, score, lines, level, gameState, clearing, reset,
    setCurrent, setGameState, lockAndAdvance };
}
```

**Step 4: Main AlienTetris component**

```jsx
// Mini-board for "next piece" preview
function NextPiecePreview({ type }) {
  if (!type) return null;
  const { cells, color, glyph } = PIECES[type];
  const maxR = Math.max(...cells.map(c => c[0]));
  const maxC = Math.max(...cells.map(c => c[1]));
  const grid = Array.from({ length: maxR + 1 }, () => new Array(maxC + 1).fill(false));
  cells.forEach(([r, c]) => { grid[r][c] = true; });
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
      {grid.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 2 }}>
          {row.map((filled, ci) => (
            <div key={ci} style={{
              width: 18, height: 18,
              background: filled ? color : 'rgba(0,0,0,0.3)',
              border: filled ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,255,106,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: 'rgba(255,255,255,0.4)',
            }}>
              {filled ? glyph : ''}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Win particles — generated once
function WinParticles() {
  const RUNE_CHARS = ['ᚠ', 'ᛒ', 'ᚢ', 'ᛖ', 'ᛗ', 'ᚾ', 'ᛏ'];
  const particles = useRef(
    Array.from({ length: 28 }, (_, i) => {
      const angle = (i / 28) * Math.PI * 2;
      const dist  = 80 + Math.random() * 120;
      return {
        px: `${Math.cos(angle) * dist}px`,
        py: `${Math.sin(angle) * dist}px`,
        delay: `${Math.random() * 400}ms`,
        char: RUNE_CHARS[i % RUNE_CHARS.length],
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

export default function AlienTetris({ onClose, onWin, tetrisActiveRef }) {
  const {
    board, current, nextType, score, lines, level,
    gameState, clearing, reset, setCurrent, lockAndAdvance
  } = useGameState();

  const boardRef  = useRef(null);
  const wonFiredRef = useRef(false);
  const [winPhase, setWinPhase] = useState(0);

  // Signal active to parent so camera ignores arrow keys
  useEffect(() => {
    if (tetrisActiveRef) tetrisActiveRef.current = true;
    return () => { if (tetrisActiveRef) tetrisActiveRef.current = false; };
  }, [tetrisActiveRef]);

  // Win sequence
  useEffect(() => {
    if (gameState !== 'won' || wonFiredRef.current) return;
    wonFiredRef.current = true;
    setWinPhase(1);
    setTimeout(() => setWinPhase(2), 200);
    setTimeout(() => setWinPhase(3), 800);
    setTimeout(() => setWinPhase(4), 1500);
  }, [gameState]);

  // Keyboard
  useEffect(() => {
    if (gameState !== 'playing') return;
    const handler = (e) => {
      if (['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space'].includes(e.code)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      setCurrent(prev => {
        const b = board; // closure — stable enough for key handler
        if (e.code === 'ArrowLeft'  && isValid(b, prev.cells, prev.x - 1, prev.y)) return { ...prev, x: prev.x - 1 };
        if (e.code === 'ArrowRight' && isValid(b, prev.cells, prev.x + 1, prev.y)) return { ...prev, x: prev.x + 1 };
        if (e.code === 'ArrowDown') {
          if (isValid(b, prev.cells, prev.x, prev.y + 1)) return { ...prev, y: prev.y + 1 };
          // soft drop hit bottom — lock immediately
          lockAndAdvance(b, prev);
          return prev;
        }
        if (e.code === 'ArrowUp' || e.code === 'Space') {
          const rotated = rotateCW(prev.cells);
          if (isValid(b, rotated, prev.x, prev.y))     return { ...prev, cells: rotated };
          if (isValid(b, rotated, prev.x + 1, prev.y)) return { ...prev, cells: rotated, x: prev.x + 1 };
          if (isValid(b, rotated, prev.x - 1, prev.y)) return { ...prev, cells: rotated, x: prev.x - 1 };
        }
        return prev;
      });
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [gameState, board, setCurrent, lockAndAdvance]);

  // ESC to close
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [onClose]);

  // Build render board (base + current piece + ghost)
  const renderBoard = (() => {
    const rb = board.map(row => row.map(cell => cell ? { type: cell, ghost: false } : null));
    if (gameState === 'playing' && current) {
      const gy = ghostY(board, current.cells, current.x, current.y);
      current.cells.forEach(([r, c]) => {
        const gr = r + gy, gc = c + current.x;
        if (gr >= 0 && gr < ROWS && gc >= 0 && gc < COLS && !rb[gr][gc]) {
          rb[gr][gc] = { type: current.type, ghost: true };
        }
      });
      current.cells.forEach(([r, c]) => {
        const nr = r + current.y, nc = c + current.x;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          rb[nr][nc] = { type: current.type, ghost: false };
        }
      });
    }
    return rb;
  })();

  const pct = Math.min(100, (score / WIN_SCORE) * 100);

  return createPortal(
    <div className="alien-tetris-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="alien-tetris-container"
      >
        {/* Header */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <div className="tetris-header" style={{ padding: '12px 16px 0' }}>
            <span className="tetris-title">◈ SIGNAL INTERCEPT ◈</span>
            <button className="tetris-close-btn" onClick={onClose}>ESC TO ABORT</button>
          </div>
        </div>

        <div style={{ marginTop: 44, display: 'flex', gap: 24 }}>
          {/* Sidebar */}
          <div className="tetris-sidebar">
            <div>
              <div className="tetris-sidebar-label">INCOMING</div>
              <div className="tetris-next-box">
                <NextPiecePreview type={nextType} />
              </div>
            </div>
            <div className="tetris-stat">
              <div>SIGNAL</div>
              <div className="tetris-stat-value">{score}</div>
              <div className="signal-bar-track">
                <div className="signal-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div style={{ marginTop: 2, fontSize: 8, opacity: 0.5 }}>TARGET: {WIN_SCORE}</div>
            </div>
            <div className="tetris-stat">
              <div>LINES</div>
              <div className="tetris-stat-value">{lines}</div>
            </div>
            <div className="tetris-stat">
              <div>LEVEL</div>
              <div className="tetris-stat-value">{level}</div>
            </div>
          </div>

          {/* Board */}
          <div className="tetris-board-wrap">
            <div
              ref={boardRef}
              className={`tetris-board${winPhase >= 1 ? ' win-glow' : ''}`}
              style={{ position: 'relative' }}
            >
              {renderBoard.map((row, ri) =>
                row.map((cell, ci) => {
                  const isClearing = clearing.includes(ri);
                  const color = cell ? PIECES[cell.type]?.color : null;
                  return (
                    <div
                      key={`${ri}-${ci}`}
                      className={`tetris-cell ${cell ? (cell.ghost ? 'ghost' : 'filled') : 'empty'}${isClearing ? ' clearing' : ''}${winPhase >= 2 ? ' cascade' : ''}`}
                      style={{
                        background: cell && !cell.ghost ? color : undefined,
                        color: color,
                        '--cascade-delay': winPhase >= 2 ? (ri * 18 + ci * 5) : 0,
                        borderColor: cell && !cell.ghost ? `${color}44` : undefined,
                      }}
                    >
                      {cell && !cell.ghost && <span className="cell-glyph">{PIECES[cell.type].glyph}</span>}
                    </div>
                  );
                })
              )}

              {/* Win overlay */}
              {winPhase >= 3 && <div className="win-signal-text">SIGNAL ACQUIRED</div>}
              {winPhase >= 4 && <WinParticles />}
              {winPhase >= 4 && (
                <button
                  className="tetris-close-channel"
                  onClick={() => { onWin?.(); onClose(); }}
                >
                  CLOSE CHANNEL
                </button>
              )}

              {/* Game over overlay */}
              {gameState === 'lost' && (
                <div className="tetris-gameover-overlay">
                  <div className="tetris-gameover-title">SIGNAL LOST</div>
                  <div className="tetris-gameover-sub">TRANSMISSION CORRUPTED</div>
                  <div className="tetris-btn-row">
                    <button className="tetris-btn" onClick={reset}>RETRY</button>
                    <button className="tetris-btn" onClick={onClose}>ABORT</button>
                  </div>
                </div>
              )}
            </div>
            <div className="tetris-controls">
              ← → MOVE &nbsp;|&nbsp; ↑ / SPC ROTATE &nbsp;|&nbsp; ↓ SOFT DROP
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
```

---

## Task 4: Integrate into Galaxy.jsx

**Files:**
- Modify: `src/components/Galaxy/Galaxy.jsx`

**Step 1: Add imports at the top of Galaxy.jsx** (after existing imports)

```jsx
import Monolith from './Monolith';
import AlienTetris from '../UI/AlienTetris';
```

**Step 2: Add state variables** inside the `Galaxy` component function, after the existing `presentationOpen` state (line ~199):

```jsx
const [tetrisOpen,      setTetrisOpen]      = useState(false);
const [monolithPulse,   setMonolithPulse]   = useState(false);
const tetrisActiveRef = useRef(false);
```

**Step 3: Add monolith win handler** after `handleCodexSubmit`:

```jsx
const handleTetrisWin = useCallback(() => {
  setMonolithPulse(true);
  setTimeout(() => setMonolithPulse(false), 3000);
}, []);
```

**Step 4: Update KeyboardCameraController** to skip arrow keys when tetris is active.

The `KeyboardCameraController` component is defined at line ~122 inside Galaxy.jsx. It currently takes `{ controlsRef }` as props. Change its signature and add an early-return guard:

```jsx
// Change: function KeyboardCameraController({ controlsRef }) {
// To:
function KeyboardCameraController({ controlsRef, tetrisActiveRef }) {
  // ... (existing keysRef, useEffect, useFrame)
  // In the useFrame body, add at the top:
  useFrame((_, delta) => {
    if (tetrisActiveRef?.current) return;   // ← add this line
    // ... rest of existing useFrame logic
  });
}
```

Also pass the prop where it's rendered inside `<Canvas>`:
```jsx
<KeyboardCameraController controlsRef={controlsRef} tetrisActiveRef={tetrisActiveRef} />
```

**Step 5: Add ESC key handling for tetris** — in the existing ESC useEffect (around line ~391), add `tetrisOpen` to the guard:

```jsx
// Change:
useEffect(() => {
  const handleKeyDown = (e) => {
    if (presentationOpen) return;
    if (e.key === 'Escape') {
      if (asteroidModalOpen) {
// To:
useEffect(() => {
  const handleKeyDown = (e) => {
    if (presentationOpen) return;
    if (e.key === 'Escape') {
      if (tetrisOpen) return;  // ← tetris handles its own ESC
      if (asteroidModalOpen) {
```

Also add `tetrisOpen` to the dependency array of that useEffect.

**Step 6: Add `<Monolith>` inside `<Canvas>`** — after the `<Asteroid>` line (~line 490):

```jsx
{/* Alien monolith — floating above planet cluster */}
<Monolith
  position={[2, 28, -3]}
  onOpen={() => { playCaseStudyOpen(); setTetrisOpen(true); }}
  pulse={monolithPulse}
/>
```

**Step 7: Add `<AlienTetris>` outside `<Canvas>`** — after the asteroid modal `createPortal` block (after line ~600), alongside the other overlays:

```jsx
{/* Alien Tetris game overlay */}
<AnimatePresence>
  {tetrisOpen && (
    <AlienTetris
      onClose={() => { playCaseStudyClose(); setTetrisOpen(false); }}
      onWin={handleTetrisWin}
      tetrisActiveRef={tetrisActiveRef}
    />
  )}
</AnimatePresence>
```

---

## Verification

1. `npm run dev` — no build errors
2. Pan camera upward — monolith visible above planet cluster, slowly spinning with wisps
3. Hover monolith — cursor changes to pointer, rune glow intensifies
4. Click monolith — Tetris overlay opens with "SIGNAL INTERCEPT" header
5. Press arrow keys — pieces move correctly; camera does NOT rotate while game is open
6. Press spacebar — piece rotates
7. Clear lines — flash animation plays; score increases
8. Reach 800 points — win sequence: board glow → cascade → "SIGNAL ACQUIRED" text → particles
9. Click "CLOSE CHANNEL" — overlay closes, monolith briefly pulses bright teal
10. Fill board to top — "SIGNAL LOST" game-over overlay appears with RETRY / ABORT
11. Press ESC during game — overlay closes cleanly; Galaxy ESC handler doesn't fire
12. Press ESC on game-over — overlay closes
