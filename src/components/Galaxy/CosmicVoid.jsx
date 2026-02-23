import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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

    float equator = 1.0 - abs(side - 0.5) * 2.0;
    float flowAngle = angle - uTime * uFlowSpeed;

    float n1 = snoise(vec3(flowAngle * 10.0,  side * 6.0,  uTime * 0.25));
    float n2 = snoise(vec3(flowAngle * 24.0,  side * 11.0, uTime * 0.35 + 5.0));
    float n3 = snoise(vec3(flowAngle * 50.0,  side * 20.0, uTime * 0.15 + 10.0));
    float turb = n1 * 0.55 + n2 * 0.30 + n3 * 0.15;
    turb = turb * 0.5 + 0.5;

    float hotspot = smoothstep(0.62, 0.90, turb) * equator;

    vec3 col = mix(uColorCool, uColorMid, equator);
    col = mix(col, uColorHot, equator * equator * turb);
    col *= (0.5 + turb * 0.6);
    col = mix(col, uColorHot * 1.9, hotspot * 0.75);
    col *= (1.0 + uHover * 0.55);

    float edgeFade = smoothstep(0.0, 0.12, side) * smoothstep(1.0, 0.88, side);
    float alpha = edgeFade * (0.55 + turb * 0.3 + hotspot * 0.12);
    alpha = clamp(alpha, 0.0, 0.95);

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

// Bioluminescent effect — unchanged visual language from original
const tentacleFragmentShader = `
  uniform float uTime;
  uniform float uIndex;
  uniform float uHover;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  ${glslNoise}

  void main() {
    vec3 baseColor = vec3(0.06, 0.02, 0.12);

    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
    vec3 rimColor = vec3(0.25 + uHover * 0.35, 0.05, 0.45 + uHover * 0.35);

    float veinNoise = snoise(vec3(
      vUv.x * 15.0 + uTime * 0.5,
      vUv.y * 8.0,
      uIndex * 5.0
    ));
    float veinPattern = smoothstep(0.3, 0.6, veinNoise);

    float pulse = sin(uTime * 1.5 + uIndex * 2.0 + vUv.x * 8.0) * 0.5 + 0.5;
    vec3 veinColor = vec3(0.0, 0.8, 0.35) * veinPattern * pulse * (0.2 + uHover * 0.6);

    float lengthGrad = 1.0 - vUv.x * 0.3;
    baseColor *= lengthGrad;

    vec3 color = baseColor + rimColor * fresnel * (0.6 + uHover * 0.8) + veinColor;

    float alpha = 1.0 - smoothstep(0.85, 1.0, vUv.x);

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
const TENT_Y_OFFSETS = [0.15, -0.20, 0.30, -0.10, 0.20, -0.25];

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
  const rimGlowMaterial = useRef();
  const hoverRef = useRef(0);
  const isHovered = useRef(false);

  const clickTargetGeo = useMemo(() => new THREE.SphereGeometry(6, 16, 16), []);
  const horizonGeo     = useMemo(() => new THREE.SphereGeometry(4, 32, 32), []);
  const rimGeo         = useMemo(() => new THREE.SphereGeometry(4.3, 32, 32), []);
  const diskGeo        = useMemo(() => new THREE.TorusGeometry(7, 0.35, 16, 64), []);
  const innerRingGeo   = useMemo(() => new THREE.TorusGeometry(5.2, 0.3, 8, 64), []);
  const outerRingGeo   = useMemo(() => new THREE.TorusGeometry(9, 0.25, 8, 64), []);

  useEffect(() => {
    return () => {
      clickTargetGeo.dispose();
      horizonGeo.dispose();
      rimGeo.dispose();
      diskGeo.dispose();
      innerRingGeo.dispose();
      outerRingGeo.dispose();
    };
  }, [clickTargetGeo, horizonGeo, rimGeo, diskGeo, innerRingGeo, outerRingGeo]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    const target = isHovered.current ? 1 : 0;
    hoverRef.current += (target - hoverRef.current) * Math.min(delta * 3, 1);
    const h = hoverRef.current;

    if (eventHorizonRef.current) {
      eventHorizonRef.current.rotation.y += 0.002 + h * 0.006;
    }
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
    if (rimGlowMaterial.current) {
      rimGlowMaterial.current.uniforms.uHover.value = h;
    }
  });

  const handlePointerOver = () => {
    document.body.style.cursor = 'pointer';
    isHovered.current = true;
    onHoverChange?.(true);
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'auto';
    isHovered.current = false;
    onHoverChange?.(false);
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
        <meshBasicMaterial color="#000000" />
      </mesh>

      <mesh geometry={rimGeo}>
        <shaderMaterial
          ref={rimGlowMaterial}
          uniforms={{ uHover: { value: 0 } }}
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              vViewPosition = -mvPosition.xyz;
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            uniform float uHover;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            void main() {
              vec3 viewDir = normalize(vViewPosition);
              float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 4.0);
              vec3 color = vec3(0.3 + uHover * 0.4, 0.08, 0.55 + uHover * 0.3) * fresnel;
              gl_FragColor = vec4(color, fresnel * (0.5 + uHover * 0.5));
            }
          `}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={diskRef} geometry={diskGeo} rotation={[Math.PI / 2, 0, 0]}>
        <shaderMaterial
          ref={diskMatRef}
          uniforms={{
            uTime:      { value: 0 },
            uHover:     { value: 0 },
            uColorHot:  { value: new THREE.Color('#ffeebb') },
            uColorMid:  { value: new THREE.Color('#cc3388') },
            uColorCool: { value: new THREE.Color('#5a1a8b') },
            uFlowSpeed: { value: 0.12 },
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
            uColorHot:  { value: new THREE.Color('#ccddff') },
            uColorMid:  { value: new THREE.Color('#8855ee') },
            uColorCool: { value: new THREE.Color('#2a0a5e') },
            uFlowSpeed: { value: 0.20 },
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
            uColorHot:  { value: new THREE.Color('#44aa77') },
            uColorMid:  { value: new THREE.Color('#1a6640') },
            uColorCool: { value: new THREE.Color('#001a0d') },
            uFlowSpeed: { value: 0.06 },
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
      col[i * 3]     = brightness * 1.5;
      col[i * 3 + 1] = brightness * 0.4;
      col[i * 3 + 2] = brightness * 2.2;
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
      pointsRef.current.material.opacity = 0.4 + h * 0.3;
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

      <pointLight position={[0, 0, 5]}  color="#4a1a6b" intensity={2}   distance={30} decay={2} />
      <pointLight position={[0, 0, -5]} color="#00ff6a" intensity={0.5} distance={20} decay={2} />
    </group>
  );
}
