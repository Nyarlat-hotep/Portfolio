import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Pause } from 'lucide-react';
import { stopBackground, playBackground } from '../../utils/sounds';
import { isTouchDevice } from '../../utils/isTouchDevice';
import './AlienSnake.css';

// ── Geometry helpers ──────────────────────────────────────────────────────────

function drawCircle(ctx, r) {
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawDot(ctx, r) {
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawPolygon(ctx, r, sides, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + rotation;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawStar(ctx, outerR, innerR, points, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i / (points * 2)) * Math.PI * 2 + rotation;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawRing(ctx, outerR, innerR) {
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.stroke();
}

function drawTicks(ctx, r, count, len = 5) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x1 = Math.cos(a) * r;
    const y1 = Math.sin(a) * r;
    const x2 = Math.cos(a) * (r + len);
    const y2 = Math.sin(a) * (r + len);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

// ── Stage definitions (all radii ~25% larger) ────────────────────────────────

const STAGES = [
  null, // 0-indexed placeholder
  // Stage 1 — Spore
  {
    name: 'SPORE',
    headR: 10,
    trailLen: 18,
    segments: 0,
    draw(ctx) {
      drawCircle(ctx, 10);
      drawDot(ctx, 2.5);
    },
  },
  // Stage 2 — Cell
  {
    name: 'CELL',
    headR: 15,
    trailLen: 30,
    segments: 1,
    draw(ctx) {
      drawCircle(ctx, 15);
      drawPolygon(ctx, 8, 5, -Math.PI / 2);
      drawTicks(ctx, 15, 5, 5);
    },
  },
  // Stage 3 — Form
  {
    name: 'FORM',
    headR: 20,
    trailLen: 44,
    segments: 2,
    draw(ctx) {
      drawCircle(ctx, 20);
      drawPolygon(ctx, 13, 6, 0);
      drawPolygon(ctx, 9, 3, Math.PI); // inverted triangle
      drawDot(ctx, 2.5);
    },
  },
  // Stage 4 — Entity
  {
    name: 'ENTITY',
    headR: 25,
    trailLen: 58,
    segments: 3,
    draw(ctx) {
      drawRing(ctx, 25, 21);
      drawPolygon(ctx, 16, 4, 0);
      drawPolygon(ctx, 16, 4, Math.PI / 4); // octagram
      drawPolygon(ctx, 10, 6, 0);
    },
  },
  // Stage 5 — Apex
  {
    name: 'APEX',
    headR: 33,
    trailLen: 80,
    segments: 5,
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

// Absorptions needed per stage to advance
const ABSORB_THRESHOLDS = [0, 3, 6, 10, 15];

// ── Drawing helpers ───────────────────────────────────────────────────────────


// ── Offscreen canvas cache — draw each stage shape once, blit every frame ────
// All caches are DPR-aware: physical px = logical * _cachedDPR → sharp on retina.
// Caches are cleared whenever DPR changes (window moves between monitors).

let _cachedDPR = 1;

function clearShapeCaches() {
  _creatureCache.clear();
  _collectibleCache.clear();
  _enemyCache.clear();
  _obstacleCache.clear();
}

const _creatureCache = new Map();
const CACHE_PAD = 28; // extra pixels around shape for glow bleed

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

// ── Drop shadow helper ────────────────────────────────────────────────────────

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

function drawCreature(ctx, x, y, stage, damaged, time, scale = 1, alpha = 1) {
  const stageDef = STAGES[stage];
  if (!stageDef) return;

  const flickerOn = damaged ? Math.floor(time / 120) % 2 === 0 : false;
  const color = (damaged && flickerOn) ? '#ff4444' : '#00ff6a';

  const oc = getCreatureCanvas(stage, color);
  const size = (stageDef.headR + CACHE_PAD) * 2 * scale;

  ctx.save();
  ctx.globalAlpha = alpha;
  drawDropShadow(ctx, x, y, stageDef.headR * scale);
  ctx.drawImage(oc, x - size / 2, y - size / 2, size, size);
  ctx.restore();
}

function drawTrail(ctx, trail, headR, damaged, time, stage) {
  if (trail.length < 2) return;
  const flickerOn = damaged ? Math.floor(time / 120) % 2 === 0 : false;
  const isDamaged = damaged && flickerOn;
  const colorFade  = isDamaged ? 'rgba(255,68,68,0)'    : 'rgba(0,255,106,0)';
  const colorHalo  = isDamaged ? 'rgba(255,68,68,0.13)' : 'rgba(0,255,106,0.13)';
  const colorCore  = isDamaged ? 'rgba(255,68,68,0.45)' : 'rgba(0,255,106,0.45)';

  const step = stage >= 4 ? 2 : 1;
  const head = trail[0];
  const tail = trail[trail.length - 1];

  // Build path once, reuse for both strokes.
  // Lift pen on wrap-around teleports (consecutive points > 200px apart).
  const WRAP_GAP = 200;
  const path = new Path2D();
  let prev = null;
  for (let i = 0; i < trail.length; i += step) {
    const pt = trail[i];
    if (!prev || Math.abs(pt.x - prev.x) > WRAP_GAP || Math.abs(pt.y - prev.y) > WRAP_GAP) {
      path.moveTo(pt.x, pt.y);
    } else {
      path.lineTo(pt.x, pt.y);
    }
    prev = pt;
  }

  ctx.save();
  ctx.shadowBlur = 0;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Outer halo — wide, soft
  const haloGrad = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
  haloGrad.addColorStop(0, colorHalo);
  haloGrad.addColorStop(1, colorFade);
  ctx.strokeStyle = haloGrad;
  ctx.lineWidth = headR * 0.75;
  ctx.stroke(path);

  // Inner core — narrow, bright
  const coreGrad = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
  coreGrad.addColorStop(0, colorCore);
  coreGrad.addColorStop(1, colorFade);
  ctx.strokeStyle = coreGrad;
  ctx.lineWidth = headR * 0.28;
  ctx.stroke(path);

  ctx.restore();
}

// ── Ring pulse effect ─────────────────────────────────────────────────────────

function drawRingPulse(ctx, fx, now) {
  const DURATION = 420;
  const elapsed = now - fx.createdAt;
  if (elapsed > DURATION) return;
  const t = elapsed / DURATION;
  const r = fx.maxR * t;
  const opacity = (1 - t) * 0.9;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = '#00ff6a';
  ctx.shadowColor = '#00ff6a';
  ctx.shadowBlur = 16;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ── Collectible shapes ────────────────────────────────────────────────────────

const COLLECTIBLE_SIDES = [3, 4, 5, 6, 4];

// Offscreen cache — draw each collectible shape once (glow baked in), blit every frame
const _collectibleCache = new Map();
const COLL_PAD = 18;

function getCollectibleCanvas(shapeIdx, r) {
  const rKey = Math.round(r);
  const key = `${shapeIdx}|${rKey}`;
  if (_collectibleCache.has(key)) return _collectibleCache.get(key);

  const sides = COLLECTIBLE_SIDES[shapeIdx % COLLECTIBLE_SIDES.length];
  const rot = sides === 4 && shapeIdx === 4 ? Math.PI / 4 : 0;
  const logSize = (rKey + COLL_PAD) * 2;
  const oc = document.createElement('canvas');
  oc.width = logSize * _cachedDPR;
  oc.height = logSize * _cachedDPR;
  const octx = oc.getContext('2d');
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
  octx.shadowBlur = 12;
  octx.strokeStyle = 'rgba(0,255,106,0.85)';
  octx.lineWidth = 1.5;
  drawPolygon(octx, rKey, sides, rot);
  octx.shadowBlur = 0;
  _collectibleCache.set(key, oc);
  return oc;
}

function drawCollectible(ctx, c) {
  const rKey = Math.round(c.r);
  const logSize = (rKey + COLL_PAD) * 2;
  const oc = getCollectibleCanvas(c.shapeIdx, c.r);
  drawDropShadow(ctx, c.x, c.y, c.r);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.rotation);
  ctx.drawImage(oc, -logSize / 2, -logSize / 2, logSize, logSize);
  ctx.restore();
}

// ── Enemy drawing ─────────────────────────────────────────────────────────────

const _enemyCache = new Map();
const ENEMY_PAD = 20;
const ENEMY_R = 15;

function getEnemyCanvas(type) {
  if (_enemyCache.has(type)) return _enemyCache.get(type);

  const color = type === 'chaser' ? '#ff6644' : '#ff4400';
  const r = ENEMY_R;
  const logSize = (r + ENEMY_PAD) * 2;
  const oc = document.createElement('canvas');
  oc.width = logSize * _cachedDPR;
  oc.height = logSize * _cachedDPR;
  const octx = oc.getContext('2d');
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
  octx.shadowBlur = 16;
  octx.strokeStyle = color;
  octx.lineWidth = 1.8;
  drawStar(octx, r, 8, 4, 0);
  octx.shadowBlur = 0;

  _enemyCache.set(type, oc);
  return oc;
}

function drawEnemy(ctx, e, now) {
  const logSize = (ENEMY_R + ENEMY_PAD) * 2;
  const oc = getEnemyCanvas(e.type);
  const breatheScale = 1 + 0.06 * Math.sin(now * e.breatheSpeed + e.breathePhase);
  drawDropShadow(ctx, e.x, e.y, ENEMY_R * breatheScale);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.rotation);
  ctx.scale(breatheScale, breatheScale);
  ctx.drawImage(oc, -logSize / 2, -logSize / 2, logSize, logSize);
  ctx.restore();
}

// ── Obstacle drawing ─────────────────────────────────────────────────────────
// 3 distinct static shapes: mine (circle + spikes), crystal (6-star), barrier (tri)

const _obstacleCache = new Map();
const OBSTACLE_PAD = 22;
const OBSTACLE_SHAPES = ['mine', 'crystal'];

function getObstacleCanvas(shapeType, r) {
  const rKey = Math.round(r);
  const key = `${shapeType}|${rKey}`;
  if (_obstacleCache.has(key)) return _obstacleCache.get(key);

  const logSize = (rKey + OBSTACLE_PAD) * 2;
  const oc = document.createElement('canvas');
  oc.width = logSize * _cachedDPR;
  oc.height = logSize * _cachedDPR;
  const octx = oc.getContext('2d');
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
  octx.shadowBlur = 16;
  octx.strokeStyle = '#ff3300';
  octx.lineWidth = 1.8;

  if (shapeType === 'mine') {
    drawCircle(octx, rKey);
    drawTicks(octx, rKey, 8, 10);
  } else if (shapeType === 'crystal') {
    drawStar(octx, rKey, rKey * 0.45, 6, -Math.PI / 2);
    drawCircle(octx, rKey * 0.3);
  } else {
    drawPolygon(octx, rKey, 3, -Math.PI / 2);
    drawPolygon(octx, rKey * 0.5, 3, Math.PI / 2); // inner inverted triangle
  }
  octx.shadowBlur = 0;

  _obstacleCache.set(key, oc);
  return oc;
}

function drawObstacle(ctx, o) {
  const rKey = Math.round(o.r);
  const logSize = (rKey + OBSTACLE_PAD) * 2;
  const oc = getObstacleCanvas(o.shapeType, o.r);
  drawDropShadow(ctx, o.x, o.y, o.r);
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.rotation);
  ctx.drawImage(oc, -logSize / 2, -logSize / 2, logSize, logSize);
  ctx.restore();
}

// ── Particle drawing ──────────────────────────────────────────────────────────

function drawParticle(ctx, p, now) {
  const age = (now - p.createdAt) / 1500;
  const opacity = Math.max(0, 1 - age);
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

// ── Init helpers ──────────────────────────────────────────────────────────────

function randomPos(W, H, margin = 80) {
  return {
    x: margin + Math.random() * (W - margin * 2),
    y: margin + Math.random() * (H - margin * 2),
  };
}

function spawnCollectible(W, H) {
  return {
    ...randomPos(W, H),
    shapeIdx: Math.floor(Math.random() * COLLECTIBLE_SIDES.length),
    r: 12 + Math.random() * 10,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (0.4 + Math.random() * 0.6) * (Math.random() < 0.5 ? 1 : -1),
  };
}

function spawnObstacles(W, H, isTouch = false) {
  const MIN_DIST = 300; // min px between obstacle centers
  const CENTER_CLEAR = 220; // keep away from player spawn (W/2, H/2)
  const placed = [];
  return OBSTACLE_SHAPES.map(shapeType => {
    let pos;
    let tries = 0;
    do {
      pos = randomPos(W, H, 140);
      tries++;
    } while (
      tries < 60 &&
      (placed.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < MIN_DIST) ||
       Math.hypot(pos.x - W / 2, pos.y - H / 2) < CENTER_CLEAR)
    );
    placed.push(pos);
    return {
      ...pos,
      shapeType,
      r: isTouch ? 14 + Math.random() * 6 : 26 + Math.random() * 8,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (0.08 + Math.random() * 0.12) * (Math.random() < 0.5 ? 1 : -1),
    };
  });
}

function makeWaypoints(W, H) {
  return Array.from({ length: 4 }, () => randomPos(W, H, 60));
}

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
    breatheSpeed: 0.0015 + Math.random() * 0.001, // rad/ms — 0.0015 ≈ 4s cycle
  };
}

function buildInitialState(W, H, isTouch = false) {
  return {
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
    collectibles: Array.from({ length: 8 }, () => spawnCollectible(W, H)),
    enemies: isTouch
      ? [spawnEnemy('patroller', W, H)]
      : [spawnEnemy('patroller', W, H), spawnEnemy('patroller', W, H)],
    particles: [],
    effects: [],  // ring pulse absorb animations
    obstacles: spawnObstacles(W, H, isTouch),
    absorbCount: 0,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

const JOYSTICK_MAX_R = 44;
const IS_TOUCH = isTouchDevice();

export default function AlienSnake({ onClose }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const gRef = useRef(null);
  const keysRef = useRef(new Set());
  const gameStateRef = useRef('playing');
  const [gameState, setGameState] = useState('playing');
  const [score, setScore] = useState(0);

  // ── Joystick (touch only) ────────────────────────────────────────────────────
  const joystickInputRef = useRef({ dx: 0, dy: 0 });
  const joystickBaseRef  = useRef(null);
  const joystickKnobRef  = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (gameStateRef.current !== 'playing') return;
    e.preventDefault();
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (gameStateRef.current !== 'playing') return;
    e.preventDefault();
    const touch = e.touches[0];
    const base = joystickBaseRef.current?.getBoundingClientRect();
    if (!base) return;
    const cx = base.left + base.width  / 2;
    const cy = base.top  + base.height / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > JOYSTICK_MAX_R) { dx = (dx / dist) * JOYSTICK_MAX_R; dy = (dy / dist) * JOYSTICK_MAX_R; }
    joystickInputRef.current.dx = Math.max(-1, Math.min(1, dx / (JOYSTICK_MAX_R * 0.5)));
    joystickInputRef.current.dy = Math.max(-1, Math.min(1, dy / (JOYSTICK_MAX_R * 0.5)));
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    joystickInputRef.current.dx = 0;
    joystickInputRef.current.dy = 0;
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = 'translate(0px, 0px)';
    }
  }, []);

  // ── Init / reset ────────────────────────────────────────────────────────────

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    gRef.current = buildInitialState(canvas.clientWidth, canvas.clientHeight, IS_TOUCH);
    gameStateRef.current = 'playing';
    setGameState('playing');
    setScore(0);
  }, []);

  const resumeGame = useCallback(() => {
    gameStateRef.current = 'playing';
    setGameState('playing');
  }, []);

  // ── Hide custom cursor while playing ────────────────────────────────────────

  useEffect(() => {
    if (gameState === 'playing') {
      document.body.classList.add('game-playing');
    } else {
      document.body.classList.remove('game-playing');
    }
    return () => { document.body.classList.remove('game-playing'); };
  }, [gameState]);

  // ── Music ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    stopBackground();
    return () => { playBackground(); };
  }, []);

  // ── Keyboard ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'Escape') {
        if (gameStateRef.current === 'playing') {
          gameStateRef.current = 'paused';
          setGameState('paused');
        } else if (gameStateRef.current === 'paused') {
          gameStateRef.current = 'playing';
          setGameState('playing');
        } else if (gameStateRef.current === 'dead') {
          onClose();
        }
        return;
      }
      keysRef.current.add(e.key);
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    };
    const up = (e) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [onClose]);

  // ── Main game loop ──────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      if (dpr !== _cachedDPR) {
        _cachedDPR = dpr;
        clearShapeCaches();
      }
      canvas.width  = canvas.clientWidth  * dpr;
      canvas.height = canvas.clientHeight * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctxRef.current = ctx;
      if (!gRef.current) {
        gRef.current = buildInitialState(canvas.clientWidth, canvas.clientHeight, IS_TOUCH);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let prevTime = performance.now();
    let lastFrameTime = 0;
    const TARGET_INTERVAL = 1000 / 60;
    let raf;

    const loop = (now) => {
      if (now - lastFrameTime < TARGET_INTERVAL) {
        raf = requestAnimationFrame(loop);
        return;
      }
      lastFrameTime = now;
      const delta = Math.min((now - prevTime) / 1000, 0.05);
      prevTime = now;
      if (gameStateRef.current === 'playing' && gRef.current) {
        update(delta, now, canvas.clientWidth, canvas.clientHeight);
      }
      draw(now, canvas.clientWidth, canvas.clientHeight);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update ──────────────────────────────────────────────────────────────────

  function applyDamage(player, g) {
    player.hp--;
    if (player.hp <= 0) {
      if (player.stage <= 1) {
        gameStateRef.current = 'dead';
        setScore(player.totalAbsorbs);
        setGameState('dead');
      } else {
        player.stage--;
        player.hp = 2;
        g.absorbCount = 0;
      }
    }
  }

  function update(delta, now, W, H) {
    const g = gRef.current;
    const { player, collectibles, enemies, particles, effects, obstacles } = g;
    const keys = keysRef.current;

    // --- Movement ---
    const stage = player.stage;
    const SPEED = (IS_TOUCH ? 180 : 290) + stage * 20;
    let ax = 0, ay = 0;
    if (keys.has('ArrowLeft'))  ax = -1;
    if (keys.has('ArrowRight')) ax =  1;
    if (keys.has('ArrowUp'))    ay = -1;
    if (keys.has('ArrowDown'))  ay =  1;
    if (ax && ay) { ax *= 0.707; ay *= 0.707; }

    // Joystick supplements keys when no key is held
    if (!ax && !ay) {
      ax = joystickInputRef.current.dx;
      ay = joystickInputRef.current.dy;
    }

    if (ax || ay) {
      player.vx = ax * SPEED;
      player.vy = ay * SPEED;
    } else {
      const decay = Math.pow(0.001, delta);
      player.vx *= decay;
      player.vy *= decay;
    }

    const prevX = player.x, prevY = player.y;
    player.x += player.vx * delta;
    player.y += player.vy * delta;

    if (player.x < 0)  player.x += W;
    if (player.x > W)  player.x -= W;
    if (player.y < 0)  player.y += H;
    if (player.y > H)  player.y -= H;

    player.innerAngle = (player.innerAngle + delta * 2.2) % (Math.PI * 2); // ~2.2 rad/sec counter-rotation

    // Trail
    const moved = Math.hypot(player.x - prevX, player.y - prevY);
    if (moved > 1.5) {
      player.trail.unshift({ x: player.x, y: player.y });
      const maxTrail = STAGES[stage]?.trailLen ?? 18;
      if (player.trail.length > maxTrail) player.trail.length = maxTrail;
    }

    // --- Absorb collectibles ---
    const headR = (STAGES[stage]?.headR ?? 10) + 10;
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const c = collectibles[i];
      const dx = player.x - c.x, dy = player.y - c.y;
      if (dx * dx + dy * dy < headR * headR) {
        // Ring pulse effect at collectible position
        effects.push({ x: c.x, y: c.y, createdAt: now, maxR: 55 });

        collectibles.splice(i, 1);
        collectibles.push(spawnCollectible(W, H));
        g.absorbCount++;
        player.totalAbsorbs++;

        const threshold = ABSORB_THRESHOLDS[stage] ?? 999;
        if (stage < 5 && g.absorbCount >= threshold) {
          player.stage++;
          g.absorbCount = 0;
          player.hp = 2;
          spawnEnemiesForStage(player.stage, W, H, enemies);
        }
      }
    }

    // --- Rotate collectibles ---
    collectibles.forEach(c => { c.rotation += c.rotSpeed * delta; });

    // --- Expire effects ---
    for (let i = effects.length - 1; i >= 0; i--) {
      if (now - effects[i].createdAt > 420) effects.splice(i, 1);
    }

    // --- Update enemies ---
    enemies.forEach(e => {
      if (e.type === 'patroller') {
        const wp = e.waypoints[e.waypointIdx];
        const dx = wp.x - e.x, dy = wp.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 10) {
          e.waypointIdx = (e.waypointIdx + 1) % e.waypoints.length;
        } else {
          e.x += (dx / dist) * e.speed * delta;
          e.y += (dy / dist) * e.speed * delta;
        }
      } else {
        const dx = player.x - e.x, dy = player.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          e.x += (dx / dist) * e.speed * delta;
          e.y += (dy / dist) * e.speed * delta;
        }
      }
      e.rotation += 1.4 * delta;

      // Shoot every 1.5s
      if (now - e.lastShot > 1500) {
        e.lastShot = now;
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        particles.push({
          x: e.x, y: e.y,
          vx: Math.cos(angle) * 270,
          vy: Math.sin(angle) * 270,
          createdAt: now,
        });
      }
    });

    // --- Update particles ---
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      if (now - p.createdAt > 1500) { particles.splice(i, 1); continue; }

      if (now >= player.damagedUntil) {
        const pdx = player.x - p.x, pdy = player.y - p.y;
        const hitR = (STAGES[stage]?.headR ?? 10) * 0.85;
        if (pdx * pdx + pdy * pdy < hitR * hitR) {
          particles.splice(i, 1);
          player.damagedUntil = now + 1500;
          applyDamage(player, g);
        }
      }
    }

    // --- Rotate obstacles + check collision ---
    const playerHitR = (STAGES[stage]?.headR ?? 10) * 0.85;
    obstacles.forEach(o => {
      o.rotation += o.rotSpeed * delta;
      if (now >= player.damagedUntil) {
        const dx = player.x - o.x, dy = player.y - o.y;
        const hitR = playerHitR + o.r * 0.75;
        if (dx * dx + dy * dy < hitR * hitR) {
          player.damagedUntil = now + 1500;
          applyDamage(player, g);
        }
      }
    });
  }

  function spawnEnemiesForStage(stage, W, H, enemies) {
    if (stage === 2) {
      enemies.push(spawnEnemy('chaser', W, H));
    } else if (stage === 3) {
      enemies.push(spawnEnemy('chaser', W, H));
      enemies.forEach(e => { if (e.type === 'patroller') e.speed = 110; });
    } else if (stage === 4) {
      enemies.push(spawnEnemy('chaser', W, H));
      enemies.push(spawnEnemy('chaser', W, H));
      enemies.forEach(e => { if (e.type === 'patroller') e.speed = 125; });
    } else if (stage === 5) {
      enemies.push(spawnEnemy('chaser', W, H));
      enemies.forEach(e => { if (e.type === 'patroller') e.speed = 145; });
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────

  function draw(now, W, H) {
    const canvas = canvasRef.current;
    const g = gRef.current;
    if (!canvas || !g) return;
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.fillStyle = '#030308';
    ctx.fillRect(0, 0, W, H);

    // Grid — single batched path, no per-line stroke call
    ctx.save();
    ctx.strokeStyle = 'rgba(0,255,106,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < W; x += 64) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y < H; y += 64) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    ctx.restore();

    const { player, collectibles, enemies, particles, effects, obstacles } = g;
    const damaged = now < player.damagedUntil;

    // Obstacles
    obstacles.forEach(o => drawObstacle(ctx, o));

    // Collectibles
    collectibles.forEach(c => drawCollectible(ctx, c));

    // Ring pulse effects
    effects.forEach(fx => drawRingPulse(ctx, fx, now));

    // Enemies
    enemies.forEach(e => drawEnemy(ctx, e, now));

    // Particles — batched, no shadowBlur
    ctx.save();
    ctx.fillStyle = '#ff8844';
    particles.forEach(p => drawParticle(ctx, p, now));
    ctx.globalAlpha = 1;
    ctx.restore();

    // Player trail + head
    const stageDef = STAGES[player.stage];
    drawTrail(ctx, player.trail, stageDef?.headR ?? 10, damaged, now, player.stage);
    drawCreature(ctx, player.x, player.y, player.stage, damaged, now);

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

    // Stage label
    ctx.save();
    ctx.font = '10px Orbitron, monospace';
    ctx.fillStyle = 'rgba(0,255,106,0.25)';
    ctx.textAlign = 'right';
    ctx.fillText(`${stageDef?.name ?? ''} — ${player.totalAbsorbs} ABSORBS`, W - 20, 28);
    ctx.restore();
  }

  // ── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="alien-snake-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />

      {IS_TOUCH && (
        <div
          className="snake-touch-zone"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="snake-joystick-base" ref={joystickBaseRef}>
            <div className="snake-joystick-knob" ref={joystickKnobRef} />
          </div>
        </div>
      )}

      {IS_TOUCH && gameState === 'playing' && (
        <motion.button
          className="snake-mobile-pause"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            gameStateRef.current = 'paused';
            setGameState('paused');
          }}
        >
          <Pause size={24} />
        </motion.button>
      )}

      {!IS_TOUCH && (
        <div className="snake-controls-hint">
          <ArrowLeft size={13} /><ArrowRight size={13} /><ArrowUp size={13} /><ArrowDown size={13} />&nbsp;&nbsp;MOVE&nbsp;&nbsp;&nbsp;&nbsp;ESC&nbsp;&nbsp;PAUSE
        </div>
      )}

      {gameState === 'paused' && (
        <div className="snake-game-over">
          <h2 className="snake-paused-title">PAUSED</h2>
          <div className="snake-game-over-btns">
            <button className="snake-btn snake-btn-primary" onClick={resumeGame}>RESUME</button>
            <button className="snake-btn" onClick={onClose}>QUIT</button>
          </div>
        </div>
      )}

      {gameState === 'dead' && (
        <div className="snake-game-over">
          <h2>SIGNAL LOST</h2>
          <p>ENTITY DISSOLVED — {score} ABSORPTIONS</p>
          <div className="snake-game-over-btns">
            <button className="snake-btn snake-btn-primary" onClick={initGame}>RETRY</button>
            <button className="snake-btn" onClick={onClose}>QUIT</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
