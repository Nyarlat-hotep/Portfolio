import { useMemo, useEffect, useRef, useState, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNebulaSplatTexture } from '../../utils/threeUtils';
import PlanetField from './PlanetField';
import { playBlackHole, stopBlackHole } from '../../utils/sounds';
import {
  WELL_RAMP, GRAVITY_DURATION,
  SPIRAL_ENTER_R, HORIZON_R,
  INSPIRAL_RATE, ORBIT_RATE, ORBIT_FALLOFF, FLATTEN_RATE, HEAT_RAMP,
} from './blackHoleConstants';
import BlackHoleLens from './BlackHoleLens';
import { disposeBlackbodyLUT } from '../../utils/blackbodyLUT';

const WORLD_X = -60, WORLD_Y = 0, WORLD_Z = 20;
const N = 6000;

const PULL_MAX         = 80;
const TANGENT_F        = 25;   // tangential force constant (orbital spiraling)
const FADE_SPEED       = 0.35; // color fade-in rate (1/s) — ~2.8s to fully reappear

let _wellId = 0;

const PAL = [
  new THREE.Color('#26cdd4'), // cyan
  new THREE.Color('#b033dd'), // bright purple
];

const BLINK_PAL = [
  new THREE.Color('#ffdd33'), // yellow
  new THREE.Color('#ff3322'), // red
  new THREE.Color('#33ff66'), // green
  new THREE.Color('#ff8800'), // orange
  new THREE.Color('#ffffff'), // white
  new THREE.Color('#ff44bb'), // pink
  new THREE.Color('#88ff00'), // lime
  new THREE.Color('#ff6600'), // amber
];

function buildBlinks() {
  const COUNT = 40;
  const pos  = new Float32Array(COUNT * 3);
  const col  = new Float32Array(COUNT * 3); // starts all black
  const meta = [];

  for (let i = 0; i < COUNT; i++) {
    pos[i*3]   = randG() * 22;
    pos[i*3+1] = randG() * 6;
    pos[i*3+2] = randG() * 12;

    const c    = BLINK_PAL[Math.floor(Math.random() * BLINK_PAL.length)];
    const peak = 0.35 + Math.random() * 0.25; // 35–60% brightness at peak

    meta.push({
      period: 1.5 + Math.random() * 3, // blink cycle length in seconds
      phase:  Math.random() * Math.PI * 2,
      peakR:  c.r * peak,
      peakG:  c.g * peak,
      peakB:  c.b * peak,
      hx: pos[i*3], hy: pos[i*3+1], hz: pos[i*3+2], // home position
    });
  }

  const posAttr = new THREE.BufferAttribute(pos, 3);
  posAttr.usage = THREE.DynamicDrawUsage;
  const colAttr = new THREE.BufferAttribute(col, 3);
  colAttr.usage = THREE.DynamicDrawUsage;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color', colAttr);
  return { geo, meta };
}

function randG() {
  const u = Math.max(1e-10, Math.random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

function buildField() {
  const pos        = new Float32Array(N * 3);
  const home       = new Float32Array(N * 3);
  const vel        = new Float32Array(N * 3);
  const col        = new Float32Array(N * 3);
  const homeCol    = new Float32Array(N * 3); // original colors for fade-back
  const capturedBy = new Int32Array(N).fill(-1);
  const fadeProg   = new Float32Array(N).fill(0); // 0 = normal, >0 = fading in
  // 0 = free, >0 = seconds spent spiralling in, -1 = past the horizon (hidden).
  // Kept separate from capturedBy so collapseWell's existing reset, which keys
  // on capturedBy, still catches particles in either state.
  const spiralT    = new Float32Array(N).fill(0);

  for (let i = 0; i < N; i++) {
    const x = randG() * 18;
    const y = randG() * 5;
    const z = randG() * 10;
    pos[i*3] = home[i*3] = x;
    pos[i*3+1] = home[i*3+1] = y;
    pos[i*3+2] = home[i*3+2] = z;
    const c = PAL[Math.floor(Math.random() * PAL.length)];
    const b = 0.15 + Math.random() * 0.4;
    col[i*3]   = homeCol[i*3]   = c.r * b;
    col[i*3+1] = homeCol[i*3+1] = c.g * b;
    col[i*3+2] = homeCol[i*3+2] = c.b * b;
  }

  const posAttr = new THREE.BufferAttribute(pos, 3);
  posAttr.usage = THREE.DynamicDrawUsage;
  const colAttr = new THREE.BufferAttribute(col, 3);
  colAttr.usage = THREE.DynamicDrawUsage;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color', colAttr);
  return { geo, vel, home, homeCol, capturedBy, fadeProg, spiralT };
}

// Infalling matter needs to read as streaking, but pointsMaterial draws square
// sprites and cannot stretch. A small pool of line segments, rewritten each
// frame for whichever particles are currently spiralling, does it in one extra
// draw call. Capped rather than one-per-particle: measured, ~864 of the 6000
// start inside the capture radius and so are taken on the first frame, which is
// the peak. 1024 covers that with headroom and is still one draw call and ~48KB;
// setDrawRange means unused slots cost nothing.
const STREAK_CAP   = 1024;
const STREAK_TRAIL = 5;    // extrapolate the tail back this many frames of travel

function buildStreaks() {
  const pos = new Float32Array(STREAK_CAP * 6);   // 2 vertices x 3 components
  const col = new Float32Array(STREAK_CAP * 6);
  const posAttr = new THREE.BufferAttribute(pos, 3);
  posAttr.usage = THREE.DynamicDrawUsage;
  const colAttr = new THREE.BufferAttribute(col, 3);
  colAttr.usage = THREE.DynamicDrawUsage;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color', colAttr);
  geo.setDrawRange(0, 0);
  return geo;
}

function buildHaze() {
  const count = 300;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i*3]   = randG() * 20;
    pos[i*3+1] = randG() * 6;
    pos[i*3+2] = randG() * 12;
    const c = PAL[Math.floor(Math.random() * PAL.length)];
    col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}



let _cloudTex = null;
function getCloudTex() {
  if (_cloudTex) return _cloudTex;
  const size = 256, c = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0,    'rgba(255,255,255,0.9)');
  g.addColorStop(0.20, 'rgba(255,255,255,0.65)');
  g.addColorStop(0.50, 'rgba(255,255,255,0.20)');
  g.addColorStop(0.80, 'rgba(255,255,255,0.04)');
  g.addColorStop(1.0,  'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return (_cloudTex = new THREE.CanvasTexture(canvas));
}

// 11 cloud knots placed within the nebula's particle spread
const CLOUD_KNOTS = [
  { x:  8,  y:  1.5, z:  3,  s: 13, color: '#c026d3', opacity: 0.13 },
  { x: -7,  y: -1,   z: -4,  s: 10, color: '#be185d', opacity: 0.12 },
  { x:  2,  y:  2,   z:  6,  s: 14, color: '#a855f7', opacity: 0.10 },
  { x: -12, y:  0.5, z:  2,  s: 11, color: '#9d174d', opacity: 0.13 },
  { x:  14, y: -1.5, z: -2,  s:  9, color: '#c026d3', opacity: 0.11 },
  { x:  0,  y:  3,   z: -5,  s: 12, color: '#a21caf', opacity: 0.12 },
  { x: -5,  y: -2.5, z:  7,  s:  8, color: '#be185d', opacity: 0.11 },
  { x:  10, y:  1,   z: -6,  s: 10, color: '#7c3aed', opacity: 0.10 },
  { x: -9,  y:  2,   z: -3,  s: 13, color: '#c026d3', opacity: 0.13 },
  { x:  3,  y: -1,   z:  4,  s:  9, color: '#9d174d', opacity: 0.11 },
  { x: -3,  y:  0,   z: -8,  s: 11, color: '#a21caf', opacity: 0.12 },
];

function NebulaCloudLayer() {
  const cloudTex = useMemo(() => getCloudTex(), []);

  return (
    <>
      {CLOUD_KNOTS.map((knot, i) => (
        <sprite
          key={i}
          position={[knot.x, knot.y, knot.z]}
          scale={[knot.s, knot.s, 1]}
        >
          <spriteMaterial
            map={cloudTex}
            color={knot.color}
            transparent
            opacity={knot.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      ))}
    </>
  );
}

let _tex = null;
function getDotTex() {
  if (_tex) return _tex;
  const size = 32, c = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0,   'rgba(255,255,255,1.0)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.2)');
  g.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return (_tex = new THREE.CanvasTexture(canvas));
}


export default function GravityField() {
  const { geo, vel, home, homeCol, capturedBy, fadeProg, spiralT } = useMemo(() => buildField(), []);
  const hazeGeo   = useMemo(() => buildHaze(), []);
  const streakGeo = useMemo(() => buildStreaks(), []);
  const tex     = useMemo(() => getDotTex(), []);
  const hazeTex = useMemo(() => createNebulaSplatTexture(), []);

  const { geo: blinkGeo, meta: blinkMeta } = useMemo(() => buildBlinks(), []);
  const blinkTimeRef = useRef(0);

  const wellsRef = useRef([]);
  const [wellSnapshot, setWellSnapshot] = useState([]);

  // Release captured particles to home with color-fade (no burst)
  const collapseWell = (idx) => {
    stopBlackHole();
    const wells = wellsRef.current;
    const w = wells[idx];
    const pos    = geo.attributes.position.array;
    const colArr = geo.attributes.color.array;

    for (let i = 0; i < N; i++) {
      if (capturedBy[i] !== w.id) continue;
      const i3 = i * 3;
      capturedBy[i]  = -1;
      spiralT[i]     = 0;   // clears both mid-spiral and swallowed states
      pos[i3]   = home[i3];
      pos[i3+1] = home[i3+1];
      pos[i3+2] = home[i3+2];
      vel[i3] = 0; vel[i3+1] = 0; vel[i3+2] = 0;
      colArr[i3] = 0; colArr[i3+1] = 0; colArr[i3+2] = 0; // start black
      fadeProg[i] = 0.001; // flag as fading in
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    wells.splice(idx, 1);
    setWellSnapshot([...wells]);
  };

  // First click → plant; second click (anywhere) → explode
  const handleClick = (lp) => {
    const wells = wellsRef.current;
    if (wells.length > 0) {
      collapseWell(0);
      return;
    }
    playBlackHole();
    wells.push({ id: _wellId++, x: lp.x, y: lp.y, z: lp.z, age: 0 });
    setWellSnapshot([...wells]);
  };

  useEffect(() => () => {
    geo.dispose();
    hazeGeo.dispose();
    streakGeo.dispose();
    blinkGeo.dispose();
    if (_tex)       { _tex.dispose();       _tex       = null; }
    if (_cloudTex)  { _cloudTex.dispose();  _cloudTex  = null; }
    // threeUtils' disposeMaterial never walks uniforms.*.value, so the lens
    // shader's blackbody LUT has to be released explicitly.
    disposeBlackbodyLUT();
  }, [geo, hazeGeo, blinkGeo, streakGeo]);

  useFrame((_, delta) => {
    const posAttr = geo.attributes.position;
    const colAttr = geo.attributes.color;
    const pos     = posAttr.array;
    const colArr  = colAttr.array;
    const dt      = Math.min(delta, 0.05);
    const wells   = wellsRef.current;

    const streakPos = streakGeo.attributes.position.array;
    const streakCol = streakGeo.attributes.color.array;
    let   streakN   = 0;

    // Tick well ages
    for (let wi = 0; wi < wells.length; wi++) wells[wi].age += dt;

    // Gravity is "active" only while well.age < GRAVITY_DURATION
    const gravityActive = wells.some(w => w.age < GRAVITY_DURATION);
    let posDirty   = false;
    let colorDirty = false;

    for (let i = 0; i < N; i++) {
      // Color fade-in for released particles
      if (fadeProg[i] > 0) {
        fadeProg[i] = Math.min(1, fadeProg[i] + dt * FADE_SPEED);
        const p = fadeProg[i];
        const i3 = i * 3;
        colArr[i3]   = homeCol[i3]   * p;
        colArr[i3+1] = homeCol[i3+1] * p;
        colArr[i3+2] = homeCol[i3+2] * p;
        if (fadeProg[i] >= 1) fadeProg[i] = 0;
        colorDirty = true;
      }

      // ── Inspiral ───────────────────────────────────────────────────────────
      // Captured matter no longer vanishes on contact. It winds inward on a
      // Keplerian spiral, flattens into the disk plane, and heats toward the
      // disk's colour as it goes — so it visibly joins the plane the lens is
      // lensing, rather than simply disappearing.
      if (spiralT[i] > 0) {
        const w = wells[0];
        if (!w || w.id !== capturedBy[i]) { spiralT[i] = 0; continue; }

        spiralT[i] += dt;
        const i3 = i * 3;

        const rx = pos[i3]   - w.x;
        const ry = pos[i3+1] - w.y;
        const rz = pos[i3+2] - w.z;

        let R   = Math.sqrt(rx * rx + rz * rz);
        let ang = Math.atan2(rz, rx);
        const prevR = R, prevAng = ang;

        // Accelerates as it falls — the 3/R term steepens the approach.
        R -= INSPIRAL_RATE * dt * (1 + 3 / Math.max(R, 0.4));
        // Keplerian shear: inner radii sweep round faster than outer ones,
        // which is what makes the trails wind instead of falling straight in.
        ang += ORBIT_RATE * dt / Math.pow(Math.max(R, 0.35), ORBIT_FALLOFF);

        // Streak. One frame of travel is only ~0.23 units, too short to read as
        // a trail, so the tail is extrapolated back along the spiral using this
        // frame's own deltas. Following the curve rather than drawing a straight
        // chord to the previous position is what makes it look like it is being
        // dragged in rather than jittering.
        if (streakN < STREAK_CAP) {
          const tailR   = Math.min(prevR - (R - prevR) * STREAK_TRAIL, SPIRAL_ENTER_R);
          const tailAng = prevAng - (ang - prevAng) * STREAK_TRAIL;
          const s6 = streakN * 6;
          streakPos[s6]     = w.x + Math.cos(tailAng) * tailR;
          streakPos[s6 + 1] = pos[i3 + 1];
          streakPos[s6 + 2] = w.z + Math.sin(tailAng) * tailR;
          streakPos[s6 + 3] = w.x + Math.cos(ang) * R;
          streakPos[s6 + 4] = pos[i3 + 1];
          streakPos[s6 + 5] = w.z + Math.sin(ang) * R;
          // Tail fades out, head carries the disk's colour.
          const rs0  = Math.min(1, spiralT[i] / HEAT_RAMP);
          const heat = Math.min(1, (SPIRAL_ENTER_R - R) / SPIRAL_ENTER_R)
                     * (rs0 * rs0 * (3 - 2 * rs0));
          streakCol[s6]     = 0.18 * heat; streakCol[s6 + 1] = 0.10 * heat; streakCol[s6 + 2] = 0.05 * heat;
          streakCol[s6 + 3] = 1.10 * heat; streakCol[s6 + 4] = 0.72 * heat; streakCol[s6 + 5] = 0.32 * heat;
          streakN++;
        }

        if (R < HORIZON_R) {
          pos[i3] = 0; pos[i3+1] = -9999; pos[i3+2] = 0;
          spiralT[i] = -1;          // past the horizon; stays hidden until collapse
          posDirty = true;
          continue;
        }

        pos[i3]   = w.x + Math.cos(ang) * R;
        pos[i3+1] = w.y + ry * Math.max(0, 1 - dt * FLATTEN_RATE);
        pos[i3+2] = w.z + Math.sin(ang) * R;
        posDirty = true;

        // Heat toward the disk's amber as it closes in — but ramped on time
        // since capture, not on radius alone. Everything already inside the
        // capture radius is taken on the first frame, and keying this to radius
        // alone made those hundreds of particles snap to amber the instant the
        // well appeared. Every particle now leaves its own nebula colour.
        const rr  = Math.min(1, spiralT[i] / HEAT_RAMP);
        const ramp = rr * rr * (3 - 2 * rr);   // smoothstep, so it eases in
        const hot = Math.min(1, (SPIRAL_ENTER_R - R) / SPIRAL_ENTER_R);
        const h   = hot * hot * ramp;
        colArr[i3]   = homeCol[i3]   * (1 - h) + 1.50 * h;
        colArr[i3+1] = homeCol[i3+1] * (1 - h) + 0.98 * h;
        colArr[i3+2] = homeCol[i3+2] * (1 - h) + 0.42 * h;
        colorDirty = true;
        continue;
      }

      if (capturedBy[i] !== -1) continue;

      const i3 = i * 3;
      let vx = vel[i3], vy = vel[i3+1], vz = vel[i3+2];

      for (let j = 0; j < wells.length; j++) {
        const w = wells[j];
        if (w.age >= GRAVITY_DURATION) continue; // gravity window expired

        const strength = Math.min(1, w.age / WELL_RAMP);
        const dx = w.x - pos[i3];
        const dy = w.y - pos[i3+1];
        const dz = w.z - pos[i3+2];
        const d2 = dx*dx + dy*dy + dz*dz;

        // Hand off to the inspiral well outside the disk, rather than teleporting
        // the particle off-screen the instant it gets close. It now falls in
        // where the viewer can watch it.
        //
        // The capture radius opens with the well's existing spin-up ramp rather
        // than being live at full size from frame one. Without it, everything
        // already inside the radius is taken at once — measured at 926 particles
        // in a single frame, which arrives as a sheet rather than a flow. Scaling
        // the SQUARED radius by strength (i.e. radius by sqrt) spreads the same
        // 926 evenly, peaking at ~20 per frame.
        if (d2 < SPIRAL_ENTER_R * SPIRAL_ENTER_R * strength) {
          capturedBy[i] = w.id;
          spiralT[i]    = 0.0001;
          vel[i3] = 0; vel[i3+1] = 0; vel[i3+2] = 0;
          break;
        }

        if (d2 > 0.001) {
          const d = Math.sqrt(d2);
          // Radial pull
          const force = Math.min(PULL_MAX, (70 * strength) / d) * dt;
          vx += dx/d * force;
          vy += dy/d * force;
          vz += dz/d * force;
          // Tangential force — cross(Z-up, radial) = (-dy/hd, dx/hd, 0)
          const hd2 = dx*dx + dy*dy;
          if (hd2 > 0.001) {
            const hd = Math.sqrt(hd2);
            const tf = Math.min(PULL_MAX * 0.4, (TANGENT_F * strength) / d) * dt;
            vx += (-dy / hd) * tf;
            vy += ( dx / hd) * tf;
          }
        }
      }

      if (capturedBy[i] !== -1) continue;

      if (!gravityActive) {
        vx += (home[i3]   - pos[i3])   * 0.4 * dt;
        vy += (home[i3+1] - pos[i3+1]) * 0.4 * dt;
        vz += (home[i3+2] - pos[i3+2]) * 0.4 * dt;
      }

      const damp = gravityActive ? 0.98 : 0.92;
      vx *= damp; vy *= damp; vz *= damp;

      const s2 = vx*vx + vy*vy + vz*vz;
      if (s2 > 900) {
        const inv = 30 / Math.sqrt(s2);
        vx *= inv; vy *= inv; vz *= inv;
      }

      vel[i3] = vx; vel[i3+1] = vy; vel[i3+2] = vz;

      if (s2 > 0.0001) {
        pos[i3]   += vx * dt;
        pos[i3+1] += vy * dt;
        pos[i3+2] += vz * dt;
        posDirty = true;
      }
    }

    if (posDirty)   posAttr.needsUpdate = true;
    if (colorDirty) colAttr.needsUpdate = true;

    // Streaks are rebuilt from scratch each frame, so the draw range alone
    // decides what renders — unused slots in the pool cost nothing, and the
    // range falls to zero on its own when the well collapses.
    streakGeo.setDrawRange(0, streakN * 2);
    if (streakN > 0) {
      streakGeo.attributes.position.needsUpdate = true;
      streakGeo.attributes.color.needsUpdate    = true;
    }

    // Blink stars — hide when dim to avoid dark-spot alpha artifact
    blinkTimeRef.current += dt;
    const blinkArr = blinkGeo.attributes.color.array;
    const blinkPos = blinkGeo.attributes.position.array;
    let blinkPosDirty = false;
    for (let i = 0; i < blinkMeta.length; i++) {
      const m  = blinkMeta[i];
      const br = Math.max(0, Math.sin((blinkTimeRef.current / m.period) * Math.PI * 2 + m.phase));
      const i3 = i * 3;
      if (br < 0.02) {
        // Move off-screen so the point doesn't write alpha to the canvas
        if (blinkPos[i3+1] !== -9999) { blinkPos[i3] = 0; blinkPos[i3+1] = -9999; blinkPos[i3+2] = 0; blinkPosDirty = true; }
        blinkArr[i3] = 0; blinkArr[i3+1] = 0; blinkArr[i3+2] = 0;
      } else {
        if (blinkPos[i3+1] === -9999) { blinkPos[i3] = m.hx; blinkPos[i3+1] = m.hy; blinkPos[i3+2] = m.hz; blinkPosDirty = true; }
        blinkArr[i3]   = m.peakR * br;
        blinkArr[i3+1] = m.peakG * br;
        blinkArr[i3+2] = m.peakB * br;
      }
    }
    if (blinkPosDirty) blinkGeo.attributes.position.needsUpdate = true;
    blinkGeo.attributes.color.needsUpdate = true;
  });

  return (
    <group position={[WORLD_X, WORLD_Y, WORLD_Z]}>
      {/* Invisible hit plane — owns all click interaction */}
      <mesh
        onPointerEnter={() => { document.body.style.cursor = 'crosshair'; }}
        onPointerLeave={() => { document.body.style.cursor = ''; }}
        onClick={(e) => { e.stopPropagation(); handleClick({ x: e.point.x - WORLD_X, y: e.point.y - WORLD_Y, z: e.point.z - WORLD_Z }); }}
      >
        <planeGeometry args={[80, 40]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Gaseous cloud knots — dense bright patches within the nebula */}
      <NebulaCloudLayer />

      {/* Volumetric haze */}
      <points geometry={hazeGeo}>
        <pointsMaterial
          map={hazeTex}
          size={8}
          vertexColors
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Blink stars — periodic chromatic flashes */}
      <points geometry={blinkGeo}>
        <pointsMaterial
          map={tex}
          size={0.5}
          vertexColors
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Stays mounted for the life of the scene and toggles visibility — see
          BlackHoleLens for why (shader compile stall must not land on click). */}
      <BlackHoleLens wellsRef={wellsRef} worldOffset={[WORLD_X, WORLD_Y, WORLD_Z]} />

      {/* Particle field */}
      <points geometry={geo}>
        <pointsMaterial
          map={tex}
          size={0.2}
          vertexColors
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Infall streaks — one draw call, drawn after the particles so the
          trails read on top of them. */}
      <lineSegments geometry={streakGeo} renderOrder={1} frustumCulled={false}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      <Suspense fallback={null}>
        <PlanetField wells={wellSnapshot} />
      </Suspense>
    </group>
  );
}
