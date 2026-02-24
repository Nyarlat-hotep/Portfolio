import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCircularParticleTexture, createNebulaSplatTexture } from '../../utils/threeUtils';

// Positioned east of the planet cluster — discovered by orbiting right
const GALAXY_RADIUS  = 9;
const BULGE_COUNT    = 315;
const ARM_COUNT      = 648; // per arm, 2 arms total
const HALO_COUNT     = 162;

function buildGalaxyGeometry() {
  const total     = BULGE_COUNT + ARM_COUNT * 2 + HALO_COUNT;
  const positions = new Float32Array(total * 3);
  const colors    = new Float32Array(total * 3);

  const bulgeColor = new THREE.Color('#ffcc77');
  const armPink    = new THREE.Color('#ffb8c8');
  const armBlue    = new THREE.Color('#c0d8ff');
  const armViolet  = new THREE.Color('#8866dd');
  const hotStar    = new THREE.Color('#a8d8ff');
  const coolStar   = new THREE.Color('#ffaa44');
  const haloColor  = new THREE.Color('#9988cc');

  let idx = 0;

  for (let i = 0; i < BULGE_COUNT; i++) {
    const r     = Math.pow(Math.random(), 1.8) * GALAXY_RADIUS * 0.22;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(Math.random() * 2 - 1);
    positions[idx * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[idx * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.35;
    positions[idx * 3 + 2] = r * Math.cos(phi);
    const brightness = 0.28 + Math.random() * 0.22;
    colors[idx * 3]     = bulgeColor.r * brightness;
    colors[idx * 3 + 1] = bulgeColor.g * brightness;
    colors[idx * 3 + 2] = bulgeColor.b * brightness;
    idx++;
  }

  for (let arm = 0; arm < 2; arm++) {
    const armOffset = arm * Math.PI;
    for (let i = 0; i < ARM_COUNT; i++) {
      const t       = i / ARM_COUNT;
      const angle   = t * Math.PI * 2.8 + armOffset;
      const r       = 0.5 + t * GALAXY_RADIUS;
      const scatter = (0.15 + t * 0.45) * GALAXY_RADIUS;
      positions[idx * 3]     = r * Math.cos(angle) + (Math.random() - 0.5) * scatter;
      positions[idx * 3 + 1] = (Math.random() - 0.5) * 0.6 * (1 - t * 0.6);
      positions[idx * 3 + 2] = r * Math.sin(angle) + (Math.random() - 0.5) * scatter;
      let col;
      const specialRoll = Math.random();
      if (specialRoll < 0.04) {
        col = hotStar.clone();
      } else if (specialRoll < 0.07) {
        col = coolStar.clone();
      } else if (t < 0.35) {
        col = new THREE.Color().lerpColors(armPink, armBlue, t / 0.35);
      } else if (t < 0.7) {
        col = new THREE.Color().lerpColors(armBlue, armViolet, (t - 0.35) / 0.35);
      } else {
        col = armViolet.clone();
      }
      const brightness = 0.45 + Math.random() * 0.55;
      colors[idx * 3]     = col.r * brightness;
      colors[idx * 3 + 1] = col.g * brightness;
      colors[idx * 3 + 2] = col.b * brightness;
      idx++;
    }
  }

  for (let i = 0; i < HALO_COUNT; i++) {
    const r     = GALAXY_RADIUS * (0.7 + Math.random() * 0.5);
    const theta = Math.random() * Math.PI * 2;
    positions[idx * 3]     = r * Math.cos(theta) + (Math.random() - 0.5) * 3;
    positions[idx * 3 + 1] = (Math.random() - 0.5) * 1.5;
    positions[idx * 3 + 2] = r * Math.sin(theta) + (Math.random() - 0.5) * 3;
    const brightness = 0.25 + Math.random() * 0.3;
    colors[idx * 3]     = haloColor.r * brightness;
    colors[idx * 3 + 1] = haloColor.g * brightness;
    colors[idx * 3 + 2] = haloColor.b * brightness;
    idx++;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  return geo;
}

// ── Nebula haze ───────────────────────────────────────────────────────────────

function buildNebulaGeometry() {
  const count     = 315;
  const positions = new Float32Array(count * 3);
  const colors    = new Float32Array(count * 3);

  const coreCol  = new THREE.Color('#cc9944');
  const midCol   = new THREE.Color('#cc88aa');
  const outerCol = new THREE.Color('#7755bb');
  const spreadXZ = GALAXY_RADIUS * 1.1;
  const spreadY  = 1.6;

  for (let i = 0; i < count; i++) {
    const rx = ((Math.random() + Math.random()) / 2 - 0.5) * 2;
    const rz = ((Math.random() + Math.random()) / 2 - 0.5) * 2;
    const ry = (Math.random() - 0.5) * 2;
    positions[i * 3]     = rx * spreadXZ;
    positions[i * 3 + 1] = ry * spreadY;
    positions[i * 3 + 2] = rz * spreadXZ;
    const normR = Math.min(1, Math.sqrt(rx * rx + rz * rz));
    let col;
    if (normR < 0.25) {
      col = coreCol.clone().lerp(midCol, normR / 0.25);
    } else {
      col = midCol.clone().lerp(outerCol, (normR - 0.25) / 0.75);
    }
    col.multiplyScalar(0.5 + Math.random() * 0.5);
    colors[i * 3]     = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  return geo;
}

// ── Galactic events (supernovas + star births) ────────────────────────────────

const EVENT_COUNT = 6;
const SUPERNOVA_COLOR = new THREE.Color('#ddeeff');
const BIRTH_COLOR     = new THREE.Color('#ffdd88');
const MIN_GLOW = 0.09;

const EVENT_DEFS = {
  supernova: { color: SUPERNOVA_COLOR, riseTime: 0.5,  peakTime: 0.5,  fallTime: 5.0 },
  birth:     { color: BIRTH_COLOR,     riseTime: 2.0,  peakTime: 0.8,  fallTime: 4.0 },
};

function randomEventPosition() {
  const angle = Math.random() * Math.PI * 2;
  const r     = GALAXY_RADIUS * (0.2 + Math.random() * 0.85);
  return [r * Math.cos(angle), (Math.random() - 0.5) * 0.9, r * Math.sin(angle)];
}

function buildEventGeometry() {
  const positions = new Float32Array(EVENT_COUNT * 3);
  const colors    = new Float32Array(EVENT_COUNT * 3);
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  const colAttr = new THREE.BufferAttribute(colors, 3);
  posAttr.usage = THREE.DynamicDrawUsage;
  colAttr.usage = THREE.DynamicDrawUsage;
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color',    colAttr);
  return geo;
}

function initEventStates() {
  const types = Object.keys(EVENT_DEFS);
  return Array.from({ length: EVENT_COUNT }, (_, i) => ({
    type:        types[i % types.length],
    phase:       'dormant',
    timer:       0,
    dormantWait: 2 + i * 1.8 + Math.random() * 2,
    position:    randomEventPosition(),
  }));
}

// ── Battle system ─────────────────────────────────────────────────────────────
// All battle action is confined to one quadrant of the disc (local +X/+Z quadrant)

const GALAXY_WORLD_POS  = new THREE.Vector3(60, -6, 18);
const BATTLE_RADIUS     = 35;          // camera distance to activate
const BATTLE_ANGLE_MIN  = Math.PI * 0.05;
const BATTLE_ANGLE_MAX  = Math.PI * 0.55;
const BATTLE_R_MIN      = 2.5;
const BATTLE_R_MAX      = GALAXY_RADIUS * 0.82;

const LASER_COUNT       = 6;
const LASER_BOLT_LEN    = 0.9;

// Explosion pools — impact slots triggered by lasers, ambient are background
const IMPACT_EXPL_COUNT  = 2;
const AMBIENT_EXPL_COUNT = 2;
const TOTAL_EXPL_COUNT   = IMPACT_EXPL_COUNT + AMBIENT_EXPL_COUNT;
const FB_PER_EXPL        = 5;  // large soft fireball blobs per explosion
const SP_PER_EXPL        = 8;  // fast spark streaks per explosion

// Reusable temp objects — no heap allocation per frame
const _lHead  = new THREE.Vector3();
const _lTail  = new THREE.Vector3();
const _tealC  = new THREE.Color('#44ffee');
const _orangeC = new THREE.Color('#ff5522');

// Explosion color ramp temps (no allocation in loop)
const _C_FB   = new THREE.Color();  // fireball working color
const _C_SP   = new THREE.Color();  // spark working color
// Color stops: white → yellow → orange → dark red (fireball); white → pale yellow (sparks)
const _CW = new THREE.Color(1.00, 1.00, 1.00); // white flash
const _CY = new THREE.Color(1.00, 0.85, 0.15); // yellow
const _CO = new THREE.Color(1.00, 0.40, 0.05); // orange — color stops here, no dark phase
const _CS = new THREE.Color(1.00, 0.92, 0.55); // spark yellow-white

// Procedural soft gaussian blob texture — makes particles look like puffs of fire
let _blobTex = null;
function getExplosionBlobTexture() {
  if (_blobTex) return _blobTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  // Very soft gaussian: white center → full transparent edge, no hard cutoff
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0.00, 'rgba(255,255,255,1.0)');
  g.addColorStop(0.20, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.35)');
  g.addColorStop(0.70, 'rgba(255,255,255,0.08)');
  g.addColorStop(1.00, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _blobTex = new THREE.CanvasTexture(canvas);
  return _blobTex;
}

function randomBattlePos() {
  const angle = BATTLE_ANGLE_MIN + Math.random() * (BATTLE_ANGLE_MAX - BATTLE_ANGLE_MIN);
  const r     = BATTLE_R_MIN + Math.random() * (BATTLE_R_MAX - BATTLE_R_MIN);
  return new THREE.Vector3(
    r * Math.cos(angle),
    (Math.random() - 0.5) * 0.4,
    r * Math.sin(angle),
  );
}

function randomBattleLaserConfig() {
  const aFrom = BATTLE_ANGLE_MIN + Math.random() * (BATTLE_ANGLE_MAX - BATTLE_ANGLE_MIN);
  const rFrom = BATTLE_R_MIN + Math.random() * (BATTLE_R_MAX - BATTLE_R_MIN);
  const aTo   = BATTLE_ANGLE_MIN + Math.random() * (BATTLE_ANGLE_MAX - BATTLE_ANGLE_MIN);
  const rTo   = BATTLE_R_MIN + Math.random() * (BATTLE_R_MAX - BATTLE_R_MIN);
  const oy = (Math.random() - 0.5) * 0.35;
  const ty = (Math.random() - 0.5) * 0.35;
  const ox = rFrom * Math.cos(aFrom), oz = rFrom * Math.sin(aFrom);
  const tx = rTo   * Math.cos(aTo),   tz = rTo   * Math.sin(aTo);
  const dx = tx - ox, dy = ty - oy, dz = tz - oz;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  return {
    origin:  new THREE.Vector3(ox, oy, oz),
    dest:    new THREE.Vector3(tx, ty, tz), // exact impact point — triggers explosion
    dir:     new THREE.Vector3(dx / len, dy / len, dz / len),
    speed:   2.5 + Math.random() * 2.5,
    maxDist: len,
    type:    Math.random() < 0.5 ? 'teal' : 'orange',
  };
}

function buildLaserGeometry() {
  const positions = new Float32Array(LASER_COUNT * 2 * 3);
  const colors    = new Float32Array(LASER_COUNT * 2 * 3);
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  const colAttr = new THREE.BufferAttribute(colors, 3);
  posAttr.usage = THREE.DynamicDrawUsage;
  colAttr.usage = THREE.DynamicDrawUsage;
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color',    colAttr);
  return geo;
}

function initLasers() {
  return Array.from({ length: LASER_COUNT }, (_, i) => ({
    ...randomBattleLaserConfig(),
    headDist: 0,
    active:   false,
    cooldown: i * 0.3 + Math.random() * 0.8,
  }));
}

function buildFireballGeometry() {
  const n   = TOTAL_EXPL_COUNT * FB_PER_EXPL;
  const geo = new THREE.BufferGeometry();
  const pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
  const col = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
  pos.usage = col.usage = THREE.DynamicDrawUsage;
  geo.setAttribute('position', pos);
  geo.setAttribute('color',    col);
  return geo;
}

function buildSparkGeometry() {
  const n   = TOTAL_EXPL_COUNT * SP_PER_EXPL;
  const geo = new THREE.BufferGeometry();
  const pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
  const col = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
  pos.usage = col.usage = THREE.DynamicDrawUsage;
  geo.setAttribute('position', pos);
  geo.setAttribute('color',    col);
  return geo;
}

function initExplosions() {
  return Array.from({ length: TOTAL_EXPL_COUNT }, (_, i) => ({
    active:       false,
    timer:        0,
    duration:     0,
    scale:        1.0,
    cooldown:     i >= IMPACT_EXPL_COUNT ? i * 1.2 + Math.random() * 2 : 0,
    origin:       new THREE.Vector3(),
    fbVelocities: Array.from({ length: FB_PER_EXPL },  () => new THREE.Vector3()),
    spVelocities: Array.from({ length: SP_PER_EXPL }, () => new THREE.Vector3()),
  }));
}

function triggerExplosionSlot(expl, origin, scale) {
  expl.active   = true;
  expl.timer    = 0;
  expl.duration = 0.8 + Math.random() * 0.5;
  expl.scale    = scale;
  expl.origin.copy(origin);
  for (let p = 0; p < FB_PER_EXPL; p++) {
    expl.fbVelocities[p]
      .set(Math.random() - 0.5, (Math.random() - 0.5) * 0.4, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(0.5 + Math.random() * 1.0);
  }
  for (let p = 0; p < SP_PER_EXPL; p++) {
    expl.spVelocities[p]
      .set(Math.random() - 0.5, (Math.random() - 0.5) * 0.55, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(1.2 + Math.random() * 1.8);
  }
}

function findFreeImpactSlot(explosionStates) {
  for (let i = 0; i < IMPACT_EXPL_COUNT; i++) {
    if (!explosionStates[i].active) return i;
  }
  return -1;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DistantGalaxy() {
  const groupRef  = useRef();
  const nebulaRef = useRef();
  const texture     = useMemo(() => createCircularParticleTexture(), []);
  const nebulaTex   = createNebulaSplatTexture();
  const blobTex     = useMemo(() => getExplosionBlobTexture(), []);
  const geometry    = useMemo(() => buildGalaxyGeometry(), []);
  const nebulaGeo   = useMemo(() => buildNebulaGeometry(), []);
  const eventsGeo   = useMemo(() => buildEventGeometry(), []);
  const events      = useRef(initEventStates());

  const battleIntensityRef = useRef(0);
  const laserGeo    = useMemo(() => buildLaserGeometry(), []);
  const lasers      = useRef(initLasers());
  const fireballGeo = useMemo(() => buildFireballGeometry(), []);
  const sparkGeo    = useMemo(() => buildSparkGeometry(), []);
  const explosions  = useRef(initExplosions());

  useEffect(() => {
    return () => {
      geometry.dispose();
      nebulaGeo.dispose();
      eventsGeo.dispose();
      laserGeo.dispose();
      fireballGeo.dispose();
      sparkGeo.dispose();
      texture.dispose();
      // nebulaTex, blobTex are module-level caches — not disposed here
    };
  }, [geometry, nebulaGeo, eventsGeo, laserGeo, fireballGeo, sparkGeo, texture]);

  useFrame((state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.008;
    if (nebulaRef.current) nebulaRef.current.rotation.y -= delta * 0.003;

    // ── Galactic events ──
    const evCol = eventsGeo.attributes.color;
    const evPos = eventsGeo.attributes.position;
    events.current.forEach((ev, i) => {
      const def = EVENT_DEFS[ev.type];
      ev.timer += delta;
      const setCol = (brightness) => {
        const b = MIN_GLOW + brightness * (1 - MIN_GLOW);
        evCol.setXYZ(i, def.color.r * b, def.color.g * b, def.color.b * b);
      };
      if (ev.phase === 'dormant') {
        setCol(0);
        if (ev.timer >= ev.dormantWait) {
          ev.phase = 'rising'; ev.timer = 0;
          ev.position = randomEventPosition();
          evPos.setXYZ(i, ev.position[0], ev.position[1], ev.position[2]);
        }
      } else if (ev.phase === 'rising') {
        setCol(Math.min(1, ev.timer / def.riseTime));
        if (ev.timer >= def.riseTime) { ev.phase = 'peak'; ev.timer = 0; }
      } else if (ev.phase === 'peak') {
        setCol(1);
        if (ev.timer >= def.peakTime) { ev.phase = 'falling'; ev.timer = 0; }
      } else if (ev.phase === 'falling') {
        setCol(Math.max(0, 1 - ev.timer / def.fallTime));
        if (ev.timer >= def.fallTime) {
          ev.phase = 'dormant'; ev.timer = 0;
          ev.dormantWait = 3 + Math.random() * 4;
          ev.type = Math.random() < 0.4 ? 'supernova' : 'birth';
        }
      }
    });
    evCol.needsUpdate = true;
    evPos.needsUpdate = true;

    // ── Battle proximity ──
    const dist     = state.camera.position.distanceTo(GALAXY_WORLD_POS);
    const targetBI = dist < BATTLE_RADIUS ? 1 - dist / BATTLE_RADIUS : 0;
    battleIntensityRef.current += (targetBI - battleIntensityRef.current) * Math.min(delta * 1.5, 1);
    const bi = battleIntensityRef.current;

    // ── Laser animation ──
    const lPos = laserGeo.attributes.position;
    const lCol = laserGeo.attributes.color;

    lasers.current.forEach((laser, i) => {
      if (!laser.active) {
        laser.cooldown -= delta;
        if (laser.cooldown <= 0 && bi > 0.05) {
          Object.assign(laser, randomBattleLaserConfig());
          laser.headDist = 0;
          laser.active   = true;
        } else {
          lPos.setXYZ(i * 2, 0, 0, 0); lPos.setXYZ(i * 2 + 1, 0, 0, 0);
          lCol.setXYZ(i * 2, 0, 0, 0); lCol.setXYZ(i * 2 + 1, 0, 0, 0);
        }
        return;
      }

      laser.headDist += laser.speed * delta;
      const tailDist = Math.max(0, laser.headDist - LASER_BOLT_LEN);

      _lTail.copy(laser.origin).addScaledVector(laser.dir, tailDist);
      _lHead.copy(laser.origin).addScaledVector(laser.dir, laser.headDist);

      lPos.setXYZ(i * 2,     _lTail.x, _lTail.y, _lTail.z);
      lPos.setXYZ(i * 2 + 1, _lHead.x, _lHead.y, _lHead.z);

      const col  = laser.type === 'teal' ? _tealC : _orangeC;
      // Head → full color, tail → black: Three.js interpolates → gradient fade to black
      const fade = Math.min(1, Math.max(0, (laser.maxDist - laser.headDist) / LASER_BOLT_LEN));
      lCol.setXYZ(i * 2,     0, 0, 0);                                             // tail: black
      lCol.setXYZ(i * 2 + 1, col.r * fade, col.g * fade, col.b * fade);           // head: full color

      if (laser.headDist >= laser.maxDist) {
        laser.active   = false;
        laser.cooldown = 0.4 + Math.random() * 1.2; // short fixed window — keeps battle looping
        // Trigger impact explosion at the laser's destination point
        const slot = findFreeImpactSlot(explosions.current);
        if (slot >= 0) triggerExplosionSlot(explosions.current[slot], laser.dest, 1.0);
      }
    });

    lPos.needsUpdate = true;
    lCol.needsUpdate = true;

    // ── Explosion animation ──
    const fbPos = fireballGeo.attributes.position;
    const fbCol = fireballGeo.attributes.color;
    const spPos = sparkGeo.attributes.position;
    const spCol = sparkGeo.attributes.color;

    explosions.current.forEach((expl, ei) => {
      const fbBase = ei * FB_PER_EXPL;
      const spBase = ei * SP_PER_EXPL;
      const isAmbient = ei >= IMPACT_EXPL_COUNT;

      if (!expl.active) {
        // Ambient slots auto-trigger; impact slots wait for laser to arrive
        if (isAmbient) {
          expl.cooldown -= delta;
          if (expl.cooldown <= 0 && bi > 0.08) {
            const ambientScale = 0.18 + Math.random() * 0.14; // smaller + dimmer = looks distant
            triggerExplosionSlot(expl, randomBattlePos(), ambientScale);
          }
        }
        // Collapse positions to a single point — prevents scattered "ghost" particles
        for (let p = 0; p < FB_PER_EXPL; p++) { fbCol.setXYZ(fbBase + p, 0, 0, 0); fbPos.setXYZ(fbBase + p, 0, 0, 0); }
        for (let p = 0; p < SP_PER_EXPL; p++) { spCol.setXYZ(spBase + p, 0, 0, 0); spPos.setXYZ(spBase + p, 0, 0, 0); }
        return;
      }

      expl.timer += delta;
      const t  = expl.timer / expl.duration; // 0 → 1
      const sc = expl.scale;

      if (t >= 1) {
        expl.active = false;
        if (isAmbient) expl.cooldown = 3.0 + Math.random() * 4.0;
        // Collapse positions so no ghost particles remain at spread-out locations
        for (let p = 0; p < FB_PER_EXPL; p++) { fbCol.setXYZ(fbBase + p, 0, 0, 0); fbPos.setXYZ(fbBase + p, 0, 0, 0); }
        for (let p = 0; p < SP_PER_EXPL; p++) { spCol.setXYZ(spBase + p, 0, 0, 0); spPos.setXYZ(spBase + p, 0, 0, 0); }
        return;
      }

      // ── Fireball: brief white flash → vivid orange, fade via uniform RGB scale ──
      // Exponential deceleration: (1 - e^(-k*t)) / k gives fast start, slow stop
      const fbK    = 2.5;
      const fbDisp = (1 - Math.exp(-fbK * expl.timer)) / fbK;
      // Fade: all channels scale down together — same hue, just less bright → reads as transparent, not black
      const fbFade = Math.pow(Math.max(0, 1 - t), 0.65);

      // Quick flash to orange, then hold hue — fade is handled entirely by fbFade above
      if (t < 0.18) {
        _C_FB.lerpColors(_CW, _CO, t / 0.18); // white → orange flash
      } else {
        _C_FB.copy(_CO);                       // hold at vivid orange
      }

      for (let p = 0; p < FB_PER_EXPL; p++) {
        const v = expl.fbVelocities[p];
        fbPos.setXYZ(
          fbBase + p,
          expl.origin.x + v.x * fbDisp * sc,
          expl.origin.y + v.y * fbDisp * sc,
          expl.origin.z + v.z * fbDisp * sc,
        );
        fbCol.setXYZ(fbBase + p,
          _C_FB.r * fbFade * sc,
          _C_FB.g * fbFade * sc,
          _C_FB.b * fbFade * sc,
        );
      }

      // ── Sparks: white → pale yellow, uniform fade to transparent ──
      const spK    = 1.2;
      const spDisp = (1 - Math.exp(-spK * expl.timer)) / spK;
      // Sparks fade a bit faster than fireball — same uniform-scale approach
      const spFade = Math.pow(Math.max(0, 1 - t), 0.85);

      // Hold at vivid spark yellow after brief flash — hue stays constant, fbFade handles opacity
      if (t < 0.12) {
        _C_SP.lerpColors(_CW, _CS, t / 0.12);
      } else {
        _C_SP.copy(_CS);
      }

      for (let p = 0; p < SP_PER_EXPL; p++) {
        const v = expl.spVelocities[p];
        spPos.setXYZ(
          spBase + p,
          expl.origin.x + v.x * spDisp * sc,
          expl.origin.y + v.y * spDisp * sc,
          expl.origin.z + v.z * spDisp * sc,
        );
        spCol.setXYZ(spBase + p,
          _C_SP.r * spFade * sc,
          _C_SP.g * spFade * sc,
          _C_SP.b * spFade * sc,
        );
      }
    });

    fbPos.needsUpdate = true;
    fbCol.needsUpdate = true;
    spPos.needsUpdate = true;
    spCol.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={[60, -6, 18]} rotation={[0.5, 0.3, 0.1]}>

      {/* Nebula haze */}
      <points ref={nebulaRef} geometry={nebulaGeo}>
        <pointsMaterial
          map={nebulaTex} size={8} vertexColors transparent opacity={0.05}
          depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation
        />
      </points>

      {/* Star particles */}
      <points geometry={geometry}>
        <pointsMaterial
          map={texture} size={0.28} vertexColors transparent opacity={0.32}
          depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation
        />
      </points>

      {/* Galactic events — supernovas + star births */}
      <points geometry={eventsGeo}>
        <pointsMaterial
          map={texture} size={0.36} vertexColors transparent opacity={1}
          depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation
        />
      </points>

      {/* Laser bolts — black tail → colored head gradient */}
      <lineSegments geometry={laserGeo}>
        <lineBasicMaterial
          vertexColors blending={THREE.AdditiveBlending} depthWrite={false} transparent
        />
      </lineSegments>

      {/* Explosion fireballs — soft gaussian blobs, white→yellow→orange→ember */}
      <points geometry={fireballGeo}>
        <pointsMaterial
          map={blobTex} size={0.38} vertexColors transparent opacity={1}
          depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation
        />
      </points>

      {/* Explosion sparks — tighter particles, faster, shorter lifetime */}
      <points geometry={sparkGeo}>
        <pointsMaterial
          map={texture} size={0.12} vertexColors transparent opacity={1}
          depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation
        />
      </points>

    </group>
  );
}
