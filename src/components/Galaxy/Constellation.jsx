import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CONSTELLATIONS } from '../../data/constellations';

const SCALE = 1.6;
const STAR_SIZE = 1.0;
const HITBOX_RADIUS = 0.9;

// Creates a circular glow texture for stars — soft purple-white radial gradient
function createGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;

  // Outer soft glow
  const glow = ctx.createRadialGradient(center, center, 0, center, center, center);
  glow.addColorStop(0,    'rgba(220, 200, 255, 1.0)');
  glow.addColorStop(0.15, 'rgba(200, 170, 255, 0.95)');
  glow.addColorStop(0.35, 'rgba(160, 120, 220, 0.6)');
  glow.addColorStop(0.6,  'rgba(107, 47, 160, 0.25)');
  glow.addColorStop(1.0,  'rgba(80, 20, 120, 0)');

  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Bright white core
  const core = ctx.createRadialGradient(center, center, 0, center, center, center * 0.18);
  core.addColorStop(0,   'rgba(255, 255, 255, 1)');
  core.addColorStop(1,   'rgba(255, 255, 255, 0)');
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

export default function Constellation({ position = [0, 2, -55], onSelect }) {
  const starMatRef = useRef();
  const lineMatRef = useRef();
  const [isVisible, setIsVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const opacityRef = useRef(0);

  const constellation = useMemo(() => getTodayConstellation(), []);
  const glowTexture = useMemo(() => createGlowTexture(), []);

  // Build Three.js geometry from constellation data
  const { scaledStars, starGeo, lineGeo, centroid } = useMemo(() => {
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

    // Line geometry
    const lineArr = [];
    constellation.lines.forEach(([a, b]) => {
      const va = scaledStars[a], vb = scaledStars[b];
      lineArr.push(va.x, va.y, va.z, vb.x, vb.y, vb.z);
    });
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lineArr), 3));

    // Centroid for tooltip anchor
    const cx = scaledStars.reduce((s, v) => s + v.x, 0) / scaledStars.length;
    const maxY = Math.max(...scaledStars.map(v => v.y));
    const centroid = [cx, maxY + 2.5, 0];

    return { scaledStars, starGeo, lineGeo, centroid };
  }, [constellation]);

  // Cleanup geometry and texture on unmount
  useEffect(() => {
    return () => {
      starGeo.dispose();
      lineGeo.dispose();
      glowTexture.dispose();
    };
  }, [starGeo, lineGeo, glowTexture]);

  // Fade in as camera orbits to the far side (negative Z)
  useFrame(({ camera }) => {
    const newOpacity = THREE.MathUtils.clamp(
      THREE.MathUtils.mapLinear(camera.position.z, 5, -8, 0, 1),
      0, 1
    );

    opacityRef.current = newOpacity;

    if (starMatRef.current) {
      starMatRef.current.opacity = newOpacity * (hovered ? 1.0 : 0.9);
    }
    if (lineMatRef.current) {
      lineMatRef.current.opacity = newOpacity * (hovered ? 0.8 : 0.5);
    }

    // Gate React state updates to threshold crossings only
    const visible = newOpacity > 0.05;
    if (visible !== isVisible) setIsVisible(visible);
  });

  // Sync hover color directly on material without re-render
  useEffect(() => {
    if (starMatRef.current) {
      starMatRef.current.color.set(hovered ? '#c8ffdf' : '#d4c0f0');
      starMatRef.current.size = hovered ? STAR_SIZE * 1.5 : STAR_SIZE;
    }
    if (lineMatRef.current) {
      lineMatRef.current.color.set(hovered ? '#9b4dca' : '#6b2fa0');
    }
  }, [hovered]);

  return (
    <group position={position}>
      {/* Visual stars — circular glow texture */}
      <points geometry={starGeo}>
        <pointsMaterial
          ref={starMatRef}
          size={STAR_SIZE}
          map={glowTexture}
          color="#d4c0f0"
          transparent
          opacity={0}
          alphaTest={0.01}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Connecting lines */}
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial
          ref={lineMatRef}
          color="#9b4dca"
          transparent
          opacity={0}
        />
      </lineSegments>

      {/* Invisible hitboxes per star — only active when visible */}
      {isVisible && scaledStars.map((pos, i) => (
        <mesh
          key={i}
          position={[pos.x, pos.y, pos.z]}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
          onPointerOut={() => setHovered(false)}
          onClick={(e) => { e.stopPropagation(); onSelect(constellation); }}
        >
          <sphereGeometry args={[HITBOX_RADIUS, 8, 8]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      ))}

      {/* Tooltip — appears above the constellation on hover */}
      {hovered && isVisible && (
        <Html position={centroid} center distanceFactor={40}>
          <div className="constellation-tooltip">
            {constellation.name}
          </div>
        </Html>
      )}
    </group>
  );
}
