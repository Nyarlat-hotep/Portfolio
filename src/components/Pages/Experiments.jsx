import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './Experiments.css';

// ── Isometric projection ──────────────────────────────────────────────────
// _rot is set at the top of drawFrame each tick (single-threaded, safe)
let _rot = 0;
const TW = 80, TH = 40, CH = 40;

function iso(gx, gy, gz, ox, oy, sc) {
  const rx = gx * Math.cos(_rot) - gy * Math.sin(_rot);
  const ry = gx * Math.sin(_rot) + gy * Math.cos(_rot);
  return {
    sx: ox + (rx - ry) * (TW / 2) * sc,
    sy: oy + (rx + ry) * (TH / 2) * sc - gz * CH * sc,
  };
}

// ── Grid ─────────────────────────────────────────────────────────────────
const NODE_POS = [[-3, -3], [3, -3], [-3, 3], [3, 3]];

function drawGrid(ctx, ox, oy, sc, gz = 0, lineAlpha = 0.10, nearAlpha = 0.22, withDetails = true) {
  const N = 7;
  ctx.save();
  for (let j = -N; j <= N; j++) {
    const near = NODE_POS.some(([, ny]) => Math.abs(ny - j) <= 1);
    ctx.strokeStyle = near ? `rgba(255,119,0,${nearAlpha})` : `rgba(255,119,0,${lineAlpha})`;
    ctx.lineWidth = 0.75;
    const a = iso(-N, j, gz, ox, oy, sc), b = iso(N, j, gz, ox, oy, sc);
    ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
  }
  for (let i = -N; i <= N; i++) {
    const near = NODE_POS.some(([nx]) => Math.abs(nx - i) <= 1);
    ctx.strokeStyle = near ? `rgba(255,119,0,${nearAlpha})` : `rgba(255,119,0,${lineAlpha})`;
    ctx.lineWidth = 0.75;
    const a = iso(i, -N, gz, ox, oy, sc), b = iso(i, N, gz, ox, oy, sc);
    ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
  }
  if (!withDetails) { ctx.restore(); return; }
  // Vertex dots
  ctx.fillStyle = 'rgba(150,200,30,0.28)';
  for (let i = -N; i <= N; i += 3) {
    for (let j = -N; j <= N; j += 3) {
      const p = iso(i, j, gz, ox, oy, sc);
      ctx.beginPath(); ctx.arc(p.sx, p.sy, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Circuit traces
  ctx.strokeStyle = 'rgba(150,200,30,0.22)';
  ctx.lineWidth = 1.0;
  ctx.setLineDash([3, 5]);
  const traces = [
    [[-3,-3],[-3,-6],[-6,-6]], [[-3,-3],[-6,-3],[-6,-1]],
    [[3,-3],[3,-6],[5,-6]],    [[3,-3],[6,-3],[6,-1]],
    [[-3,3],[-3,6],[-5,6]],   [[-3,3],[-6,3],[-6,5]],
    [[3,3],[3,6],[5,6]],       [[3,3],[6,3],[6,5]],
  ];
  for (const trace of traces) {
    ctx.beginPath();
    const s = iso(trace[0][0], trace[0][1], gz, ox, oy, sc);
    ctx.moveTo(s.sx, s.sy);
    for (let k = 1; k < trace.length; k++) {
      const p = iso(trace[k][0], trace[k][1], gz, ox, oy, sc);
      ctx.lineTo(p.sx, p.sy);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

// ── Void decorations ─────────────────────────────────────────────────────
function drawDecorations(ctx, ox, oy, sc, t) {
  ctx.save();

  // Center scanning reticle — two partial dashed arcs
  const center = iso(0, 0, 0.05, ox, oy, sc);
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 0.75;
  for (const r of [1.6, 2.8]) {
    const rx = r * (TW / 2) * sc, ry = r * (TH / 2) * sc;
    ctx.strokeStyle = 'rgba(150,200,30,0.13)';
    ctx.beginPath();
    ctx.ellipse(center.sx, center.sy, rx, ry, 0, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(center.sx, center.sy, rx, ry, 0, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Tick marks along front-right grid rail (gy=7, gx varies)
  ctx.strokeStyle = 'rgba(150,200,30,0.28)';
  ctx.lineWidth = 0.75;
  for (let gx = -6; gx <= 6; gx += 2) {
    const p = iso(gx, 7, 0, ox, oy, sc);
    const up = iso(gx, 7, 0.15, ox, oy, sc);
    ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(up.sx, up.sy); ctx.stroke();
  }
  // Front-left rail (gx=-7, gy varies)
  for (let gy = -6; gy <= 6; gy += 2) {
    const p = iso(-7, gy, 0, ox, oy, sc);
    const up = iso(-7, gy, 0.15, ox, oy, sc);
    ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(up.sx, up.sy); ctx.stroke();
  }

  // Text: main title near back area
  const titlePos = iso(-4, -7.5, 0.1, ox, oy, sc);
  const fs = Math.max(13, 17 * sc);
  ctx.font = `${fs}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const titleAlpha = 0.40 + 0.08 * Math.sin(t * 0.4);
  ctx.fillStyle = `rgba(255,119,0,${titleAlpha})`;
  ctx.fillText('VOID // EXPERIMENTS', titlePos.sx, titlePos.sy);

  // Text: scanning block along right-forward edge
  const scanPos = iso(8.2, -2, 0.1, ox, oy, sc);
  const ss = Math.max(11, 14 * sc);
  ctx.font = `${ss}px monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const scanAlpha = 0.30 + 0.12 * Math.sin(t * 0.9 + 1.2);
  ctx.fillStyle = `rgba(255,119,0,${scanAlpha})`;
  ctx.fillText('SCANNING...', scanPos.sx, scanPos.sy);
  ctx.fillStyle = `rgba(255,119,0,${scanAlpha * 0.80})`;
  ctx.fillText('// 4 ANOMALIES DETECTED', scanPos.sx, scanPos.sy + ss * 1.6);

  // Text: coordinate label near back-right corner
  const coordPos = iso(7.5, -7.5, 0.05, ox, oy, sc);
  ctx.font = `${Math.max(9, 12 * sc)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(150,200,30,0.20)';
  ctx.fillText('[ 0 : 0 : 0 ]', coordPos.sx, coordPos.sy);

  // Corner bracket markers at each experiment node
  for (const [gx, gy] of NODE_POS) {
    const p = iso(gx, gy, 0, ox, oy, sc);
    const bs = 7 * sc;
    ctx.strokeStyle = 'rgba(150,200,30,0.28)';
    ctx.lineWidth = 0.8;
    // Four tiny L-corners
    [[-1,-0.5],[-1,0.5],[1,-0.5],[1,0.5]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(p.sx + sx * bs, p.sy + sy * bs * 0.4);
      ctx.lineTo(p.sx + sx * bs, p.sy);
      ctx.lineTo(p.sx + sx * bs * 0.4, p.sy);
      ctx.stroke();
    });
  }

  // Faint depth lines near two back corners
  ctx.strokeStyle = 'rgba(0,220,80,0.07)';
  ctx.lineWidth = 0.75;
  ctx.setLineDash([2, 8]);
  for (const [gx, gy] of [[-7,-7],[7,-7]]) {
    const base = iso(gx, gy, 0, ox, oy, sc);
    const top  = iso(gx, gy, 3, ox, oy, sc);
    ctx.beginPath(); ctx.moveTo(base.sx, base.sy); ctx.lineTo(top.sx, top.sy); ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.restore();
}

// ── Pulse Rings ───────────────────────────────────────────────────────────
function drawPulseRings(ctx, configs, t, hoveredId, ox, oy, sc) {
  ctx.save();
  for (let ni = 0; ni < configs.length; ni++) {
    const { id, gridPos: [gx, gy] } = configs[ni];
    const base = iso(gx, gy, 0, ox, oy, sc);
    const hov = id === hoveredId;
    for (let ri = 0; ri < 3; ri++) {
      const phase = (t * 0.35 + ni * 0.7 + ri * 0.33) % 1;
      const r = 0.5 + phase * 2.2;
      const alpha = (1 - phase) * (hov ? 0.55 : 0.28);
      ctx.strokeStyle = hov ? `rgba(0,255,106,${alpha})` : `rgba(255,119,0,${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(base.sx, base.sy, r * (TW / 2) * sc, r * (TH / 2) * sc, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ── Crystal — VISUAL_ARCHIVE ──────────────────────────────────────────────
function drawCrystal(ctx, gx, gy, ox, oy, sc, bob, hov) {
  const c = hov ? '0,255,106' : '150,200,30';
  const layers = [{ gz: 0, s: 1.4 }, { gz: 0.65, s: 0.9 }, { gz: 1.25, s: 0.4 }];
  const pts = layers.map(({ gz, s }) => [
    iso(gx, gy - s, gz, ox, oy, sc), iso(gx + s, gy, gz, ox, oy, sc),
    iso(gx, gy + s, gz, ox, oy, sc), iso(gx - s, gy, gz, ox, oy, sc),
  ].map(p => ({ sx: p.sx, sy: p.sy - bob })));
  ctx.save();
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = `rgba(${c},0.45)`;
  ctx.lineWidth = 0.75;
  for (let li = 0; li < layers.length - 1; li++)
    for (let vi = 0; vi < 4; vi++) {
      ctx.beginPath();
      ctx.moveTo(pts[li][vi].sx, pts[li][vi].sy);
      ctx.lineTo(pts[li + 1][vi].sx, pts[li + 1][vi].sy);
      ctx.stroke();
    }
  ctx.setLineDash([]);
  for (let li = 0; li < layers.length; li++) {
    const [n, e, s, w] = pts[li];
    const top = li === layers.length - 1;
    ctx.fillStyle = `rgba(${c},${top ? (hov ? 0.18 : 0.06) : (hov ? 0.10 : 0.04)})`;
    ctx.strokeStyle = `rgba(${c},${top ? (hov ? 0.95 : 0.72) : (hov ? 0.80 : 0.55)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(n.sx, n.sy); ctx.lineTo(e.sx, e.sy);
    ctx.lineTo(s.sx, s.sy); ctx.lineTo(w.sx, w.sy);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// ── Stepped Cube — CONDITION_BUILDER ─────────────────────────────────────
function drawCube(ctx, gx, gy, ox, oy, sc, bob, hov) {
  const c = hov ? '0,255,106' : '150,200,30';
  const hs = 0.8, h = 1.25;
  const mkC = (hs, z0, z1) => [
    iso(gx+hs,gy+hs,z0,ox,oy,sc), iso(gx-hs,gy+hs,z0,ox,oy,sc),
    iso(gx-hs,gy-hs,z0,ox,oy,sc), iso(gx+hs,gy-hs,z0,ox,oy,sc),
    iso(gx+hs,gy+hs,z1,ox,oy,sc), iso(gx-hs,gy+hs,z1,ox,oy,sc),
    iso(gx-hs,gy-hs,z1,ox,oy,sc), iso(gx+hs,gy-hs,z1,ox,oy,sc),
  ].map(p => ({ sx: p.sx, sy: p.sy - bob }));
  const c8 = mkC(hs, 0, h), st = mkC(0.44, h, h + 0.4);
  ctx.save();
  const face = (ps, fill, stroke, sw = 1) => {
    ctx.fillStyle = `rgba(${c},${fill})`; ctx.strokeStyle = `rgba(${c},${stroke})`; ctx.lineWidth = sw;
    ctx.beginPath(); ps.forEach((p, k) => k ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy));
    ctx.closePath(); ctx.fill(); ctx.stroke();
  };
  face([c8[2],c8[3],c8[7],c8[6]], 0.04, 0.45);
  face([c8[0],c8[1],c8[5],c8[4]], 0.04, 0.45);
  face([c8[4],c8[5],c8[6],c8[7]], hov ? 0.14 : 0.07, hov ? 0.85 : 0.65);
  face([c8[1],c8[2],c8[6],c8[5]], 0.04, 0.50);
  face([c8[3],c8[0],c8[4],c8[7]], 0.04, 0.50);
  face([st[4],st[5],st[6],st[7]], hov ? 0.20 : 0.09, hov ? 0.95 : 0.72);
  face([st[2],st[3],st[7],st[6]], 0.03, hov ? 0.70 : 0.40);
  face([st[1],st[2],st[6],st[5]], 0.03, hov ? 0.70 : 0.40);
  ctx.strokeStyle = `rgba(${c},${hov ? 0.70 : 0.55})`; ctx.lineWidth = 0.75;
  [[0,4],[1,5],[2,6],[3,7]].forEach(([a,b]) => {
    ctx.beginPath(); ctx.moveTo(c8[a].sx,c8[a].sy); ctx.lineTo(c8[b].sx,c8[b].sy); ctx.stroke();
  });
  ctx.restore();
}

// ── Sphere — DICE_ROLLER ──────────────────────────────────────────────────
function drawSphere(ctx, gx, gy, ox, oy, sc, bob, hov) {
  const c = hov ? '0,255,106' : '150,200,30';
  const rings = [
    {gz:0.1,r:0.5},{gz:0.55,r:1.0},{gz:1.0,r:1.2},{gz:1.45,r:1.0},{gz:1.9,r:0.5},
  ];
  ctx.save();
  for (let ri = 0; ri < rings.length; ri++) {
    const { gz, r } = rings[ri];
    const p = iso(gx, gy, gz, ox, oy, sc);
    const eq = ri === 2;
    ctx.strokeStyle = `rgba(${c},${eq ? (hov?0.90:0.70) : (hov?0.65:0.48)})`;
    ctx.lineWidth = eq ? (hov ? 1.5 : 1.2) : 0.9;
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy - bob, r*(TW/2)*sc, r*(TH/2)*sc, 0, 0, Math.PI*2);
    ctx.stroke();
  }
  for (let ai = 0; ai < 4; ai++) {
    const angle = (ai / 4) * Math.PI * 2;
    ctx.strokeStyle = `rgba(${c},${hov?0.45:0.30})`; ctx.lineWidth = 0.75;
    ctx.beginPath(); let first = true;
    for (const { gz, r } of rings) {
      const p = iso(gx+Math.cos(angle)*r, gy+Math.sin(angle)*r, gz, ox, oy, sc);
      if (first) { ctx.moveTo(p.sx, p.sy-bob); first=false; } else ctx.lineTo(p.sx, p.sy-bob);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ── Dome — DRAG_INTERACTION ───────────────────────────────────────────────
function drawDome(ctx, gx, gy, ox, oy, sc, bob, hov) {
  const c = hov ? '0,255,106' : '150,200,30';
  const rings = [
    {gz:0,r:1.4},{gz:0.38,r:1.25},{gz:0.70,r:1.0},
    {gz:0.95,r:0.70},{gz:1.15,r:0.38},{gz:1.28,r:0.10},
  ];
  ctx.save();
  for (let ri = 0; ri < rings.length; ri++) {
    const { gz, r } = rings[ri];
    const p = iso(gx, gy, gz, ox, oy, sc);
    const isCyan = hov && ri <= 1;
    ctx.strokeStyle = isCyan ? 'rgba(0,255,106,0.90)' : `rgba(${c},${ri===0?(hov?0.85:0.65):(hov?0.78:0.55)})`;
    ctx.lineWidth = ri === 0 ? 1.2 : 1;
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy-bob, r*(TW/2)*sc, r*(TH/2)*sc, 0, 0, Math.PI*2);
    ctx.stroke();
  }
  ctx.lineWidth = 0.6;
  for (let ai = 0; ai < 8; ai++) {
    const angle = (ai / 8) * Math.PI * 2;
    ctx.strokeStyle = `rgba(${c},${hov?0.45:0.30})`;
    for (let ri = 0; ri < rings.length-1; ri++) {
      const {r:r1,gz:gz1}=rings[ri], {r:r2,gz:gz2}=rings[ri+1];
      const p1=iso(gx+Math.cos(angle)*r1,gy+Math.sin(angle)*r1,gz1,ox,oy,sc);
      const p2=iso(gx+Math.cos(angle)*r2,gy+Math.sin(angle)*r2,gz2,ox,oy,sc);
      ctx.beginPath(); ctx.moveTo(p1.sx,p1.sy-bob); ctx.lineTo(p2.sx,p2.sy-bob); ctx.stroke();
    }
  }
  ctx.restore();
}

// ── Label ─────────────────────────────────────────────────────────────────
function drawLabel(ctx, sx, sy, title, hov, sc) {
  ctx.save();
  const fs = Math.max(9, 11 * sc);
  ctx.font = `${fs}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  if (hov) {
    const w = ctx.measureText(title).width + 16, h = fs + 8;
    ctx.fillStyle = 'rgba(8,4,0,0.82)';
    ctx.fillRect(sx - w/2, sy - h, w, h);
    ctx.strokeStyle = 'rgba(0,255,106,0.45)';
    ctx.lineWidth = 0.75;
    ctx.strokeRect(sx - w/2, sy - h, w, h);
    ctx.fillStyle = 'rgba(0,255,106,0.95)';
  } else {
    ctx.fillStyle = 'rgba(150,200,30,0.45)';
  }
  ctx.fillText(title, sx, sy);
  ctx.restore();
}

// ── Particles ─────────────────────────────────────────────────────────────
function makePts(seed) {
  let s = seed;
  const rng = () => { s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; };
  return Array.from({length:35}, () => ({
    x:rng(), y:rng(), baseOpacity:0.08+rng()*0.16, speed:0.4+rng()*1.2, phase:rng()*Math.PI*2,
  }));
}
const PARTICLES = makePts(42);

function drawParticles(ctx, t, cssW, cssH) {
  for (const p of PARTICLES) {
    const a = p.baseOpacity * (0.5 + 0.5 * Math.sin(t * p.speed + p.phase));
    ctx.fillStyle = `rgba(255,119,0,${a})`;
    ctx.beginPath(); ctx.arc(p.x*cssW, p.y*cssH, 1.5, 0, Math.PI*2); ctx.fill();
  }
}

// ── Config ────────────────────────────────────────────────────────────────
const EXPERIMENT_CONFIGS = [
  { id:'VISUAL_ARCHIVE',    gridPos:[-3,-3], structureType:'crystal', bobPhase:0.0  },
  { id:'CONDITION_BUILDER', gridPos:[ 3,-3], structureType:'cube',    bobPhase:1.57 },
  { id:'DICE_ROLLER',       gridPos:[-3, 3], structureType:'sphere',  bobPhase:3.14 },
  { id:'DRAG_INTERACTION',  gridPos:[ 3, 3], structureType:'dome',    bobPhase:4.71 },
];
const STRUCT_FNS = { crystal:drawCrystal, cube:drawCube, sphere:drawSphere, dome:drawDome };
const STRUCT_H   = { crystal:1.25, cube:1.65, sphere:1.9, dome:1.28 };

const EXPERIMENT_META = [
  { id:'VISUAL_ARCHIVE',    title:'VISUAL_ARCHIVE',
    description:'Fragments of creation. Images pulled from the spaces between projects. Handle with care.',
    tags:['Gallery','Art'], link:null, isGallery:true },
  { id:'CONDITION_BUILDER', title:'CONDITION_BUILDER',
    description:'Visual logic builder. Drag conditions into groups, toggle AND/OR, watch the expression form.',
    tags:['Tool','Logic'], link:'https://nyarlat-hotep.github.io/better-condition-builder/', isGallery:false },
  { id:'DICE_ROLLER',       title:'DICE_ROLLER',
    description:'Seven sacred polyhedra. d4 through d100, advantage, disadvantage, and the chronicle of every roll.',
    tags:['Tool','3D','D&D'], link:'https://nyarlat-hotep.github.io/dice-roller/', isGallery:false },
  { id:'DRAG_INTERACTION',  title:'DRAG_INTERACTION',
    description:'How much time do you really spend? Drag to paint weekly screen time. Physics-driven dots pile up as the hours grow.',
    tags:['Interaction','Physics','Data Viz'], link:'https://nyarlat-hotep.github.io/drag-interaction/', isGallery:false },
];

// ── Main drawFrame ────────────────────────────────────────────────────────
function drawFrame(ctx, cssW, cssH, t, hoveredId, nodesRef, rot) {
  _rot = rot;
  // Scale so the grid fills ~95% of the viewport width
  const sc = Math.min(1.4, cssW / 700);
  const ox = cssW / 2;
  const oy = cssH * 0.50;

  drawDecorations(ctx, ox, oy, sc, t);
  drawGrid(ctx, ox, oy, sc, -0.9, 0.04, 0.07, false);  // lower grid — depth layer
  drawGrid(ctx, ox, oy, sc);                             // main grid
  drawPulseRings(ctx, EXPERIMENT_CONFIGS, t, hoveredId, ox, oy, sc);

  const sorted = [...EXPERIMENT_CONFIGS].sort(
    (a, b) => (a.gridPos[0]+a.gridPos[1]) - (b.gridPos[0]+b.gridPos[1])
  );

  nodesRef.current = [];
  for (const cfg of sorted) {
    const [gx, gy] = cfg.gridPos;
    const base = iso(gx, gy, 0, ox, oy, sc);
    const hov = cfg.id === hoveredId;
    const bob = Math.sin(t * 0.8 + cfg.bobPhase) * 4 * sc;
    STRUCT_FNS[cfg.structureType]?.(ctx, gx, gy, ox, oy, sc, bob, hov);
    const labelSy = base.sy - STRUCT_H[cfg.structureType] * CH * sc - bob - 10;
    drawLabel(ctx, base.sx, labelSy, cfg.id, hov, sc);
    nodesRef.current.push({ id:cfg.id, sx:base.sx, sy:base.sy, hitW:55*sc, hitH:28*sc });
  }

  drawParticles(ctx, t, cssW, cssH);
}

// ── Gallery images ────────────────────────────────────────────────────────
const galleryImages = [
  '/images/case-studies/visualdesign/OS - dash.png',
  '/images/case-studies/visualdesign/OS 1 - client.png',
  '/images/case-studies/visualdesign/Omni.png',
  '/images/case-studies/visualdesign/Product Recommendations-1.png',
  '/images/case-studies/visualdesign/Scene 1_ Dashboard (daily landing view with Tasks).png',
  '/images/case-studies/visualdesign/TM dashboard.png',
  '/images/case-studies/visualdesign/dashboard home improvements.png',
  '/images/case-studies/visualdesign/messy kitchen AR 9.png',
  '/images/case-studies/visualdesign/v2 homes.png',
  '/images/case-studies/visualdesign/v2.png',
  '/images/case-studies/visualdesign/Frame 48097530.png',
  '/images/case-studies/visualdesign/Frame 48097531.png',
  '/images/case-studies/visualdesign/Frame 48099754.png',
  '/images/case-studies/visualdesign/Frame 48099768.png',
  '/images/case-studies/visualdesign/Frame 48099769.png',
  '/images/case-studies/visualdesign/Frame 48099770.png',
  '/images/case-studies/visualdesign/Frame 48099771.png',
  '/images/case-studies/visualdesign/Frame 48099772.png',
  '/images/case-studies/visualdesign/Frame 48099773.png',
  '/images/case-studies/visualdesign/Frame 48099774.png',
  '/images/case-studies/visualdesign/Frame 48099775.png',
  '/images/case-studies/visualdesign/Frame 48099776.png',
  '/images/case-studies/visualdesign/Frame 48099777.png',
  '/images/case-studies/visualdesign/Frame 48099778.png',
  '/images/case-studies/visualdesign/Frame 48099779.png',
  '/images/case-studies/visualdesign/HBP-progress.png',
  '/images/case-studies/visualdesign/car goal.png',
];

// ── Component ─────────────────────────────────────────────────────────────
const DRAG_SENS  = 0.002;  // rad/px
const DRAG_DAMP  = 0.95;   // velocity multiplier per frame (≈ Three.js orbit damping)

export default function Experiments({ scrollContainerRef, isVoidMode = false }) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [galleryOpen, setGalleryOpen]     = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);

  const canvasRef      = useRef(null);
  const containerRef   = useRef(null);
  const rafRef         = useRef(null);
  const timeRef        = useRef(0);
  const cssSizeRef     = useRef({ w: 700, h: 500 });
  const nodesRef       = useRef([]);
  const hoveredIdRef   = useRef(null);
  const rotRef         = useRef(0);
  const velRef         = useRef(0);
  const isDraggingRef  = useRef(false);
  const panelRef       = useRef(null);
  const itemRefs       = useRef([]);
  const touchStartY    = useRef(0);

  // Gallery handlers (unchanged)
  const handleItemClick = (i) => {
    const newIndex = expandedIndex === i ? null : i;
    setExpandedIndex(newIndex);
    if (newIndex !== null)
      setTimeout(() => itemRefs.current[i]?.scrollIntoView({ behavior:'smooth', block:'center' }), 420);
  };
  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd   = (e) => {
    if (e.changedTouches[0].clientY - touchStartY.current > 150) setGalleryOpen(false);
  };

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let lastT = performance.now(), rafId;

    function loop(now) {
      const delta = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      timeRef.current += delta;

      // Inertia when not dragging
      if (!isDraggingRef.current) {
        rotRef.current += velRef.current;
        velRef.current *= DRAG_DAMP;
        if (Math.abs(velRef.current) < 0.0001) velRef.current = 0;
      }

      const { w, h } = cssSizeRef.current;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      drawFrame(ctx, w, h, timeRef.current, hoveredIdRef.current, nodesRef, rotRef.current);
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    rafRef.current = rafId;

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(rafRef.current);
      else rafRef.current = requestAnimationFrame(loop);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelAnimationFrame(rafId); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current, canvas = canvasRef.current;
    if (!container || !canvas) return;
    const observer = new ResizeObserver(entries => {
      const { width: w, height: h } = entries[0].contentRect;
      cssSizeRef.current = { w, h };
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr; canvas.height = h * dpr;
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Interaction (hover + drag + click)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getHit(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left, my = clientY - rect.top;
      return nodesRef.current.find(n =>
        ((mx-n.sx)/n.hitW)**2 + ((my-n.sy)/n.hitH)**2 <= 1
      );
    }

    function triggerNode(id) {
      const meta = EXPERIMENT_META.find(m => m.id === id);
      if (meta?.isGallery) setGalleryOpen(true);
      else if (meta?.link) window.open(meta.link, '_blank', 'noopener,noreferrer');
    }

    // ─ Mouse ─
    let mouseDownX = 0, mouseDownY = 0;

    const onMouseDown = e => {
      isDraggingRef.current = true;
      mouseDownX = e.clientX; mouseDownY = e.clientY;
      velRef.current = 0;
      // Clear hover — panel disappears while dragging
      hoveredIdRef.current = null;
      setHoveredNodeId(null);
      canvas.style.cursor = 'grabbing';
    };

    const onMouseMove = e => {
      if (isDraggingRef.current) {
        const dx = e.clientX - mouseDownX;
        rotRef.current -= dx * DRAG_SENS;
        velRef.current = -dx * DRAG_SENS;
        mouseDownX = e.clientX;
      } else {
        const hit = getHit(e.clientX, e.clientY);
        const id = hit?.id ?? null;
        hoveredIdRef.current = id;
        setHoveredNodeId(id);
        canvas.style.cursor = hit ? 'pointer' : 'grab';
      }
    };

    const onMouseUp = e => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        canvas.style.cursor = 'grab';
        // Check if it was a click (small movement)
        const dx = e.clientX - mouseDownX, dy = e.clientY - mouseDownY;
        if (dx*dx + dy*dy < 25) {
          const hit = getHit(e.clientX, e.clientY);
          if (hit) triggerNode(hit.id);
        }
      }
    };

    const onMouseLeave = () => {
      isDraggingRef.current = false;
      hoveredIdRef.current = null;
      setHoveredNodeId(null);
      canvas.style.cursor = 'default';
    };

    const onClick = e => {
      if (!isDraggingRef.current) {
        const hit = getHit(e.clientX, e.clientY);
        if (hit) triggerNode(hit.id);
      }
    };

    // ─ Touch ─
    let tapStart = null, lastTouchX = 0;

    const onTouchStart = e => {
      const t = e.touches[0];
      tapStart = { x: t.clientX, y: t.clientY, time: Date.now() };
      lastTouchX = t.clientX;
      isDraggingRef.current = true;
      velRef.current = 0;
      hoveredIdRef.current = null;
      setHoveredNodeId(null);
    };

    const onTouchMove = e => {
      if (!isDraggingRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - lastTouchX;
      rotRef.current -= dx * DRAG_SENS;
      velRef.current = -dx * DRAG_SENS;
      lastTouchX = t.clientX;
    };

    const onTouchEnd = e => {
      isDraggingRef.current = false;
      if (!tapStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - tapStart.x, dy = t.clientY - tapStart.y;
      const elapsed = Date.now() - tapStart.time;
      if (dx*dx + dy*dy < 144 && elapsed < 300) {
        const hit = getHit(t.clientX, t.clientY);
        if (hit) triggerNode(hit.id);
      }
      tapStart = null;
    };

    canvas.style.cursor = 'grab';
    canvas.addEventListener('mousedown',  onMouseDown);
    canvas.addEventListener('mousemove',  onMouseMove);
    canvas.addEventListener('mouseup',    onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('click',      onClick);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: true });
    canvas.addEventListener('touchend',   onTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown',  onMouseDown);
      canvas.removeEventListener('mousemove',  onMouseMove);
      canvas.removeEventListener('mouseup',    onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('click',      onClick);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
    };
  }, []);

  const activeExp = EXPERIMENT_META.find(e => e.id === hoveredNodeId);

  return (
    <div className={`experiments-page${isVoidMode ? ' void-mode' : ''}`}>
      <div className="iso-canvas-container" ref={containerRef}>
        <canvas className="iso-canvas" ref={canvasRef} />

      </div>

      {/* Info panel — portaled to body to escape void-container stacking context */}
      {createPortal(
        <AnimatePresence>
          {activeExp && (
            <motion.div
              key={activeExp.id}
              className="iso-info-panel"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="iso-panel-header">
                <span className="iso-panel-dot" />
                <span className="iso-panel-title">{activeExp.title}</span>
              </div>
              <p className="iso-panel-desc">{activeExp.description}</p>
              <div className="iso-panel-footer">
                <div className="iso-panel-tags">
                  {activeExp.tags.map(tag => (
                    <span key={tag} className="iso-panel-tag">{tag}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Gallery portal (unchanged) */}
      {createPortal(
        <>
          <AnimatePresence>
            {galleryOpen && (
              <motion.div
                className="gallery-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => setGalleryOpen(false)}
              />
            )}
          </AnimatePresence>
          <motion.div
            ref={panelRef}
            className="gallery-clipper"
            animate={{ y: galleryOpen ? 0 : '100%' }}
            initial={{ y: '100%' }}
            transition={{ type: 'spring', damping: 27, stiffness: 300 }}
            style={{ pointerEvents: galleryOpen ? 'auto' : 'none' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="gallery-panel">
              <div className="gallery-swipe-indicator"><div className="swipe-bar" /></div>
              <div className="gallery-header">
                <div className="gallery-title-group">
                  <h2 className="gallery-title">VISUAL_ARCHIVE</h2>
                </div>
              </div>
              <div className="gallery-grid">
                {galleryImages.map((src, i) => (
                  <div
                    key={i}
                    ref={el => { itemRefs.current[i] = el; }}
                    className={`gallery-item${expandedIndex === i ? ' gallery-item--expanded' : ''}`}
                    onClick={() => handleItemClick(i)}
                    role="button"
                  >
                    <img src={src} alt={`Visual archive ${i + 1}`} className="gallery-img" decoding="async" />
                  </div>
                ))}
              </div>
              <div className="gallery-bottom-fade" />
            </div>
          </motion.div>
        </>,
        document.body
      )}
    </div>
  );
}
