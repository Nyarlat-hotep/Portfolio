import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { playCosmicVoid, stopCosmicVoid } from '../../utils/sounds';

// ============================================================
// GLSL Simplex 3D Noise (Ashima Arts / Ian McEwan)
// ============================================================
const glslNoise = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 xn = x_ * ns.x + ns.yyyy;
    vec4 yn = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(xn) - abs(yn);

    vec4 b0 = vec4(xn.xy, yn.xy);
    vec4 b1 = vec4(xn.zw, yn.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
`;

// ============================================================
// Ring Shaders — animated plasma texture on accretion rings
// ============================================================
const ringVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragmentShader = `
  uniform float uTime;
  uniform float uHover;
  uniform vec3  uColorHot;
  uniform vec3  uColorMid;
  uniform vec3  uColorCool;
  uniform float uFlowSpeed;

  varying vec2 vUv;

  ${glslNoise}

  void main() {
    float angle = vUv.x;
    float side  = vUv.y;

    // Distance from equator (0 = edge, 1 = center)
    float equator = 1.0 - abs(side - 0.5) * 2.0;
    float equatorSharp = pow(equator, 2.0);

    float flowAngle = angle - uTime * uFlowSpeed;

    // Tighter, more turbulent noise for liquid feel
    float n1 = snoise(vec3(flowAngle * 14.0,  side * 8.0,  uTime * 0.3));
    float n2 = snoise(vec3(flowAngle * 32.0,  side * 16.0, uTime * 0.45 + 5.0));
    float n3 = snoise(vec3(flowAngle * 70.0,  side * 30.0, uTime * 0.2  + 10.0));
    float turb = n1 * 0.50 + n2 * 0.33 + n3 * 0.17;
    turb = turb * 0.5 + 0.5;

    // Hotspot — intense consumption point
    float hotspot = smoothstep(0.65, 0.95, turb) * equatorSharp;

    // Angular gradient — rings brighten on one arc, dim on the other
    float angGrad = sin(angle * 3.14159) * 0.5 + 0.5;

    // Base color
    vec3 col = mix(uColorCool, uColorMid, equatorSharp);
    col = mix(col, uColorHot, equatorSharp * turb * 1.0);
    col *= (0.45 + turb * 0.65) * (0.65 + angGrad * 0.35);
    col = mix(col, uColorHot * 1.6, hotspot * 0.75);
    col *= (1.0 + uHover * 0.45);

    // Specular highlight — wet surface
    float spec = pow(hotspot, 3.0) * equatorSharp;
    col += vec3(0.7, 1.0, 0.75) * spec * (0.4 + uHover * 0.3);

    // Rim lighting — edges of the tube catch light (physical volume feel)
    float rim = pow(1.0 - equator, 4.0);
    col += uColorMid * rim * 0.3;

    // Edge fade with tighter falloff for crisper edge
    float edgeFade = smoothstep(0.0, 0.15, side) * smoothstep(1.0, 0.85, side);
    float alpha = edgeFade * (0.45 + turb * 0.22 + hotspot * 0.08);
    alpha = clamp(alpha, 0.0, 0.65);

    gl_FragColor = vec4(col, alpha);
  }
`;

// ============================================================
// Void Tentacle Shaders
// ============================================================

// Simple passthrough — CPU handles all spine/tube animation
const voidTentacleVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const tentacleFragmentShader = `
  uniform float uTime;
  uniform float uIndex;
  uniform float uHover;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  ${glslNoise}

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.5);

    // Surface normal variation — bumpy organic texture
    float bump1 = snoise(vec3(vUv.x * 18.0 + uTime * 0.3, vUv.y * 10.0, uIndex * 4.0));
    float bump2 = snoise(vec3(vUv.x * 40.0 + uTime * 0.5, vUv.y * 22.0, uIndex * 7.0 + 2.0));
    float surface = bump1 * 0.6 + bump2 * 0.4;

    // Longitudinal ridges — tendon/muscle anatomy
    float ridgeFreq = 6.0 + uIndex * 0.5;
    float ridge = smoothstep(0.3, 0.7, sin(vUv.y * ridgeFreq * 3.14159) * 0.5 + 0.5);

    // Vein / internal structure
    float veinNoise = snoise(vec3(
      vUv.x * 12.0 + uTime * 0.4,
      vUv.y * 7.0,
      uIndex * 5.0
    ));
    float veinPattern = smoothstep(0.25, 0.55, veinNoise);

    // Pulse — slower, more visceral
    float pulse = sin(uTime * 0.9 + uIndex * 1.8 + vUv.x * 5.0) * 0.5 + 0.5;

    // Per-arm hue palette: arms 0-1 = green, 2-3 = teal, 4-5 = murky yellow-green
    float isTeal   = step(1.5, uIndex) * (1.0 - step(3.5, uIndex));
    float isYellow = step(3.5, uIndex);

    // Base stays near-black for all arms
    vec3 baseColor = vec3(0.01, 0.04, 0.02);

    // Subsurface bleed — varies per arm
    vec3 subA = vec3(0.02, 0.20, 0.08);   // green
    vec3 subB = vec3(0.10, 0.20, 0.02);   // sickly yellow-green
    vec3 subC = vec3(0.12, 0.18, 0.02);   // yellow-green
    vec3 subColor = mix(mix(subA, subB, isTeal), subC, isYellow) * (1.0 - vUv.x * 0.4);

    // Vein color — varies per arm
    vec3 veinA = vec3(0.05, 0.80, 0.28);  // phosphorescent green
    vec3 veinB = vec3(0.55, 0.85, 0.05);  // bioluminescent yellow-green
    vec3 veinC = vec3(0.55, 0.78, 0.04);  // sickly bioluminescent yellow-green
    vec3 veinBase = mix(mix(veinA, veinB, isTeal), veinC, isYellow);
    vec3 veinColor = veinBase * veinPattern * pulse * (0.12 + uHover * 0.45);

    // Rim — varies per arm
    vec3 rimA = vec3(0.03, 0.38, 0.16);
    vec3 rimB = vec3(0.22, 0.42, 0.03);
    vec3 rimC = vec3(0.25, 0.38, 0.03);
    vec3 rimBase = mix(mix(rimA, rimB, isTeal), rimC, isYellow);
    vec3 rimColor = rimBase + vec3(uHover * 0.05, uHover * 0.22, uHover * 0.12);

    // Ridge tint also varies
    vec3 ridgeTint = mix(mix(vec3(0.01, 0.06, 0.02), vec3(0.06, 0.08, 0.01), isTeal),
                         vec3(0.06, 0.08, 0.01), isYellow);

    // Length gradient — dark at root, brightens mid-arm, fades at tip
    float lengthGrad = sin(vUv.x * 3.14159) * 0.55 + 0.25;

    // Tube highlight — soft shine along one side of the cross-section
    float tubeHighlight = pow(sin(vUv.y * 3.14159), 2.0);

    // Compose
    vec3 color = mix(baseColor, subColor * lengthGrad, fresnel * 0.7);
    color += ridge * ridgeTint * lengthGrad;
    color += surface * 0.03 * mix(vec3(0.1, 0.5, 0.2), vec3(0.3, 0.5, 0.05), isYellow) * lengthGrad;
    color += rimColor * fresnel * (0.65 + uHover * 0.75);
    color += veinColor * lengthGrad;
    // Tube highlight adds a soft gradient across the cross-section
    color += veinBase * tubeHighlight * 0.025 * lengthGrad;

    // Wet specular — tinted to arm hue
    vec3 specTint = mix(mix(vec3(0.4, 1.0, 0.6), vec3(0.8, 1.0, 0.3), isTeal),
                        vec3(0.9, 1.0, 0.2), isYellow);
    float spec = pow(max(0.0, surface * 0.5 + 0.5), 12.0) * fresnel * 0.25;
    color += specTint * spec;

    // Alpha — fade at tip, slight translucency at fresnel edges
    float alpha = (1.0 - smoothstep(0.80, 1.0, vUv.x)) * (1.0 - fresnel * 0.25);

    gl_FragColor = vec4(color, alpha);
  }
`;

// ============================================================
// Event Horizon — Biological Surface Shaders
// ============================================================
const horizonVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  uniform float uTime;

  ${glslNoise}

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    // Subtle organic pulsing displacement
    float pulse = snoise(vec3(position.x * 1.2, position.y * 1.2 + uTime * 0.08, position.z * 1.2)) * 0.12;
    vec3 displaced = position + normal * pulse;
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const horizonFragmentShader = `
  uniform float uTime;
  uniform float uHover;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  ${glslNoise}

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

    // Layered vein noise — branching pattern
    float v1 = snoise(vec3(vUv.x * 12.0, vUv.y * 12.0, uTime * 0.04));
    float v2 = snoise(vec3(vUv.x * 28.0 + 4.0, vUv.y * 28.0, uTime * 0.06 + 2.0));
    float v3 = snoise(vec3(vUv.x * 6.0,  vUv.y * 6.0,  uTime * 0.02 + 5.0));

    // Sharp vein lines from the noise gradient
    float veins = abs(v1) * 0.5 + abs(v2) * 0.3 + abs(v3) * 0.2;
    veins = 1.0 - smoothstep(0.0, 0.25, veins);

    // Slow irregular pulse (compound sine)
    float pulse = sin(uTime * 0.4) * 0.5 + sin(uTime * 0.17 + 1.3) * 0.3 + 0.5;

    // Large-scale spatial color zones — drifting slowly
    float zone  = snoise(vec3(vUv.x * 2.5,        vUv.y * 2.5,        uTime * 0.012))       * 0.5 + 0.5;
    float zone2 = snoise(vec3(vUv.x * 1.8 + 7.0,  vUv.y * 1.8 + 3.0,  uTime * 0.008 + 4.0)) * 0.5 + 0.5;

    // World-space Y gradient — teal toward top, green toward bottom
    float worldY = normalize(vWorldPosition).y * 0.5 + 0.5;

    // Three subsurface hues: deep green / abyssal teal / murky yellow-green
    vec3 subA = vec3(0.01, 0.18, 0.08);
    vec3 subB = vec3(0.10, 0.18, 0.02);
    vec3 subC = vec3(0.07, 0.14, 0.02);
    // Blend noise zones then layer the world Y gradient on top
    vec3 subBase = mix(mix(subA, subB, zone), subC, zone2 * 0.4);
    vec3 subsurface = mix(subBase, subB * 1.3, worldY * 0.5) * pulse * 0.65;

    vec3 veinColor = vec3(0.01, 0.06, 0.03);

    // Rim varies spatially AND by world Y
    vec3 rimA = vec3(0.04, 0.50, 0.20);
    vec3 rimB = vec3(0.25, 0.45, 0.03);
    vec3 rimBase = mix(mix(rimA, rimB, zone), rimB, worldY * 0.4);
    vec3 rimColor = rimBase * vec3(1.0 + uHover * 0.12, 1.0 + uHover * 0.5, 1.0 + uHover * 0.18);

    vec3 color = mix(veinColor, subsurface, veins * 0.7);
    // Rim glow — kept dim
    color += rimColor * fresnel * (0.65 + uHover * 0.7) * (0.8 + veins * 0.35);

    // Surface stays very dark — just let rim and veins breathe
    color = clamp(color, 0.0, 1.0);

    // Alpha: opaque core, slight translucency at very edge
    float alpha = 1.0 - fresnel * 0.15;

    gl_FragColor = vec4(color, alpha);
  }
`;

// ============================================================
// Tentacle geometry constants & pre-allocated working vectors
// ============================================================

const CV_SEGS   = 24;  // spine rings
const CV_SIDES  = 10;  // tube cross-section vertices
const CV_R_BASE = 0.4; // tube radius at root
const CV_R_TIP  = 0.08; // blunt tip radius

// Shared module-level vectors — zero heap allocation in useFrame
const _cvSp      = Array.from({ length: CV_SEGS }, () => new THREE.Vector3());
const _cvTan     = Array.from({ length: CV_SEGS }, () => new THREE.Vector3());
const _cvNor     = Array.from({ length: CV_SEGS }, () => new THREE.Vector3());
const _cvBin     = Array.from({ length: CV_SEGS }, () => new THREE.Vector3());
const _cvInitUp  = new THREE.Vector3();
const _cvRotAxis = new THREE.Vector3();

// ── Geometry builder ──────────────────────────────────────────────────────────

function buildVoidTentGeo() {
  const vCount = CV_SEGS * CV_SIDES;
  const iCount = (CV_SEGS - 1) * CV_SIDES * 6;

  const positions = new Float32Array(vCount * 3);
  const normals   = new Float32Array(vCount * 3);
  const uvs       = new Float32Array(vCount * 2); // static — only depends on s/r
  const indices   = new Uint16Array(iCount);       // vCount=240 < 65535 ✓

  // Static UVs: u=length position (0=root,1=tip), v=circumference (0-1)
  for (let s = 0; s < CV_SEGS; s++) {
    for (let r = 0; r < CV_SIDES; r++) {
      const i = (s * CV_SIDES + r) * 2;
      uvs[i]     = s / (CV_SEGS - 1);
      uvs[i + 1] = r / CV_SIDES;
    }
  }

  // Static index buffer — topology never changes
  let idx = 0;
  for (let s = 0; s < CV_SEGS - 1; s++) {
    for (let r = 0; r < CV_SIDES; r++) {
      const a = s * CV_SIDES + r;
      const b = s * CV_SIDES + (r + 1) % CV_SIDES;
      const c = (s + 1) * CV_SIDES + r;
      const d = (s + 1) * CV_SIDES + (r + 1) % CV_SIDES;
      indices[idx++] = a; indices[idx++] = b; indices[idx++] = c;
      indices[idx++] = b; indices[idx++] = d; indices[idx++] = c;
    }
  }

  const geo     = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  const norAttr = new THREE.BufferAttribute(normals, 3);
  posAttr.usage = THREE.DynamicDrawUsage;
  norAttr.usage = THREE.DynamicDrawUsage;
  geo.setAttribute('position', posAttr);
  geo.setAttribute('normal',   norAttr);
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);
  return geo;
}

// ── Per-frame update ──────────────────────────────────────────────────────────

function updateVoidTent(geo, config, time, hoverValue, length) {
  const posArr = geo.attributes.position.array;
  const norArr = geo.attributes.normal.array;

  // Hover amplifies writhing
  const effectiveAmp = config.amp * (1 + hoverValue * 1.5);

  // ── 1. Spine positions ────────────────────────────────────────────────────
  for (let s = 0; s < CV_SEGS; s++) {
    const tt    = s / (CV_SEGS - 1);
    const taper = tt * tt; // quadratic: tip moves far, root barely moves

    const wx = Math.sin(tt * 2.5 - time * 1.2 + config.phaseX) * taper * effectiveAmp
             + Math.sin(tt * 5.0 - time * 2.1 + config.phaseX + 1.0) * taper * effectiveAmp * 0.28;
    const wz = Math.cos(tt * 2.2 - time * 0.9 + config.phaseZ) * taper * effectiveAmp
             + Math.cos(tt * 4.8 - time * 1.8 + config.phaseZ + 0.7) * taper * effectiveAmp * 0.28;

    _cvSp[s].set(
      config.origin.x + config.dir.x * tt * length + config.right.x * wx + config.fwd.x * wz,
      config.origin.y + config.dir.y * tt * length + config.right.y * wx + config.fwd.y * wz,
      config.origin.z + config.dir.z * tt * length + config.right.z * wx + config.fwd.z * wz,
    );
  }

  // ── 1b. Ring exclusion — push spine points out of ring annulus ────────────
  const RING_INNER = 3.5;
  const RING_OUTER = 10.0;
  const RING_Y_CLEAR = 1.5;
  for (let s = 1; s < CV_SEGS; s++) {
    const xzDist = Math.sqrt(_cvSp[s].x * _cvSp[s].x + _cvSp[s].z * _cvSp[s].z);
    if (xzDist > RING_INNER && xzDist < RING_OUTER && Math.abs(_cvSp[s].y) < RING_Y_CLEAR) {
      _cvSp[s].y = _cvSp[s].y >= 0 ? RING_Y_CLEAR : -RING_Y_CLEAR;
    }
  }

  // ── 2. Tangents (central differences) ────────────────────────────────────
  for (let s = 0; s < CV_SEGS; s++) {
    if (s === 0)              _cvTan[s].subVectors(_cvSp[1], _cvSp[0]);
    else if (s === CV_SEGS - 1) _cvTan[s].subVectors(_cvSp[s], _cvSp[s - 1]);
    else                      _cvTan[s].subVectors(_cvSp[s + 1], _cvSp[s - 1]);
    _cvTan[s].normalize();
  }

  // ── 3. Parallel-transport Frenet frames ───────────────────────────────────
  if (Math.abs(_cvTan[0].y) < 0.9) _cvInitUp.set(0, 1, 0);
  else                               _cvInitUp.set(1, 0, 0);
  const dot0 = _cvInitUp.dot(_cvTan[0]);
  _cvNor[0].copy(_cvInitUp).addScaledVector(_cvTan[0], -dot0).normalize();
  _cvBin[0].crossVectors(_cvTan[0], _cvNor[0]).normalize();

  for (let s = 1; s < CV_SEGS; s++) {
    _cvRotAxis.crossVectors(_cvTan[s - 1], _cvTan[s]);
    const axisLen = _cvRotAxis.length();
    _cvNor[s].copy(_cvNor[s - 1]);
    if (axisLen > 1e-6) {
      _cvRotAxis.divideScalar(axisLen);
      const cosA  = Math.max(-1, Math.min(1, _cvTan[s - 1].dot(_cvTan[s])));
      _cvNor[s].applyAxisAngle(_cvRotAxis, Math.acos(cosA));
    }
    _cvBin[s].crossVectors(_cvTan[s], _cvNor[s]).normalize();
  }

  // ── 4. Vertex rings ───────────────────────────────────────────────────────
  for (let s = 0; s < CV_SEGS; s++) {
    const tt     = s / (CV_SEGS - 1);
    const radius = CV_R_TIP + (CV_R_BASE - CV_R_TIP) * Math.pow(1 - tt, 0.6);

    for (let r = 0; r < CV_SIDES; r++) {
      const angle = (r / CV_SIDES) * Math.PI * 2;
      const cosA  = Math.cos(angle);
      const sinA  = Math.sin(angle);
      const vIdx  = (s * CV_SIDES + r) * 3;

      posArr[vIdx]     = _cvSp[s].x + cosA * _cvNor[s].x * radius + sinA * _cvBin[s].x * radius;
      posArr[vIdx + 1] = _cvSp[s].y + cosA * _cvNor[s].y * radius + sinA * _cvBin[s].y * radius;
      posArr[vIdx + 2] = _cvSp[s].z + cosA * _cvNor[s].z * radius + sinA * _cvBin[s].z * radius;

      norArr[vIdx]     = cosA * _cvNor[s].x + sinA * _cvBin[s].x;
      norArr[vIdx + 1] = cosA * _cvNor[s].y + sinA * _cvBin[s].y;
      norArr[vIdx + 2] = cosA * _cvNor[s].z + sinA * _cvBin[s].z;
    }
  }

  geo.attributes.position.needsUpdate = true;
  geo.attributes.normal.needsUpdate   = true;
}

// ============================================================
// VoidTentacle Component
// ============================================================

// Fixed Y offsets — one per tentacle, avoids Math.random instability
const TENT_Y_OFFSETS = [0.85, -0.85, 1.0, -1.0, 0.75, -0.75];

function VoidTentacle({ index, totalCount, length, hovered }) {
  const hoverRef = useRef(0);

  const geometry = useMemo(() => buildVoidTentGeo(), []);

  // Tentacle direction + perpendicular axes — computed once
  const config = useMemo(() => {
    const angle  = (index / totalCount) * Math.PI * 2;
    const dir    = new THREE.Vector3(
      Math.sin(angle + index * 0.3),
      TENT_Y_OFFSETS[index] ?? 0,
      Math.cos(angle + index * 0.3),
    ).normalize();
    const up    = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    const fwd   = new THREE.Vector3().crossVectors(right, dir).normalize();
    // Emerge from the event horizon surface (radius ~4.2)
    const origin = dir.clone().multiplyScalar(4.2);
    return {
      dir, origin, right, fwd,
      phaseX: index * 1.047,        // PI/3 intervals
      phaseZ: index * 0.785 + 0.5,  // PI/4 intervals, offset
      amp:    2.5 + index * 0.2,    // 2.5–3.5 units writhe
    };
  }, [index, totalCount]);

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 },
      uIndex: { value: index },
      uHover: { value: 0 },
    },
    vertexShader:   voidTentacleVertexShader,
    fragmentShader: tentacleFragmentShader,
    transparent: true,
    side:        THREE.DoubleSide,
    depthWrite:  true,
  }), [index]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((state, delta) => {
    hoverRef.current += ((hovered ? 1 : 0) - hoverRef.current) * Math.min(delta * 3, 1);
    material.uniforms.uTime.value  = state.clock.elapsedTime;
    material.uniforms.uHover.value = hoverRef.current;
    updateVoidTent(geometry, config, state.clock.elapsedTime, hoverRef.current, length);
  });

  return <mesh geometry={geometry} material={material} />;
}

// ============================================================
// Black Hole Core
// ============================================================
function BlackHoleCore({ position, onClick, onHoverChange }) {
  const eventHorizonRef = useRef();
  const diskRef = useRef();
  const innerRingRef = useRef();
  const outerRingRef = useRef();
  const diskMatRef = useRef();
  const innerMatRef = useRef();
  const outerMatRef = useRef();
  const horizonMatRef = useRef();
  const hoverRef = useRef(0);
  const isHovered = useRef(false);

  const clickTargetGeo = useMemo(() => new THREE.SphereGeometry(6, 16, 16), []);
  const horizonGeo     = useMemo(() => new THREE.SphereGeometry(4, 32, 32), []);
  const diskGeo        = useMemo(() => new THREE.TorusGeometry(7, 0.55, 16, 64), []);
  const innerRingGeo   = useMemo(() => new THREE.TorusGeometry(5.2, 0.3, 8, 64), []);
  const outerRingGeo   = useMemo(() => new THREE.TorusGeometry(9, 0.25, 8, 64), []);

  useEffect(() => {
    return () => {
      clickTargetGeo.dispose();
      horizonGeo.dispose();
      diskGeo.dispose();
      innerRingGeo.dispose();
      outerRingGeo.dispose();
    };
  }, [clickTargetGeo, horizonGeo, diskGeo, innerRingGeo, outerRingGeo]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    const target = isHovered.current ? 1 : 0;
    hoverRef.current += (target - hoverRef.current) * Math.min(delta * 3, 1);
    const h = hoverRef.current;

    // horizon is static — biological surface animates via shader time, not rotation
    if (diskRef.current) {
      diskRef.current.rotation.z += 0.008 + h * 0.02;
      const pulse = Math.sin(time * 0.5) * (0.08 + h * 0.06) + 1;
      diskRef.current.scale.setScalar(pulse);
    }
    if (diskMatRef.current) {
      diskMatRef.current.uniforms.uTime.value  = time;
      diskMatRef.current.uniforms.uHover.value = h;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z += 0.003 + h * 0.015;
    }
    if (innerMatRef.current) {
      innerMatRef.current.uniforms.uTime.value  = time;
      innerMatRef.current.uniforms.uHover.value = h;
    }
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z -= 0.002 + h * 0.01;
    }
    if (outerMatRef.current) {
      outerMatRef.current.uniforms.uTime.value  = time;
      outerMatRef.current.uniforms.uHover.value = h;
    }
    if (horizonMatRef.current) {
      horizonMatRef.current.uniforms.uTime.value  = time;
      horizonMatRef.current.uniforms.uHover.value = h;
    }
  });

  const handlePointerOver = () => {
    document.body.style.cursor = 'pointer';
    isHovered.current = true;
    onHoverChange?.(true);
    playCosmicVoid();
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'auto';
    isHovered.current = false;
    onHoverChange?.(false);
    stopCosmicVoid();
  };

  return (
    <group position={position}>
      <mesh
        geometry={clickTargetGeo}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshBasicMaterial visible={false} />
      </mesh>

      <mesh ref={eventHorizonRef} geometry={horizonGeo}>
        <shaderMaterial
          ref={horizonMatRef}
          uniforms={{
            uTime:  { value: 0 },
            uHover: { value: 0 },
          }}
          vertexShader={horizonVertexShader}
          fragmentShader={horizonFragmentShader}
          transparent
          side={THREE.FrontSide}
          depthWrite={true}
        />
      </mesh>

      <mesh ref={diskRef} geometry={diskGeo} rotation={[Math.PI / 2, 0, 0]}>
        <shaderMaterial
          ref={diskMatRef}
          uniforms={{
            uTime:      { value: 0 },
            uHover:     { value: 0 },
            uColorHot:  { value: new THREE.Color('#55ffaa') },
            uColorMid:  { value: new THREE.Color('#0a4422') },
            uColorCool: { value: new THREE.Color('#001408') },
            uFlowSpeed: { value: 0.14 },
          }}
          vertexShader={ringVertexShader}
          fragmentShader={ringFragmentShader}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={innerRingRef} geometry={innerRingGeo} rotation={[Math.PI / 2, 0, 0]}>
        <shaderMaterial
          ref={innerMatRef}
          uniforms={{
            uTime:      { value: 0 },
            uHover:     { value: 0 },
            uColorHot:  { value: new THREE.Color('#aadd22') },
            uColorMid:  { value: new THREE.Color('#2a3a08') },
            uColorCool: { value: new THREE.Color('#060800') },
            uFlowSpeed: { value: 0.22 },
          }}
          vertexShader={ringVertexShader}
          fragmentShader={ringFragmentShader}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={outerRingRef} geometry={outerRingGeo} rotation={[Math.PI / 2, 0, 0]}>
        <shaderMaterial
          ref={outerMatRef}
          uniforms={{
            uTime:      { value: 0 },
            uHover:     { value: 0 },
            uColorHot:  { value: new THREE.Color('#aadd44') },
            uColorMid:  { value: new THREE.Color('#1a2a08') },
            uColorCool: { value: new THREE.Color('#040600') },
            uFlowSpeed: { value: 0.07 },
          }}
          vertexShader={ringVertexShader}
          fragmentShader={ringFragmentShader}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ============================================================
// Void Particles
// ============================================================
function createCircleTexture() {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
  grad.addColorStop(0,   'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function VoidParticles({ count = 150, radius = 25, hovered }) {
  const pointsRef = useRef();
  const hoverRef  = useRef(0);
  const circleTexture = useMemo(() => createCircleTexture(), []);

  useEffect(() => {
    return () => {
      if (pointsRef.current?.geometry) pointsRef.current.geometry.dispose();
      if (pointsRef.current?.material) pointsRef.current.material.dispose();
      circleTexture.dispose();
    };
  }, [circleTexture]);

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(Math.random() * 2 - 1);
      const r     = 5 + Math.random() * radius;

      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.4;
      pos[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.08 + Math.random() * 0.12;
      col[i * 3]     = brightness * 0.2;
      col[i * 3 + 1] = brightness * 2.0;
      col[i * 3 + 2] = brightness * 0.6;
    }

    return { positions: pos, colors: col };
  }, [count, radius]);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      const target = hovered ? 1 : 0;
      hoverRef.current += (target - hoverRef.current) * Math.min(delta * 3, 1);
      const h = hoverRef.current;

      pointsRef.current.rotation.y += delta * (0.015 + h * 0.045);
      pointsRef.current.rotation.z += delta * (0.004 + h * 0.012);
      pointsRef.current.material.opacity = 0.18 + h * 0.18;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color"    count={count} array={colors}    itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        map={circleTexture}
        vertexColors
        transparent
        opacity={0.4}
        alphaTest={0.05}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ============================================================
// Main Export
// ============================================================
export default function CosmicVoid({ position = [0, 0, -80], onClick }) {
  const [hovered, setHovered] = useState(false);

  const tentacleProps = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    index:      i,
    totalCount: 6,
    length:     9 + i * 0.6, // 9.0 → 12.0 units
  })), []);

  return (
    <group position={position}>
      <BlackHoleCore position={[0, 0, 0]} onClick={onClick} onHoverChange={setHovered} />

      {tentacleProps.map(p => (
        <VoidTentacle key={p.index} hovered={hovered} {...p} />
      ))}

      <VoidParticles hovered={hovered} />

      <pointLight position={[0, 0, 5]}  color="#0a4a2a" intensity={1}   distance={30} decay={2} />
      <pointLight position={[0, 0, -5]} color="#00ff6a" intensity={0.15} distance={20} decay={2} />
    </group>
  );
}
