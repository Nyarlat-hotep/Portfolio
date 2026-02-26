import { useMemo, useRef, useEffect } from 'react';
import './OverlayStars.css';

const ATTRACTION_RADIUS = 120;
const MAX_PULL = 16;
const LERP_IN  = 0.04;
const LERP_OUT = 0.03;

// drift 1-4 maps to different CSS keyframe paths
const STAR_CONFIGS = [
  // Left edge
  { left: 1.2,  top: 6,    size: 2, opacity: 0.45, duration: 7.2,  delay: 0.0,  drift: 1 },
  { left: 3.5,  top: 16,   size: 1, opacity: 0.3,  duration: 9.5,  delay: 1.3,  drift: 2 },
  { left: 1.8,  top: 27,   size: 4, opacity: 0.4,  duration: 8.1,  delay: 0.6,  drift: 3 },
  { left: 4.0,  top: 39,   size: 1, opacity: 0.25, duration: 11.0, delay: 2.4,  drift: 4 },
  { left: 2.2,  top: 51,   size: 3, opacity: 0.4,  duration: 7.8,  delay: 3.1,  drift: 1 },
  { left: 0.8,  top: 62,   size: 2, opacity: 0.3,  duration: 9.2,  delay: 0.9,  drift: 2 },
  { left: 3.8,  top: 73,   size: 5, opacity: 0.35, duration: 8.6,  delay: 1.7,  drift: 3 },
  { left: 1.5,  top: 84,   size: 1, opacity: 0.25, duration: 10.3, delay: 4.0,  drift: 4 },
  { left: 4.5,  top: 93,   size: 2, opacity: 0.35, duration: 7.4,  delay: 2.2,  drift: 1 },
  { left: 2.8,  top: 11,   size: 1, opacity: 0.28, duration: 11.8, delay: 2.6,  drift: 2 },
  { left: 0.5,  top: 22,   size: 2, opacity: 0.3,  duration: 9.0,  delay: 0.3,  drift: 3 },
  { left: 3.2,  top: 33,   size: 1, opacity: 0.22, duration: 12.5, delay: 1.9,  drift: 4 },
  { left: 1.0,  top: 45,   size: 3, opacity: 0.28, duration: 8.4,  delay: 3.4,  drift: 1 },
  { left: 4.2,  top: 57,   size: 1, opacity: 0.25, duration: 10.6, delay: 0.8,  drift: 2 },
  { left: 2.5,  top: 68,   size: 2, opacity: 0.3,  duration: 9.7,  delay: 2.0,  drift: 3 },
  { left: 0.9,  top: 79,   size: 1, opacity: 0.22, duration: 11.3, delay: 4.3,  drift: 4 },
  { left: 3.6,  top: 89,   size: 2, opacity: 0.28, duration: 8.8,  delay: 1.4,  drift: 1 },
  // Right edge
  { left: 97.5, top: 4,    size: 2, opacity: 0.35, duration: 8.4,  delay: 0.4,  drift: 4 },
  { left: 95.5, top: 15,   size: 4, opacity: 0.4,  duration: 7.0,  delay: 2.0,  drift: 1 },
  { left: 98.8, top: 26,   size: 1, opacity: 0.25, duration: 10.5, delay: 0.8,  drift: 2 },
  { left: 96.0, top: 38,   size: 3, opacity: 0.4,  duration: 8.9,  delay: 3.5,  drift: 3 },
  { left: 98.5, top: 50,   size: 1, opacity: 0.3,  duration: 7.6,  delay: 1.2,  drift: 4 },
  { left: 95.2, top: 61,   size: 5, opacity: 0.35, duration: 9.8,  delay: 2.7,  drift: 1 },
  { left: 97.8, top: 72,   size: 2, opacity: 0.3,  duration: 8.3,  delay: 0.2,  drift: 2 },
  { left: 96.5, top: 83,   size: 1, opacity: 0.25, duration: 11.2, delay: 1.5,  drift: 3 },
  { left: 94.8, top: 93,   size: 3, opacity: 0.35, duration: 7.9,  delay: 3.0,  drift: 4 },
  { left: 96.2, top: 10,   size: 1, opacity: 0.25, duration: 12.1, delay: 1.8,  drift: 2 },
  { left: 98.1, top: 21,   size: 2, opacity: 0.3,  duration: 9.3,  delay: 3.2,  drift: 3 },
  { left: 95.8, top: 32,   size: 1, opacity: 0.22, duration: 11.6, delay: 0.5,  drift: 4 },
  { left: 97.2, top: 44,   size: 3, opacity: 0.28, duration: 8.7,  delay: 2.1,  drift: 1 },
  { left: 98.9, top: 56,   size: 1, opacity: 0.25, duration: 10.8, delay: 1.0,  drift: 2 },
  { left: 96.8, top: 67,   size: 2, opacity: 0.3,  duration: 9.5,  delay: 3.8,  drift: 3 },
  { left: 95.0, top: 78,   size: 1, opacity: 0.22, duration: 12.4, delay: 0.7,  drift: 4 },
  { left: 97.5, top: 88,   size: 2, opacity: 0.28, duration: 8.1,  delay: 2.5,  drift: 1 },
  // Top edge
  { left: 10,   top: 1.2,  size: 2, opacity: 0.3,  duration: 10.2, delay: 1.5,  drift: 3 },
  { left: 22,   top: 3.5,  size: 4, opacity: 0.35, duration: 8.7,  delay: 2.8,  drift: 4 },
  { left: 38,   top: 1.8,  size: 1, opacity: 0.25, duration: 9.4,  delay: 0.3,  drift: 1 },
  { left: 55,   top: 2.5,  size: 3, opacity: 0.3,  duration: 11.5, delay: 3.6,  drift: 2 },
  { left: 70,   top: 1.0,  size: 1, opacity: 0.25, duration: 8.0,  delay: 1.1,  drift: 3 },
  { left: 85,   top: 3.0,  size: 2, opacity: 0.3,  duration: 9.1,  delay: 2.4,  drift: 4 },
  // Bottom edge
  { left: 14,   top: 96,   size: 3, opacity: 0.35, duration: 8.0,  delay: 1.0,  drift: 1 },
  { left: 30,   top: 97.5, size: 1, opacity: 0.25, duration: 10.8, delay: 2.3,  drift: 2 },
  { left: 48,   top: 95.5, size: 4, opacity: 0.3,  duration: 7.5,  delay: 0.7,  drift: 3 },
  { left: 63,   top: 97,   size: 2, opacity: 0.3,  duration: 9.4,  delay: 1.8,  drift: 4 },
  { left: 78,   top: 96.5, size: 1, opacity: 0.25, duration: 8.6,  delay: 3.2,  drift: 1 },
  { left: 90,   top: 95,   size: 3, opacity: 0.35, duration: 10.1, delay: 0.5,  drift: 2 },
  // Interior — upper half
  { left: 12,   top: 11,   size: 1, opacity: 0.18, duration: 13.2, delay: 1.4,  drift: 2 },
  { left: 25,   top: 8,    size: 2, opacity: 0.2,  duration: 11.7, delay: 3.8,  drift: 3 },
  { left: 42,   top: 13,   size: 1, opacity: 0.15, duration: 14.5, delay: 0.9,  drift: 4 },
  { left: 58,   top: 7,    size: 2, opacity: 0.2,  duration: 12.3, delay: 2.6,  drift: 1 },
  { left: 74,   top: 12,   size: 1, opacity: 0.17, duration: 10.9, delay: 4.1,  drift: 2 },
  { left: 88,   top: 9,    size: 3, opacity: 0.18, duration: 13.8, delay: 1.2,  drift: 3 },
  { left: 18,   top: 22,   size: 2, opacity: 0.15, duration: 15.0, delay: 2.0,  drift: 4 },
  { left: 35,   top: 19,   size: 1, opacity: 0.18, duration: 11.4, delay: 0.4,  drift: 1 },
  { left: 52,   top: 24,   size: 2, opacity: 0.16, duration: 12.8, delay: 3.3,  drift: 2 },
  { left: 68,   top: 18,   size: 1, opacity: 0.2,  duration: 9.6,  delay: 1.8,  drift: 3 },
  { left: 82,   top: 21,   size: 2, opacity: 0.15, duration: 14.2, delay: 0.6,  drift: 4 },
  // Interior — middle band
  { left: 8,    top: 34,   size: 1, opacity: 0.15, duration: 16.0, delay: 2.5,  drift: 1 },
  { left: 20,   top: 42,   size: 2, opacity: 0.18, duration: 12.1, delay: 4.4,  drift: 2 },
  { left: 33,   top: 36,   size: 1, opacity: 0.15, duration: 13.6, delay: 1.0,  drift: 3 },
  { left: 47,   top: 44,   size: 3, opacity: 0.16, duration: 10.7, delay: 3.0,  drift: 4 },
  { left: 61,   top: 38,   size: 1, opacity: 0.18, duration: 14.8, delay: 0.2,  drift: 1 },
  { left: 75,   top: 46,   size: 2, opacity: 0.15, duration: 11.9, delay: 2.1,  drift: 2 },
  { left: 89,   top: 40,   size: 1, opacity: 0.2,  duration: 13.4, delay: 1.6,  drift: 3 },
  // Interior — lower half
  { left: 14,   top: 57,   size: 2, opacity: 0.18, duration: 12.5, delay: 3.7,  drift: 4 },
  { left: 28,   top: 63,   size: 1, opacity: 0.15, duration: 15.3, delay: 0.8,  drift: 1 },
  { left: 43,   top: 55,   size: 2, opacity: 0.16, duration: 11.2, delay: 2.9,  drift: 2 },
  { left: 57,   top: 67,   size: 1, opacity: 0.18, duration: 13.1, delay: 1.3,  drift: 3 },
  { left: 71,   top: 58,   size: 3, opacity: 0.15, duration: 14.6, delay: 4.2,  drift: 4 },
  { left: 85,   top: 64,   size: 1, opacity: 0.18, duration: 10.4, delay: 0.3,  drift: 1 },
  { left: 22,   top: 76,   size: 2, opacity: 0.15, duration: 12.9, delay: 2.2,  drift: 2 },
  { left: 38,   top: 82,   size: 1, opacity: 0.17, duration: 11.6, delay: 3.5,  drift: 3 },
  { left: 54,   top: 78,   size: 2, opacity: 0.15, duration: 13.7, delay: 1.1,  drift: 4 },
  { left: 69,   top: 85,   size: 1, opacity: 0.18, duration: 14.0, delay: 0.7,  drift: 1 },
  { left: 83,   top: 80,   size: 2, opacity: 0.16, duration: 12.4, delay: 2.8,  drift: 2 },
];

export default function OverlayStars({ planetColor = '#00d4ff' }) {
  const stars = useMemo(() => STAR_CONFIGS, []);
  const wrapperRefs = useRef([]);
  const starRefs    = useRef([]);
  const pulls       = useRef(stars.map(() => ({ x: 0, y: 0 })));
  const targets     = useRef(stars.map(() => ({ x: 0, y: 0 })));
  const mouseRef    = useRef({ x: -9999, y: -9999 });
  const rafRef      = useRef(null);

  useEffect(() => {
    const onMouseMove = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMouseMove);

    const tick = () => {
      const { x: mx, y: my } = mouseRef.current;

      stars.forEach((_, i) => {
        const wrapper = wrapperRefs.current[i];
        const star    = starRefs.current[i];
        if (!wrapper || !star) return;

        const rect = wrapper.getBoundingClientRect();
        const cx = rect.left + rect.width  * 0.5;
        const cy = rect.top  + rect.height * 0.5;
        const dx = mx - cx, dy = my - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ATTRACTION_RADIUS && dist > 0) {
          const force = Math.pow(1 - dist / ATTRACTION_RADIUS, 0.8) * MAX_PULL;
          targets.current[i] = { x: (dx / dist) * force, y: (dy / dist) * force };
        } else {
          targets.current[i] = { x: 0, y: 0 };
        }

        const p  = pulls.current[i];
        const t  = targets.current[i];
        const sp = (t.x === 0 && t.y === 0) ? LERP_OUT : LERP_IN;
        p.x += (t.x - p.x) * sp;
        p.y += (t.y - p.y) * sp;

        star.style.transform = `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px)`;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [stars]);

  return (
    <div className="overlay-stars" aria-hidden="true">
      {stars.map((s, i) => (
        <div
          key={i}
          ref={el => { wrapperRefs.current[i] = el; }}
          className={`overlay-star-wrapper overlay-star-drift${s.drift}`}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            animationDuration: `${s.duration}s`,
            animationDelay: `-${s.delay}s`,
          }}
        >
          <div
            ref={el => { starRefs.current[i] = el; }}
            className="overlay-star"
            style={{
              width:     `${s.size}px`,
              height:    `${s.size}px`,
              opacity:   s.opacity,
              background: planetColor,
              boxShadow: `0 0 ${s.size * 3}px ${s.size}px ${planetColor}55`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
