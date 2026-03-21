import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
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

function drawTicks(ctx, r, count, len = 4) {
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

// ── Stage definitions ─────────────────────────────────────────────────────────

const STAGES = [
  null, // 0-indexed placeholder
  // Stage 1 — Spore
  {
    name: 'SPORE',
    headR: 8,
    trailLen: 15,
    segments: 0,
    draw(ctx) {
      drawCircle(ctx, 8);
      ctx.fill && null;
      drawDot(ctx, 2);
    },
  },
  // Stage 2 — Cell
  {
    name: 'CELL',
    headR: 12,
    trailLen: 25,
    segments: 1,
    draw(ctx) {
      drawCircle(ctx, 12);
      drawPolygon(ctx, 6, 5, -Math.PI / 2);
      drawTicks(ctx, 12, 5, 4);
    },
  },
  // Stage 3 — Form
  {
    name: 'FORM',
    headR: 16,
    trailLen: 36,
    segments: 2,
    draw(ctx) {
      drawCircle(ctx, 16);
      drawPolygon(ctx, 10, 6, 0);
      drawPolygon(ctx, 7, 3, Math.PI); // inverted triangle
      drawDot(ctx, 2);
    },
  },
  // Stage 4 — Entity
  {
    name: 'ENTITY',
    headR: 20,
    trailLen: 48,
    segments: 3,
    draw(ctx) {
      drawRing(ctx, 20, 17);
      drawPolygon(ctx, 13, 4, 0);       // square
      drawPolygon(ctx, 13, 4, Math.PI / 4); // rotated square = octagram
      drawPolygon(ctx, 8, 6, 0);
    },
  },
  // Stage 5 — Apex
  {
    name: 'APEX',
    headR: 26,
    trailLen: 65,
    segments: 5,
    draw(ctx) {
      drawCircle(ctx, 26);
      drawStar(ctx, 20, 12, 6, 0);
      drawPolygon(ctx, 13, 8, Math.PI / 8);
      drawCircle(ctx, 8);
      drawDot(ctx, 2);
      drawTicks(ctx, 26, 12, 5);
    },
  },
];

// Thresholds: absorptions needed per stage to advance
const ABSORB_THRESHOLDS = [0, 3, 6, 10, 15];

// ── Drawing helpers ───────────────────────────────────────────────────────────

function applyGlow(ctx, color, blur = 14) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
}

function drawCreature(ctx, x, y, stage, damaged, time) {
  const stageDef = STAGES[stage];
  if (!stageDef) return;

  const flickerOn = damaged ? Math.floor(time / 120) % 2 === 0 : false;
  const color = (damaged && flickerOn) ? '#ff4444' : '#00ff6a';
  const glowColor = (damaged && flickerOn) ? '#ff2222' : '#00ff6a';

  ctx.save();
  ctx.translate(x, y);
  applyGlow(ctx, glowColor, 18);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  stageDef.draw(ctx);
  ctx.restore();
}

function drawTrail(ctx, trail, headR, damaged, time) {
  if (trail.length < 2) return;
  const flickerOn = damaged ? Math.floor(time / 120) % 2 === 0 : false;
  const color = (damaged && flickerOn) ? '#ff4444' : '#00ff6a';

  for (let i = 0; i < trail.length; i++) {
    const t = trail[i];
    const frac = 1 - i / trail.length;
    const opacity = frac * 0.45;
    const r = Math.max(1, headR * 0.55 * frac);
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Collectible shapes ────────────────────────────────────────────────────────

const COLLECTIBLE_SIDES = [3, 4, 5, 6, 4]; // triangle, square, pentagon, hexagon, diamond

function drawCollectible(ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.rotation);
  applyGlow(ctx, '#00ff6a', 12);
  ctx.strokeStyle = 'rgba(0,255,106,0.8)';
  ctx.lineWidth = 1.2;
  const sides = COLLECTIBLE_SIDES[c.shapeIdx % COLLECTIBLE_SIDES.length];
  const rot = sides === 4 && c.shapeIdx === 4 ? Math.PI / 4 : 0;
  drawPolygon(ctx, c.r, sides, rot);
  ctx.restore();
}

// ── Enemy drawing ─────────────────────────────────────────────────────────────

function drawEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  applyGlow(ctx, '#ff3300', 14);
  ctx.strokeStyle = e.type === 'chaser' ? '#ff6644' : '#ff4400';
  ctx.lineWidth = 1.5;
  drawStar(ctx, 12, 6, 4, e.rotation);
  ctx.restore();
}

// ── Particle drawing ──────────────────────────────────────────────────────────

function drawParticle(ctx, p, now) {
  const age = (now - p.createdAt) / 1500;
  const opacity = Math.max(0, 1 - age);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = '#ff8844';
  ctx.shadowColor = '#ff4400';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
    r: 10 + Math.random() * 8,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (0.4 + Math.random() * 0.6) * (Math.random() < 0.5 ? 1 : -1),
  };
}

function makeWaypoints(W, H) {
  const count = 4;
  return Array.from({ length: count }, () => randomPos(W, H, 60));
}

function spawnEnemy(type, W, H) {
  const pos = randomPos(W, H, 60);
  return {
    ...pos,
    type,
    rotation: 0,
    lastShot: performance.now() + 1500 + Math.random() * 1500,
    speed: type === 'chaser' ? 65 : 80,
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
    enemies: [spawnEnemy('patroller', W, H), spawnEnemy('patroller', W, H)],
    particles: [],
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
    const W = canvas.width;
    const H = canvas.height;
    gRef.current = buildInitialState(W, H);
    gameStateRef.current = 'playing';
    setGameState('playing');
    setScore(0);
  }, []);

  // ── Keyboard ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
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

    // Size canvas to physical pixels
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
    const { player, collectibles, enemies, particles } = g;
    const keys = keysRef.current;

    // --- Movement ---
    const stage = player.stage;
    const SPEED = 180 + stage * 15;
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

    // Wrap edges
    if (player.x < 0)  player.x += W;
    if (player.x > W)  player.x -= W;
    if (player.y < 0)  player.y += H;
    if (player.y > H)  player.y -= H;

    // Trail
    const moved = Math.hypot(player.x - prevX, player.y - prevY);
    if (moved > 1.5) {
      player.trail.unshift({ x: player.x, y: player.y });
      const maxTrail = STAGES[stage]?.trailLen ?? 15;
      if (player.trail.length > maxTrail) player.trail.length = maxTrail;
    }

    // --- Absorb collectibles ---
    const headR = (STAGES[stage]?.headR ?? 8) + 10;
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const c = collectibles[i];
      const dx = player.x - c.x, dy = player.y - c.y;
      if (dx * dx + dy * dy < headR * headR) {
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
        // chaser
        const dx = player.x - e.x, dy = player.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          e.x += (dx / dist) * e.speed * delta;
          e.y += (dy / dist) * e.speed * delta;
        }
      }
      e.rotation += 1.2 * delta;

      // Shoot
      if (now - e.lastShot > 2500) {
        e.lastShot = now;
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        particles.push({
          x: e.x, y: e.y,
          vx: Math.cos(angle) * 250,
          vy: Math.sin(angle) * 250,
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

      // Damage check
      if (now >= player.damagedUntil) {
        const pdx = player.x - p.x, pdy = player.y - p.y;
        const hitR = 8 + stage * 2;
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
    if (stage === 3) {
      enemies.push(spawnEnemy('chaser', W, H));
    } else if (stage === 4) {
      enemies.push(spawnEnemy('chaser', W, H));
      enemies.forEach(e => { if (e.type === 'patroller') e.speed = 110; });
    } else if (stage === 5) {
      enemies.push(spawnEnemy('chaser', W, H));
      enemies.forEach(e => { if (e.type === 'patroller') e.speed = 130; });
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────

  function draw(now, W, H) {
    const canvas = canvasRef.current;
    const g = gRef.current;
    if (!canvas || !g) return;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#030308';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 106, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();

    const { player, collectibles, enemies, particles } = g;
    const damaged = now < player.damagedUntil;

    // Collectibles
    collectibles.forEach(c => drawCollectible(ctx, c));

    // Enemies
    enemies.forEach(e => drawEnemy(ctx, e));

    // Particles
    particles.forEach(p => drawParticle(ctx, p, now));

    // Player trail
    drawTrail(ctx, player.trail, STAGES[player.stage]?.headR ?? 8, damaged, now);

    // Player segments (body parts that trail behind, one per segment count)
    const segCount = STAGES[player.stage]?.segments ?? 0;
    const trail = player.trail;
    for (let s = 0; s < segCount; s++) {
      const offset = Math.floor(((s + 1) / (segCount + 1)) * trail.length);
      const pt = trail[offset];
      if (!pt) continue;
      ctx.save();
      ctx.globalAlpha = 0.5;
      drawCreature(ctx, pt.x, pt.y, player.stage, damaged, now);
      ctx.restore();
    }

    // Player head
    drawCreature(ctx, player.x, player.y, player.stage, damaged, now);

    // Stage label (top-right, subtle)
    ctx.save();
    ctx.font = '10px Orbitron, monospace';
    ctx.fillStyle = 'rgba(0,255,106,0.25)';
    ctx.textAlign = 'right';
    ctx.fillText(`${STAGES[player.stage]?.name ?? ''} — ABSORBS ${player.totalAbsorbs}`, W - 20, 28);
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
        ← → ↑ ↓&nbsp;&nbsp;MOVE&nbsp;&nbsp;&nbsp;&nbsp;ESC&nbsp;&nbsp;QUIT
      </div>

      {gameState === 'dead' && (
        <div className="snake-game-over">
          <h2>SIGNAL LOST</h2>
          <p>ENTITY DISSOLVED — {score} ABSORPTIONS</p>
          <div className="snake-game-over-btns">
            <button className="snake-btn" onClick={initGame}>RETRY</button>
            <button className="snake-btn danger" onClick={onClose}>QUIT</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
