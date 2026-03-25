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

// ── Stage definitions — Cellular (1–3), Crystalline (4–7), Apex (8–10) ──────

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

// Absorptions needed per stage to advance
const ABSORB_THRESHOLDS = [0, 2, 4, 7, 10, 14, 18, 23, 29, 36];

// ── Zone system ───────────────────────────────────────────────────────────────

const ZONE_CONFIG = [
  { id: 1, name: 'Deep Space',   minAbsorbs:  0, bg: '#030308', grid: 'rgba(0,255,106,0.05)',  collectStroke: 'rgba(0,255,106,0.85)',  collectGlow: '#00ff6a', pulse: '#00ff6a', hudColor: 'rgba(0,255,106,1)'   },
  { id: 2, name: 'Nebula',       minAbsorbs: 25, bg: '#04030f', grid: 'rgba(80,100,255,0.07)', collectStroke: 'rgba(80,180,255,0.85)', collectGlow: '#4488ff', pulse: '#4488ff', hudColor: 'rgba(80,180,255,1)'  },
  { id: 3, name: 'Plasma Field', minAbsorbs: 55, bg: '#0d0308', grid: 'rgba(255,60,60,0.06)',  collectStroke: 'rgba(255,140,40,0.85)', collectGlow: '#ff6600', pulse: '#ff4422', hudColor: 'rgba(255,140,40,1)'  },
  { id: 4, name: 'Singularity',  minAbsorbs: 90, bg: '#080210', grid: 'rgba(200,0,255,0.07)',  collectStroke: 'rgba(255,220,0,0.85)',  collectGlow: '#ffdd00', pulse: '#cc00ff', hudColor: 'rgba(255,220,0,1)'   },
];

let _zoneBg         = ZONE_CONFIG[0].bg;
let _zoneGrid       = ZONE_CONFIG[0].grid;
let _zoneCollStroke = ZONE_CONFIG[0].collectStroke;
let _zoneCollGlow   = ZONE_CONFIG[0].collectGlow;
let _zonePulse      = ZONE_CONFIG[0].pulse;
let _zoneHudColor   = ZONE_CONFIG[0].hudColor;

function getZoneForAbsorbs(totalAbsorbs) {
  for (let i = ZONE_CONFIG.length - 1; i >= 0; i--) {
    if (totalAbsorbs >= ZONE_CONFIG[i].minAbsorbs) return ZONE_CONFIG[i];
  }
  return ZONE_CONFIG[0];
}

function applyZoneColors(zoneCfg) {
  _zoneBg         = zoneCfg.bg;
  _zoneGrid       = zoneCfg.grid;
  _zoneCollStroke = zoneCfg.collectStroke;
  _zoneCollGlow   = zoneCfg.collectGlow;
  _zonePulse      = zoneCfg.pulse;
  _zoneHudColor   = zoneCfg.hudColor;
}

// ── Offscreen canvas cache — draw each stage shape once, blit every frame ────
// All caches are DPR-aware: physical px = logical * _cachedDPR → sharp on retina.
// Caches are cleared whenever DPR changes (window moves between monitors).

let _cachedDPR = 1;
const MOBILE_SCALE = isTouchDevice() ? 0.65 : 1.0;

// Chaser flank — each chaser gets a unique approach angle (90° apart)
let _chaserFlankIdx = 0;
const FLANK_R = 80; // px offset from player that chasers target

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
  const r = Math.round(stageDef.headR * MOBILE_SCALE);
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


function drawCreature(ctx, x, y, stage, damaged, now) {
  const stageDef = STAGES[stage];
  if (!stageDef) return;
  const flickerOn = damaged ? Math.floor(now / 120) % 2 === 0 : false;
  const color = (damaged && flickerOn) ? '#ff4444' : '#00ff6a';

  const oc = getCreatureCanvas(stage, color);
  const scaledR = Math.round(stageDef.headR * MOBILE_SCALE);
  const size = (scaledR + CACHE_PAD) * 2;
  ctx.save();
  drawDropShadow(ctx, x, y, scaledR);
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
  ctx.strokeStyle = _zonePulse;
  ctx.shadowColor = _zonePulse;
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

  octx.shadowColor = _zoneCollGlow;
  octx.shadowBlur = 12;
  octx.strokeStyle = _zoneCollStroke;
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
const ENEMY_R = Math.round(15 * MOBILE_SCALE);

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

// Joystick clear zone — matches .snake-joystick-base CSS:
// left:44px bottom:80px size:96px → center (92, H-128). Touch only.
const JOY_CLEAR_R = 160;
function isClearOfJoystick(x, y, H) {
  if (!isTouchDevice()) return true;
  return Math.hypot(x - 92, y - (H - 128)) >= JOY_CLEAR_R;
}

function spawnCollectible(W, H) {
  let pos;
  let tries = 0;
  do { pos = randomPos(W, H); tries++; }
  while (tries < 30 && !isClearOfJoystick(pos.x, pos.y, H));
  return {
    ...pos,
    shapeIdx: Math.floor(Math.random() * COLLECTIBLE_SIDES.length),
    r: (12 + Math.random() * 10) * MOBILE_SCALE,
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
       Math.hypot(pos.x - W / 2, pos.y - H / 2) < CENTER_CLEAR ||
       !isClearOfJoystick(pos.x, pos.y, H))
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

// Sector bounds (proportional): 0=TL 1=TR 2=BL 3=BR
const SECTOR_BOUNDS = [
  { x0: 0.05, x1: 0.47, y0: 0.05, y1: 0.47 }, // TL
  { x0: 0.53, x1: 0.95, y0: 0.05, y1: 0.47 }, // TR
  { x0: 0.05, x1: 0.47, y0: 0.53, y1: 0.95 }, // BL
  { x0: 0.53, x1: 0.95, y0: 0.53, y1: 0.95 }, // BR
];

function makeWaypoints(W, H, sector = -1) {
  const b = sector >= 0 ? SECTOR_BOUNDS[sector % 4] : { x0: 60/W, x1: 1-60/W, y0: 60/H, y1: 1-60/H };
  return Array.from({ length: 4 }, () => {
    let pos;
    let tries = 0;
    do {
      pos = {
        x: b.x0 * W + Math.random() * (b.x1 - b.x0) * W,
        y: b.y0 * H + Math.random() * (b.y1 - b.y0) * H,
      };
      tries++;
    } while (tries < 20 && !isClearOfJoystick(pos.x, pos.y, H));
    return pos;
  });
}

function spawnEnemy(type, W, H, sector = -1) {
  let pos;
  let tries = 0;
  do { pos = randomPos(W, H, 60); tries++; }
  while (tries < 30 && !isClearOfJoystick(pos.x, pos.y, H));
  const flankAngle = type === 'chaser' ? (_chaserFlankIdx++ % 4) * (Math.PI / 2) : 0;
  return {
    ...pos,
    type,
    rotation: 0,
    lastShot: performance.now() + 800 + Math.random() * 1200,
    speed: type === 'chaser' ? 75 : 90,
    waypoints: type === 'patroller' ? makeWaypoints(W, H, sector) : [],
    waypointIdx: 0,
    vx: 0,
    vy: 0,
    breathePhase: Math.random() * Math.PI * 2,
    breatheSpeed: 0.0015 + Math.random() * 0.001,
    flankAngle,
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
      outerAngle: 0,
      hasReverted: false,
    },
    collectibles: Array.from({ length: 8 }, () => spawnCollectible(W, H)),
    enemies: isTouch
      ? [spawnEnemy('patroller', W, H, 0)]
      : [spawnEnemy('patroller', W, H, 0), spawnEnemy('patroller', W, H, 3)],
    particles: [],
    effects: [],  // ring pulse absorb animations
    obstacles: spawnObstacles(W, H, isTouch),
    absorbCount: 0,
    zone: 1,
    zoneTransition: null,
    projectileSpeedMult: 1,
    shootIntervalMs: 1500,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

// ── Glitch title — same character-corruption pattern as VoidOverlay ──────────

const GLITCH_CHARS = '!@#$%^&*_-=[]{}|;:.<>?/\\~`0123456789';

function GlitchTitle({ children }) {
  const [text, setText] = useState(children);
  useEffect(() => {
    const schedule = () => {
      const delay = 600 + Math.random() * 1000;
      return setTimeout(() => {
        const chars = children.split('');
        const count = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(Math.random() * chars.length);
          if (chars[idx] !== ' ') chars[idx] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }
        setText(chars.join(''));
        setTimeout(() => { setText(children); t = schedule(); }, 60 + Math.random() * 100);
      }, delay);
    };
    let t = schedule();
    return () => clearTimeout(t);
  }, [children]);
  return <>{text}</>;
}

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
    applyZoneColors(ZONE_CONFIG[0]);
    _chaserFlankIdx = 0;
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
      if (!player.hasReverted && player.stage > 1) {
        player.stage--;
        player.hp = 2;
        player.hasReverted = true;
        g.absorbCount = 0;
      } else {
        gameStateRef.current = 'dead';
        setScore(player.totalAbsorbs);
        setGameState('dead');
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

    player.innerAngle = (player.innerAngle + delta * 2.2) % (Math.PI * 2);
    player.outerAngle = (player.outerAngle - delta * 0.4 + Math.PI * 2) % (Math.PI * 2);

    // Trail
    const moved = Math.hypot(player.x - prevX, player.y - prevY);
    if (moved > 1.5) {
      player.trail.unshift({ x: player.x, y: player.y });
      const maxTrail = Math.round((STAGES[stage]?.trailLen ?? 18) * MOBILE_SCALE);
      if (player.trail.length > maxTrail) player.trail.length = maxTrail;
    }

    // --- Absorb collectibles ---
    const headR = (STAGES[stage]?.headR ?? 10) * MOBILE_SCALE + 10;
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

        // Zone transition check
        const newZoneCfg = getZoneForAbsorbs(player.totalAbsorbs);
        if (newZoneCfg.id !== g.zone) {
          g.zone = newZoneCfg.id;
          applyZoneColors(newZoneCfg);
          _collectibleCache.clear();
          g.zoneTransition = { label: newZoneCfg.name, createdAt: now };
          applyZoneDifficulty(newZoneCfg.id, g, W, H);
        }

        const threshold = ABSORB_THRESHOLDS[stage] ?? 999;
        if (stage < 10 && g.absorbCount >= threshold) {
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
        const targetX = player.x + Math.cos(e.flankAngle) * FLANK_R;
        const targetY = player.y + Math.sin(e.flankAngle) * FLANK_R;
        const dx = targetX - e.x, dy = targetY - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          e.x += (dx / dist) * e.speed * delta;
          e.y += (dy / dist) * e.speed * delta;
        }
      }
      e.rotation += 1.4 * delta;

      // Separation — push away from other enemies within SEP_R
      const SEP_R = 65;
      enemies.forEach(other => {
        if (other === e) return;
        const sx = e.x - other.x, sy = e.y - other.y;
        const d = Math.hypot(sx, sy);
        if (d < SEP_R && d > 0) {
          const push = ((SEP_R - d) / SEP_R) * SEP_R * delta * 3;
          e.x += (sx / d) * push;
          e.y += (sy / d) * push;
        }
      });

      // Shoot every 1.5s
      if (now - e.lastShot > (g.shootIntervalMs ?? 1500)) {
        e.lastShot = now;
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        particles.push({
          x: e.x, y: e.y,
          vx: Math.cos(angle) * 270 * (g.projectileSpeedMult ?? 1),
          vy: Math.sin(angle) * 270 * (g.projectileSpeedMult ?? 1),
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
        const hitR = (STAGES[stage]?.headR ?? 10) * MOBILE_SCALE * 0.85;
        if (pdx * pdx + pdy * pdy < hitR * hitR) {
          particles.splice(i, 1);
          player.damagedUntil = now + 1500;
          applyDamage(player, g);
        }
      }
    }

    // --- Rotate obstacles + check collision ---
    const playerHitR = (STAGES[stage]?.headR ?? 10) * MOBILE_SCALE * 0.85;
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

  function applyZoneDifficulty(zoneId, g, W, H) {
    if (zoneId === 2) {
      g.enemies.forEach(e => { e.speed += 20; });
    } else if (zoneId === 3) {
      g.enemies.forEach(e => { e.speed += 15; });
    } else if (zoneId === 4) {
      g.enemies.push(spawnEnemy('chaser', W, H));
      g.enemies.push(spawnEnemy('chaser', W, H));
      g.enemies.forEach(e => { e.speed += 30; });
      g.projectileSpeedMult = (g.projectileSpeedMult ?? 1) * 1.35;
      g.shootIntervalMs = 900;
    }
  }

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

  // ── Draw ────────────────────────────────────────────────────────────────────

  function draw(now, W, H) {
    const canvas = canvasRef.current;
    const g = gRef.current;
    if (!canvas || !g) return;
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.fillStyle = _zoneBg;
    ctx.fillRect(0, 0, W, H);

    // Grid — single batched path, no per-line stroke call
    ctx.save();
    ctx.strokeStyle = _zoneGrid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gridStep = Math.round(64 * MOBILE_SCALE);
    for (let x = 0; x < W; x += gridStep) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y < H; y += gridStep) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
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
    drawTrail(ctx, player.trail, (stageDef?.headR ?? 10) * MOBILE_SCALE, damaged, now, player.stage);
    drawCreature(ctx, player.x, player.y, player.stage, damaged, now);

    // Rotating layers — no shadowBlur, no cache
    if (player.stage >= 2) {
      const flickerOn = damaged ? Math.floor(now / 120) % 2 === 0 : false;
      const layerColor = (damaged && flickerOn) ? 'rgba(255,68,68,0.5)' : 'rgba(0,255,106,0.5)';
      const r = stageDef.headR * MOBILE_SCALE;
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

    // Absorption counter — top center
    ctx.save();
    ctx.font = '16px Orbitron, monospace';
    ctx.fillStyle = _zoneHudColor;
    ctx.textAlign = 'center';
    ctx.fillText(`${player.totalAbsorbs}   ABSORPTIONS`, W / 2, 32);
    ctx.restore();

    // Zone transition flash
    if (g.zoneTransition) {
      const elapsed = now - g.zoneTransition.createdAt;
      if (elapsed < 1800) {
        const alpha = Math.pow(1 - elapsed / 1800, 1.5);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = '20px Orbitron, monospace';
        ctx.fillStyle = _zoneHudColor;
        ctx.shadowColor = _zoneHudColor;
        ctx.shadowBlur = 18;
        ctx.textAlign = 'center';
        ctx.fillText(g.zoneTransition.label.toUpperCase(), W / 2, H * 0.4);
        ctx.shadowBlur = 0;
        ctx.restore();
      } else {
        g.zoneTransition = null;
      }
    }
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
          <h2><GlitchTitle>SIGNAL LOST</GlitchTitle></h2>
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
