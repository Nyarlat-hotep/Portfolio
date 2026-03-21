import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { stopBackground, playBackground } from '../../utils/sounds';
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

function applyGlow(ctx, color, blur = 14) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
}

// ── Offscreen canvas cache — draw each stage shape once, blit every frame ────

const _creatureCache = new Map();
const CACHE_PAD = 28; // extra pixels around shape for glow bleed

function getCreatureCanvas(stage, color) {
  const key = `${stage}|${color}`;
  if (_creatureCache.has(key)) return _creatureCache.get(key);

  const stageDef = STAGES[stage];
  const size = (stageDef.headR + CACHE_PAD) * 2;
  const oc = document.createElement('canvas');
  oc.width = size;
  oc.height = size;
  const octx = oc.getContext('2d');
  octx.translate(size / 2, size / 2);
  octx.shadowColor = color;
  octx.shadowBlur = 18;
  octx.strokeStyle = color;
  octx.fillStyle = color;
  octx.lineWidth = 1.5;
  stageDef.draw(octx);

  _creatureCache.set(key, oc);
  return oc;
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
  ctx.drawImage(oc, x - size / 2, y - size / 2, size, size);
  ctx.restore();
}

function drawTrail(ctx, trail, headR, damaged, time) {
  if (trail.length < 2) return;
  const flickerOn = damaged ? Math.floor(time / 120) % 2 === 0 : false;
  const color = (damaged && flickerOn) ? '#ff4444' : '#00ff6a';

  // No shadowBlur per dot — too expensive at long trail lengths.
  // Single save/restore around the whole loop.
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  for (let i = 0; i < trail.length; i++) {
    const frac = 1 - i / trail.length;
    ctx.globalAlpha = frac * frac * 0.3; // squared falloff — dimmer, faster fade
    ctx.beginPath();
    ctx.arc(trail[i].x, trail[i].y, Math.max(1, headR * 0.45 * frac), 0, Math.PI * 2);
    ctx.fill();
  }
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

function drawCollectible(ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.rotation);
  applyGlow(ctx, '#00ff6a', 12);
  ctx.strokeStyle = 'rgba(0,255,106,0.85)';
  ctx.lineWidth = 1.5;
  const sides = COLLECTIBLE_SIDES[c.shapeIdx % COLLECTIBLE_SIDES.length];
  const rot = sides === 4 && c.shapeIdx === 4 ? Math.PI / 4 : 0;
  drawPolygon(ctx, c.r, sides, rot);
  ctx.restore();
}

// ── Enemy drawing ─────────────────────────────────────────────────────────────

function drawEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  applyGlow(ctx, '#ff3300', 16);
  ctx.strokeStyle = e.type === 'chaser' ? '#ff6644' : '#ff4400';
  ctx.lineWidth = 1.8;
  drawStar(ctx, 15, 8, 4, e.rotation);
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
  };
}

function buildInitialState(W, H) {
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
    },
    collectibles: Array.from({ length: 8 }, () => spawnCollectible(W, H)),
    enemies: [
      spawnEnemy('patroller', W, H),
      spawnEnemy('patroller', W, H),
      spawnEnemy('patroller', W, H),
      spawnEnemy('patroller', W, H),
    ],
    particles: [],
    effects: [],  // ring pulse absorb animations
    absorbCount: 0,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AlienSnake({ onClose }) {
  const canvasRef = useRef(null);
  const gRef = useRef(null);
  const keysRef = useRef(new Set());
  const gameStateRef = useRef('playing');
  const [gameState, setGameState] = useState('playing');
  const [score, setScore] = useState(0);

  // ── Init / reset ────────────────────────────────────────────────────────────

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    gRef.current = buildInitialState(canvas.clientWidth, canvas.clientHeight);
    gameStateRef.current = 'playing';
    setGameState('playing');
    setScore(0);
  }, []);

  const resumeGame = useCallback(() => {
    gameStateRef.current = 'playing';
    setGameState('playing');
  }, []);

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
      canvas.width  = canvas.clientWidth  * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      if (!gRef.current) {
        gRef.current = buildInitialState(canvas.clientWidth, canvas.clientHeight);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let prevTime = performance.now();
    let raf;

    const loop = (now) => {
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

  function update(delta, now, W, H) {
    const g = gRef.current;
    const { player, collectibles, enemies, particles, effects } = g;
    const keys = keysRef.current;

    // --- Movement ---
    const stage = player.stage;
    const SPEED = 290 + stage * 20;
    let ax = 0, ay = 0;
    if (keys.has('ArrowLeft'))  ax = -1;
    if (keys.has('ArrowRight')) ax =  1;
    if (keys.has('ArrowUp'))    ay = -1;
    if (keys.has('ArrowDown'))  ay =  1;
    if (ax && ay) { ax *= 0.707; ay *= 0.707; }

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
      }
    }
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
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#030308';
    ctx.fillRect(0, 0, W, H);


    const { player, collectibles, enemies, particles, effects } = g;
    const damaged = now < player.damagedUntil;

    // Collectibles
    collectibles.forEach(c => drawCollectible(ctx, c));

    // Ring pulse effects
    effects.forEach(fx => drawRingPulse(ctx, fx, now));

    // Enemies
    enemies.forEach(e => drawEnemy(ctx, e));

    // Particles — batched, no shadowBlur
    ctx.save();
    ctx.fillStyle = '#ff8844';
    particles.forEach(p => drawParticle(ctx, p, now));
    ctx.globalAlpha = 1;
    ctx.restore();

    // Player trail
    const stageDef = STAGES[player.stage];
    drawTrail(ctx, player.trail, stageDef?.headR ?? 10, damaged, now);

    // Player segments — taper from head to tail
    const segCount = stageDef?.segments ?? 0;
    const trail = player.trail;
    for (let s = 0; s < segCount; s++) {
      const offset = Math.floor(((s + 1) / (segCount + 1)) * trail.length);
      const pt = trail[offset];
      if (!pt) continue;
      // t=0 nearest head, t=1 farthest
      const t = (s + 1) / (segCount + 1);
      const segScale = 0.85 - t * 0.5;   // 0.85 → 0.35
      const segAlpha = 0.7 - t * 0.4;    // 0.70 → 0.30
      drawCreature(ctx, pt.x, pt.y, player.stage, damaged, now, segScale, segAlpha, false);
    }

    // Player head
    drawCreature(ctx, player.x, player.y, player.stage, damaged, now);

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

      <div className="snake-controls-hint">
        ← → ↑ ↓&nbsp;&nbsp;MOVE&nbsp;&nbsp;&nbsp;&nbsp;ESC&nbsp;&nbsp;PAUSE
      </div>

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
