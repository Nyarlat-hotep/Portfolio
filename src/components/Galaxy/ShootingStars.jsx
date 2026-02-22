import { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const TRAIL_POINTS = 20;
const SPEED        = 35;   // world units per second
const TAIL_LENGTH  = 6;    // world units
const DURATION     = 0.55; // seconds per streak
const FIRST_DELAY  = 12;   // seconds until first shooting star (so visitors see one quickly)
const MIN_INTERVAL = 45;
const MAX_INTERVAL = 75;

function spawnStar(s) {
  s.active   = true;
  s.progress = 0;

  const radius = 35 + Math.random() * 20;
  const theta  = Math.random() * Math.PI * 2;
  const phi    = Math.PI * 0.25 + Math.random() * Math.PI * 0.5; // mid-latitudes only
  s.sx = radius * Math.sin(phi) * Math.cos(theta);
  s.sy = radius * Math.sin(phi) * Math.sin(theta) * 0.4; // flatten vertically
  s.sz = radius * Math.cos(phi);

  // Direction: mostly diagonal downward-ish across the scene
  const a = Math.random() * Math.PI * 2;
  const rawDx =  Math.cos(a) * 0.8;
  const rawDy = -0.3 - Math.random() * 0.4;
  const rawDz =  Math.sin(a) * 0.6;
  const len   = Math.sqrt(rawDx ** 2 + rawDy ** 2 + rawDz ** 2);
  s.dx = rawDx / len;
  s.dy = rawDy / len;
  s.dz = rawDz / len;
}

const ShootingStars = forwardRef(function ShootingStars(_, ref) {
  const lineRef = useRef();

  // Baked vertex colors: tail (dim cyan-black) → head (bright white-cyan)
  const geometry = useMemo(() => {
    const positions = new Float32Array(TRAIL_POINTS * 3);
    const colorArr  = new Float32Array(TRAIL_POINTS * 3);
    for (let i = 0; i < TRAIL_POINTS; i++) {
      const t = i / (TRAIL_POINTS - 1); // 0 = tail, 1 = head
      colorArr[i * 3]     = t * 0.88 + 0.12;
      colorArr[i * 3 + 1] = t * 0.92 + 0.08;
      colorArr[i * 3 + 2] = 1.0;
    }
    const geo     = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.usage = THREE.DynamicDrawUsage;
    geo.setAttribute('position', posAttr);
    geo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
    return geo;
  }, []);

  const stateRef = useRef({
    active:       false,
    timer:        0,
    nextInterval: FIRST_DELAY,
    progress:     0,
    sx: 0, sy: 0, sz: 0,
    dx: 0, dy: 0, dz: 0,
  });

  // Expose trigger() so Galaxy.jsx can fire one on double-click
  useImperativeHandle(ref, () => ({
    trigger() {
      const s = stateRef.current;
      s.timer = 0; // reset auto-schedule timer
      spawnStar(s);
      if (lineRef.current) lineRef.current.visible = true;
    }
  }), []);

  useFrame((_, delta) => {
    const s    = stateRef.current;
    const line = lineRef.current;
    if (!line) return;

    if (!s.active) {
      s.timer += delta;
      if (s.timer < s.nextInterval) return;

      s.timer        = 0;
      s.nextInterval = MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL);
      spawnStar(s);
      line.visible = true;
    } else {
      s.progress += delta;
      const t = s.progress / DURATION;

      if (t >= 1) {
        s.active     = false;
        line.visible = false;
        return;
      }

      // Overall fade: sharp in, gradual out
      const opacity = t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92;
      line.material.opacity = opacity * 0.9;

      // Update trail positions
      const headDist = s.progress * SPEED;
      const tailDist = Math.max(0, headDist - TAIL_LENGTH);
      const posAttr  = geometry.attributes.position;

      for (let i = 0; i < TRAIL_POINTS; i++) {
        const frac = i / (TRAIL_POINTS - 1);
        const d    = tailDist + frac * (headDist - tailDist);
        posAttr.setXYZ(i,
          s.sx + s.dx * d,
          s.sy + s.dy * d,
          s.sz + s.dz * d,
        );
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <line ref={lineRef} visible={false} geometry={geometry}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </line>
  );
});

export default ShootingStars;
