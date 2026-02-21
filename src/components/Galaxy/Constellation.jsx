import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONSTELLATIONS } from '../../data/constellations';

const SCALE = 1.6;
const STAR_SIZE = 3.0;
const TUBE_RADIUS = 0.018;
const TOOLTIP_COLOR = '#b8b0d8';

// Soft lavender-white glow texture for stars
function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;

  const glow = ctx.createRadialGradient(center, center, 0, center, center, center);
  glow.addColorStop(0,    'rgba(220, 215, 255, 0.9)');
  glow.addColorStop(0.2,  'rgba(200, 192, 255, 0.7)');
  glow.addColorStop(0.45, 'rgba(170, 160, 240, 0.35)');
  glow.addColorStop(0.7,  'rgba(140, 130, 210, 0.12)');
  glow.addColorStop(1.0,  'rgba(110, 100, 180, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  const core = ctx.createRadialGradient(center, center, 0, center, center, center * 0.25);
  core.addColorStop(0,   'rgba(255, 252, 255, 0.95)');
  core.addColorStop(0.5, 'rgba(240, 235, 255, 0.5)');
  core.addColorStop(1,   'rgba(220, 215, 255, 0)');
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

export default function Constellation({ position = [0, 2, -55], onSelect, onHover }) {
  const starMatRef = useRef();
  const lineMatRef = useRef();
  const _projVec = useRef(new THREE.Vector3());
  const [hovered, setHovered] = useState(false);
  const hoveredRef = useRef(false);
  const { camera, size } = useThree();

  const constellation = useMemo(() => getTodayConstellation(), []);
  const glowTexture = useMemo(() => createGlowTexture(), []);

  const { starGeo, mergedLineGeo, bounds } = useMemo(() => {
    const scaledStars = constellation.stars.map(([x, y]) => new THREE.Vector3(x * SCALE, y * SCALE, 0));

    // Points geometry
    const posArr = new Float32Array(scaledStars.length * 3);
    scaledStars.forEach((v, i) => {
      posArr[i * 3]     = v.x;
      posArr[i * 3 + 1] = v.y;
      posArr[i * 3 + 2] = v.z;
    });
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));

    // Tube + sphere-cap geometry, merged into one mesh
    const pieces = [];
    constellation.lines.forEach(([a, b]) => {
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

    // Bounding box for the hover plane
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

    return { starGeo, mergedLineGeo, bounds };
  }, [constellation]);

  useEffect(() => {
    return () => {
      starGeo.dispose();
      glowTexture.dispose();
      mergedLineGeo?.dispose();
    };
  }, [starGeo, glowTexture, mergedLineGeo]);

  // Project world-space tooltip anchor to screen every frame while hovered
  useFrame(() => {
    if (!hoveredRef.current) return;
    const [px, py, pz] = position;
    _projVec.current.set(
      px + bounds.cx,
      py + bounds.topY + 2.5,
      pz
    );
    _projVec.current.project(camera);
    const x = (_projVec.current.x *  0.5 + 0.5) * size.width;
    const y = (_projVec.current.y * -0.5 + 0.5) * size.height;
    onHover?.(constellation.name, { x, y, radius: 20, color: TOOLTIP_COLOR });
  });

  const handlePointerOut = () => {
    hoveredRef.current = false;
    setHovered(false);
    onHover?.(null, null);
  };

  // Sync material colors on hover
  useEffect(() => {
    if (starMatRef.current) starMatRef.current.color.set(hovered ? '#f0ecff' : '#d8d4f0');
    if (lineMatRef.current) lineMatRef.current.color.set(hovered ? '#d4d0ee' : '#9890c0');
  }, [hovered]);

  return (
    <group position={position}>
      {/* Stars */}
      <points geometry={starGeo}>
        <pointsMaterial
          ref={starMatRef}
          size={STAR_SIZE}
          map={glowTexture}
          color="#d8d4f0"
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
          <meshBasicMaterial ref={lineMatRef} color="#9890c0" transparent opacity={0.2} />
        </mesh>
      )}

      {/* Invisible bounding rectangle — single hover/click surface for the whole constellation */}
      <mesh
        position={[bounds.cx, bounds.cy, 0]}
        onPointerOver={(e) => { e.stopPropagation(); hoveredRef.current = true; setHovered(true); }}
        onPointerOut={handlePointerOut}
        onClick={(e) => { e.stopPropagation(); onSelect(constellation); }}
      >
        <planeGeometry args={[bounds.width, bounds.height]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
