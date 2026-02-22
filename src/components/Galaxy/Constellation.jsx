import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONSTELLATIONS } from '../../data/constellations';
import { createCircularParticleTexture, createNebulaSplatTexture } from '../../utils/threeUtils';

const SCALE = 1.6;
const STAR_SIZE = 3.0;
const TUBE_RADIUS = 0.018;
const TOOLTIP_COLOR = '#00d4ff';

// Cyan-white glow texture for stars — matches planet palette
function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;

  const glow = ctx.createRadialGradient(center, center, 0, center, center, center);
  glow.addColorStop(0,    'rgba(160, 232, 255, 0.9)');
  glow.addColorStop(0.2,  'rgba(0, 212, 255, 0.65)');
  glow.addColorStop(0.45, 'rgba(0, 160, 220, 0.28)');
  glow.addColorStop(0.7,  'rgba(0, 100, 180, 0.1)');
  glow.addColorStop(1.0,  'rgba(0, 50, 140, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  const core = ctx.createRadialGradient(center, center, 0, center, center, center * 0.25);
  core.addColorStop(0,   'rgba(255, 252, 255, 0.95)');
  core.addColorStop(0.5, 'rgba(200, 242, 255, 0.5)');
  core.addColorStop(1,   'rgba(0, 212, 255, 0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

// Deterministic daily selection — same for all visitors per UTC day
function getTodayConstellation() {
  const now = new Date();
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 0);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dayOfYear = Math.floor((today - startOfYear) / 86400000);
  return CONSTELLATIONS[dayOfYear % CONSTELLATIONS.length];
}

// Computed once at module load — deterministic per UTC day, no side effects
const todayConstellation = getTodayConstellation();

export default function Constellation({ position = [0, 2, -55], onSelect, onHover }) {
  const starMatRef    = useRef();
  const lineMatRef    = useRef();
  const haloRef       = useRef();
  const nebulaRef     = useRef();
  const _projVec      = useRef(new THREE.Vector3());
  const _starOpacity  = useRef(0.55);
  const _starSize     = useRef(STAR_SIZE);
  const [hovered, setHovered] = useState(false);
  const hoveredRef    = useRef(false);
  const { camera, size } = useThree();

  const glowTexture       = useMemo(() => createGlowTexture(), []);
  const nebulaSplatTex    = createNebulaSplatTexture(); // module-level cache — stable reference
  const haloTexture       = useMemo(() => createCircularParticleTexture(), []);

  const { starGeo, mergedLineGeo, bounds, haloGeo, nebulaCloudGeo } = useMemo(() => {
    const scaledStars = todayConstellation.stars.map(([x, y]) => new THREE.Vector3(x * SCALE, y * SCALE, 0));

    // Star points geometry
    const posArr = new Float32Array(scaledStars.length * 3);
    scaledStars.forEach((v, i) => {
      posArr[i * 3]     = v.x;
      posArr[i * 3 + 1] = v.y;
      posArr[i * 3 + 2] = v.z;
    });
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));

    // Tube + sphere-cap line geometry merged into one mesh
    const pieces = [];
    todayConstellation.lines.forEach(([a, b]) => {
      const curve = new THREE.LineCurve3(scaledStars[a], scaledStars[b]);
      pieces.push(new THREE.TubeGeometry(curve, 1, TUBE_RADIUS, 12, false));
    });
    scaledStars.forEach(v => {
      const sphere = new THREE.SphereGeometry(TUBE_RADIUS, 12, 12);
      sphere.translate(v.x, v.y, v.z);
      pieces.push(sphere);
    });
    const mergedLineGeo = mergeGeometries(pieces);
    pieces.forEach(g => g.dispose());

    // Bounding box
    const xs = scaledStars.map(v => v.x);
    const ys = scaledStars.map(v => v.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 1.5;
    const bounds = {
      width:  maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      topY: maxY,
    };

    // ── Halo particles — flat disc of purple/green specks ──
    const haloCount  = 55;
    const hPositions = new Float32Array(haloCount * 3);
    const hColors    = new Float32Array(haloCount * 3);
    const purpleCol  = new THREE.Color('#a855f7');
    const greenCol   = new THREE.Color('#00ff7a');

    for (let i = 0; i < haloCount; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 5.5;
      hPositions[i * 3]     = bounds.cx + Math.cos(angle) * radius;
      hPositions[i * 3 + 1] = bounds.cy + Math.sin(angle) * radius * 0.65 + (Math.random() - 0.5) * 3;
      hPositions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
      const col = Math.random() > 0.5 ? purpleCol : greenCol;
      hColors[i * 3] = col.r; hColors[i * 3 + 1] = col.g; hColors[i * 3 + 2] = col.b;
    }
    const haloGeo = new THREE.BufferGeometry();
    haloGeo.setAttribute('position', new THREE.BufferAttribute(hPositions, 3));
    haloGeo.setAttribute('color',    new THREE.BufferAttribute(hColors, 3));

    // ── Volumetric nebula cloud — 3D particle distribution ──
    // Two layers: dense inner core + sparse outer shell, both in 3D
    const nebulaCount  = 280;
    const nPositions   = new Float32Array(nebulaCount * 3);
    const nColors      = new Float32Array(nebulaCount * 3);

    const spreadX = bounds.width  * 0.65;
    const spreadY = bounds.height * 0.65;
    const spreadZ = 4.5; // real Z depth makes it 3D from any angle

    for (let i = 0; i < nebulaCount; i++) {
      // Gaussian-ish: average two randoms → natural density falloff toward edges
      const rx = ((Math.random() + Math.random()) / 2 - 0.5) * 2;
      const ry = ((Math.random() + Math.random()) / 2 - 0.5) * 2;
      const rz = (Math.random() - 0.5) * 2;

      nPositions[i * 3]     = bounds.cx + rx * spreadX;
      nPositions[i * 3 + 1] = bounds.cy + ry * spreadY;
      nPositions[i * 3 + 2] = rz * spreadZ;

      // Purple core, green toward edges — three-way mix with occasional cyan bridge
      const dist = Math.sqrt(rx * rx + ry * ry);
      const edgeBias = Math.min(dist * 1.2, 1);
      const col = new THREE.Color().lerpColors(purpleCol, greenCol, edgeBias * Math.random());
      // Vary brightness so not all particles look the same intensity
      col.multiplyScalar(0.5 + Math.random() * 0.5);
      nColors[i * 3] = col.r; nColors[i * 3 + 1] = col.g; nColors[i * 3 + 2] = col.b;
    }
    const nebulaCloudGeo = new THREE.BufferGeometry();
    nebulaCloudGeo.setAttribute('position', new THREE.BufferAttribute(nPositions, 3));
    nebulaCloudGeo.setAttribute('color',    new THREE.BufferAttribute(nColors, 3));

    return { starGeo, mergedLineGeo, bounds, haloGeo, nebulaCloudGeo };
  }, []);

  useEffect(() => {
    return () => {
      starGeo.dispose();
      glowTexture.dispose();
      haloTexture.dispose();
      haloGeo.dispose();
      nebulaCloudGeo.dispose();
      mergedLineGeo?.dispose();
      // nebulaSplatTex is a module-level cache shared with DistantGalaxy — not disposed here
    };
  }, [starGeo, glowTexture, haloTexture, haloGeo, nebulaCloudGeo, mergedLineGeo]);

  useFrame((_, delta) => {
    const isHovered = hoveredRef.current;

    const speed = delta * 2.5;
    const targetOpacity = isHovered ? 0.9 : 0.55;
    const targetSize    = isHovered ? STAR_SIZE * 1.4 : STAR_SIZE;
    _starOpacity.current += (targetOpacity - _starOpacity.current) * speed;
    _starSize.current    += (targetSize    - _starSize.current)    * speed;

    if (starMatRef.current) {
      starMatRef.current.opacity = _starOpacity.current;
      starMatRef.current.size    = _starSize.current;
    }

    // Halo slow z-rotation
    if (haloRef.current) {
      haloRef.current.rotation.z += delta * 0.025;
    }

    // Nebula slow y-rotation — different axis creates parallax depth illusion
    if (nebulaRef.current) {
      nebulaRef.current.rotation.y += delta * 0.015;
    }

    if (!isHovered) return;
    const [px, py, pz] = position;
    _projVec.current.set(px + bounds.cx, py + bounds.topY + 2.5, pz);
    _projVec.current.project(camera);
    const x = (_projVec.current.x *  0.5 + 0.5) * size.width;
    const y = (_projVec.current.y * -0.5 + 0.5) * size.height;
    onHover?.(todayConstellation.name, { x, y, radius: 20, color: TOOLTIP_COLOR });
  });

  const handlePointerOut = () => {
    hoveredRef.current = false;
    setHovered(false);
    onHover?.(null, null);
  };

  useEffect(() => {
    if (starMatRef.current) {
      starMatRef.current.color.set(hovered ? '#ffffff' : '#a0e8ff');
    }
  }, [hovered]);

  return (
    <group position={position}>
      {/* Volumetric nebula cloud — large overlapping puffs accumulate into a haze */}
      <points ref={nebulaRef} geometry={nebulaCloudGeo}>
        <pointsMaterial
          map={nebulaSplatTex}
          size={5.5}
          vertexColors
          transparent
          opacity={0.09}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Halo particles — slow rotating disc of specks */}
      <points ref={haloRef} geometry={haloGeo}>
        <pointsMaterial
          map={haloTexture}
          size={0.12}
          vertexColors
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Stars */}
      <points geometry={starGeo}>
        <pointsMaterial
          ref={starMatRef}
          size={STAR_SIZE}
          map={glowTexture}
          color="#a0e8ff"
          transparent
          opacity={0.55}
          alphaTest={0.01}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Single merged line mesh */}
      {mergedLineGeo && (
        <mesh geometry={mergedLineGeo}>
          <meshBasicMaterial ref={lineMatRef} color="#a855f7" transparent opacity={0.25} />
        </mesh>
      )}

      {/* Invisible bounding rectangle — hover/click surface */}
      <mesh
        position={[bounds.cx, bounds.cy, 0]}
        onPointerOver={(e) => { e.stopPropagation(); hoveredRef.current = true; setHovered(true); }}
        onPointerOut={handlePointerOut}
        onClick={(e) => { e.stopPropagation(); onSelect(todayConstellation); }}
      >
        <planeGeometry args={[bounds.width, bounds.height]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
