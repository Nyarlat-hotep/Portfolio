import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CONSTELLATIONS } from '../../data/constellations';

const SCALE = 1.6;
const STAR_SIZE = 0.28;
const HITBOX_RADIUS = 0.9;

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

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      starGeo.dispose();
      lineGeo.dispose();
    };
  }, [starGeo, lineGeo]);

  // Fade in as camera orbits to the far side (negative Z)
  useFrame(({ camera }) => {
    const newOpacity = THREE.MathUtils.clamp(
      THREE.MathUtils.mapLinear(camera.position.z, 5, -8, 0, 1),
      0, 1
    );

    opacityRef.current = newOpacity;

    if (starMatRef.current) {
      starMatRef.current.opacity = newOpacity * (hovered ? 1.0 : 0.8);
    }
    if (lineMatRef.current) {
      lineMatRef.current.opacity = newOpacity * (hovered ? 0.55 : 0.22);
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
      {/* Visual stars */}
      <points geometry={starGeo}>
        <pointsMaterial
          ref={starMatRef}
          size={STAR_SIZE}
          color="#d4c0f0"
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Connecting lines */}
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial
          ref={lineMatRef}
          color="#6b2fa0"
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
