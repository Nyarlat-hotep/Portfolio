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
    float angle = vUv.x; // 0–1 around the ring circumference
    float side  = vUv.y; // 0–1 around the tube cross-section

    // Proximity to tube equator (1 = centre face, 0 = tube edges)
    float equator = 1.0 - abs(side - 0.5) * 2.0;

    // Animated flow — texture streams around the ring over time
    float flowAngle = angle - uTime * uFlowSpeed;

    // Multi-octave plasma turbulence
    float n1 = snoise(vec3(flowAngle * 10.0,  side * 6.0,  uTime * 0.25));
    float n2 = snoise(vec3(flowAngle * 24.0,  side * 11.0, uTime * 0.35 + 5.0));
    float n3 = snoise(vec3(flowAngle * 50.0,  side * 20.0, uTime * 0.15 + 10.0));
    float turb = n1 * 0.55 + n2 * 0.30 + n3 * 0.15;
    turb = turb * 0.5 + 0.5; // remap to 0–1

    // Bright plasma hotspots — clumps of superheated material
    float hotspot = smoothstep(0.62, 0.90, turb) * equator;

    // Colour: blend hot→mid→cool across tube cross-section, modulated by turbulence
    vec3 col = mix(uColorCool, uColorMid, equator);
    col = mix(col, uColorHot, equator * equator * turb);

    // Turbulent brightness variation
    col *= (0.5 + turb * 0.6);

    // Bright plasma clumps overlay
    col = mix(col, uColorHot * 1.9, hotspot * 0.75);

    // Hover brightening
    col *= (1.0 + uHover * 0.55);

    // Alpha: fade at tube edges, boosted by turbulence and hotspots
    float edgeFade = smoothstep(0.0, 0.12, side) * smoothstep(1.0, 0.88, side);
    float alpha = edgeFade * (0.55 + turb * 0.3 + hotspot * 0.12);
    alpha = clamp(alpha, 0.0, 0.95);

    gl_FragColor = vec4(col, alpha);
  }
`;

// ============================================================
// Tentacle Shaders
// ============================================================
const tentacleVertexShader = `
  uniform float uTime;
  uniform float uIndex;
  uniform float uHover;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  ${glslNoise}

  void main() {
    vUv = uv;

    // Displacement intensity increases toward the tip
    float tipInfluence = pow(uv.x, 1.5);

    // Amplify writhing on hover (no time scaling — that causes jitter)
    float amp = 1.0 + uHover * 1.5;

    // Multi-octave noise for organic writhing
    float n1 = snoise(vec3(position * 0.08 + vec3(uTime * 0.3 + uIndex * 10.0)));
    float n2 = snoise(vec3(position * 0.12 + vec3(100.0, uTime * 0.4 + uIndex * 10.0, 0.0)));
    float n3 = snoise(vec3(position * 0.05 + vec3(uTime * 0.2, 200.0, uIndex * 10.0)));

    // Displace along normal and lateral directions
    vec3 displaced = position;
    displaced += normal * n1 * tipInfluence * 1.5 * amp;
    displaced.x += n2 * tipInfluence * 1.0 * amp;
    displaced.y += n3 * tipInfluence * 0.8 * amp;

    // World-space normal (approximate, no non-uniform scale)
    vNormal = normalize(mat3(modelMatrix) * normal);

    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
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
    // Base color: deep purple-black
    vec3 baseColor = vec3(0.06, 0.02, 0.12);

    // Fresnel rim glow - more vivid purple on hover
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
    vec3 rimColor = vec3(0.25 + uHover * 0.35, 0.05, 0.45 + uHover * 0.35);

    // Bioluminescent vein pattern - constant speed, brighter on hover
    float veinNoise = snoise(vec3(
      vUv.x * 15.0 + uTime * 0.5,
      vUv.y * 8.0,
      uIndex * 5.0
    ));
    float veinPattern = smoothstep(0.3, 0.6, veinNoise);

    // Pulsing emission - constant frequency, brighter on hover
    float pulse = sin(uTime * 1.5 + uIndex * 2.0 + vUv.x * 8.0) * 0.5 + 0.5;
    vec3 veinColor = vec3(0.0, 0.8, 0.35) * veinPattern * pulse * (0.2 + uHover * 0.6);

    // Darken toward tip
    float lengthGrad = 1.0 - vUv.x * 0.3;
    baseColor *= lengthGrad;

    // Combine - brighter rim on hover
    vec3 color = baseColor + rimColor * fresnel * (0.6 + uHover * 0.8) + veinColor;

    // Fade out at tip
    float alpha = 1.0 - smoothstep(0.85, 1.0, vUv.x);

    gl_FragColor = vec4(color, alpha);
  }
`;

// ============================================================
// Helper: Create tapered tube geometry (built once, never recreated)
// ============================================================
function createTaperedTube(curve, tubularSegments, baseRadius, tipRadius, radialSegments) {
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    const radius = THREE.MathUtils.lerp(baseRadius, tipRadius, t);
    const point = curve.getPointAt(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    for (let j = 0; j <= radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);

      const nx = cos * N.x + sin * B.x;
      const ny = cos * N.y + sin * B.y;
      const nz = cos * N.z + sin * B.z;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      positions.push(
        point.x + radius * nx / len,
        point.y + radius * ny / len,
        point.z + radius * nz / len
      );
      normals.push(nx / len, ny / len, nz / len);
      uvs.push(t, j / radialSegments);
    }
  }

  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = (i + 1) * (radialSegments + 1) + j;
      const c = (i + 1) * (radialSegments + 1) + (j + 1);
      const d = i * (radialSegments + 1) + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

// ============================================================
// Tentacle Component (shader-based animation, static geometry)
// ============================================================
function Tentacle({ basePosition, length, index, totalCount, hovered }) {
  const meshRef = useRef();
  const hoverRef = useRef(0);

  const { geometry, material } = useMemo(() => {
    // Generate an organic curved path for the tentacle
    const angle = (index / totalCount) * Math.PI * 2;
    const direction = new THREE.Vector3(
      Math.sin(angle + index * 0.3),
      (Math.random() - 0.5) * 0.4,
      Math.cos(angle + index * 0.3)
    ).normalize();

    // Perpendicular direction for lateral bends
    const up = new THREE.Vector3(0, 1, 0);
    const perp = new THREE.Vector3().crossVectors(direction, up).normalize();

    // Build control points with organic curves
    const numPoints = 7;
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      const curveFactor = Math.sin(t * Math.PI) * 3;
      points.push(new THREE.Vector3(
        basePosition[0] + direction.x * t * length + perp.x * curveFactor * Math.sin(index * 1.7 + t * 2),
        basePosition[1] + direction.y * t * length + curveFactor * Math.cos(index * 1.3 + t) * 0.6,
        basePosition[2] + direction.z * t * length + perp.z * curveFactor * Math.sin(index * 0.9 + t * 1.5)
      ));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const geo = createTaperedTube(curve, 40, 0.4, 0.02, 10);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIndex: { value: index },
        uHover: { value: 0 }
      },
      vertexShader: tentacleVertexShader,
      fragmentShader: tentacleFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true
    });

    return { geometry: geo, material: mat };
  }, [basePosition, length, index, totalCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Update time + smoothly lerp hover
  useFrame((state, delta) => {
    if (meshRef.current) {
      material.uniforms.uTime.value = state.clock.elapsedTime;
      const target = hovered ? 1 : 0;
      hoverRef.current += (target - hoverRef.current) * Math.min(delta * 3, 1);
      material.uniforms.uHover.value = hoverRef.current;
    }
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}

// ============================================================
// Black Hole Core (improved materials)
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

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    // Smooth hover lerp
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
      {/* Invisible click target - larger for easier clicking */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[6, 16, 16]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Event horizon - pure black sphere */}
      <mesh ref={eventHorizonRef}>
        <sphereGeometry args={[4, 32, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Event horizon rim glow - Fresnel edge light */}
      <mesh>
        <sphereGeometry args={[4.3, 32, 32]} />
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

      {/* Accretion disk - main */}
      <mesh ref={diskRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[7, 0.35, 16, 64]} />
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

      {/* Accretion disk - inner bright ring */}
      <mesh ref={innerRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.2, 0.3, 8, 64]} />
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

      {/* Outer accent ring */}
      <mesh ref={outerRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[9, 0.25, 8, 64]} />
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
// Void Particles (atmospheric dust around the void)
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
  const hoverRef = useRef(0);
  const circleTexture = useMemo(() => createCircleTexture(), []);

  // Cleanup on unmount
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
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 5 + Math.random() * radius;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.4;
      pos[i * 3 + 2] = r * Math.cos(phi);

      // Dark purple/grey tones
      const brightness = 0.08 + Math.random() * 0.12;
      col[i * 3] = brightness * 1.5;
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
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
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
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);

  const tentacleConfigs = useMemo(() => {
    const count = 6;
    return Array.from({ length: count }, (_, i) => ({
      index: i,
      length: 15 + Math.random() * 12,
      offset: [
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3
      ]
    }));
  }, []);

  return (
    <group ref={groupRef} position={position}>
      {/* Black hole core */}
      <BlackHoleCore position={[0, 0, 0]} onClick={onClick} onHoverChange={setHovered} />

      {/* Shader-based tentacles */}
      {tentacleConfigs.map((config) => (
        <Tentacle
          key={config.index}
          basePosition={config.offset}
          length={config.length}
          index={config.index}
          totalCount={tentacleConfigs.length}
          hovered={hovered}
        />
      ))}

      {/* Atmospheric particles */}
      <VoidParticles hovered={hovered} />

      {/* Ambient void lighting */}
      <pointLight position={[0, 0, 5]} color="#4a1a6b" intensity={2} distance={30} decay={2} />
      <pointLight position={[0, 0, -5]} color="#00ff6a" intensity={0.5} distance={20} decay={2} />
    </group>
  );
}
