// src/components/UI/LightspeedTransition.jsx
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function LightspeedTransition({ onComplete }) {
  const canvasRef      = useRef(null);
  const rafRef         = useRef(null);
  const onCompleteRef  = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const W   = (canvas.width  = window.innerWidth);
    const H   = (canvas.height = window.innerHeight);
    const cx  = W / 2;
    const cy  = H / 2;
    const maxLen = Math.sqrt(cx * cx + cy * cy) * 1.1;

    // Each line also stores where its star sits during the static phase.
    // starR is spread across the full visible field so stars look scattered
    // across the whole screen rather than clustered at centre.
    const LINE_COUNT = 220;
    const lines = Array.from({ length: LINE_COUNT }, () => ({
      angle:  Math.random() * Math.PI * 2,
      speed:  0.3 + Math.random() * 0.7,
      width:  0.4 + Math.random() * 1.6,
      color:  Math.random() > 0.55 ? '#ff7700' : '#ffffff',
      starR:  maxLen * (0.06 + Math.random() * 0.62), // depth of the star dot
      dim:    0.35 + Math.random() * 0.65,            // per-star brightness
    }));

    // Timeline
    // 0.00 – HYPER_START  static starfield (same dots that become the streaks)
    // HYPER_START – 1.00  hyperdrive (each dot elongates into its streak)
    const DURATION    = 2600;
    const HYPER_START = 0.30;
    const startTime   = performance.now();

    const easeInOutQuad = (t) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const tick = (now) => {
      const t = Math.min((now - startTime) / DURATION, 1);

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);

      // ── Static starfield ────────────────────────────────────────
      // Draw each line as a dot at its starR position.
      // Fade in quickly at the start; switch to streak phase at HYPER_START.
      if (t < HYPER_START) {
        const alpha = Math.min(t / 0.08, 1);

        lines.forEach((line) => {
          const x = cx + Math.cos(line.angle) * line.starR;
          const y = cy + Math.sin(line.angle) * line.starR;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0.5, line.width * 0.6), 0, Math.PI * 2);
          ctx.fillStyle   = line.color;
          ctx.globalAlpha = alpha * line.dim;
          ctx.shadowBlur  = 3;
          ctx.shadowColor = line.color;
          ctx.fill();
        });

        ctx.shadowBlur  = 0;
        ctx.globalAlpha = 1;
      }

      // ── Hyperdrive streaks ──────────────────────────────────────
      // At h=0 each line is zero-length (dot at starR) — seamless handoff.
      // Head races outward; tail sweeps toward centre, creating the streak.
      if (t >= HYPER_START) {
        const h = (t - HYPER_START) / (1 - HYPER_START); // 0 → 1

        const bloomT = h > 0.42 ? (h - 0.42) / 0.32 : 0;
        const flashT = h > 0.68 ? (h - 0.68) / 0.22 : 0;

        ctx.lineCap = 'round';

        lines.forEach((line) => {
          const progress = Math.min(h * line.speed * 1.4, 1);
          const eased    = easeInOutQuad(progress);

          // Head moves from star's position outward to the edge
          const headR = line.starR + (maxLen - line.starR) * eased;

          // Tail stays at starR then rushes toward centre, simulating the
          // star flying past the viewer
          const tailProgress = Math.min(h * line.speed * 2.5, 1);
          const tailR = Math.max(
            maxLen * 0.015,
            line.starR * (1 - easeInOutQuad(tailProgress))
          );

          const x1 = cx + Math.cos(line.angle) * tailR;
          const y1 = cy + Math.sin(line.angle) * tailR;
          const x2 = cx + Math.cos(line.angle) * headR;
          const y2 = cy + Math.sin(line.angle) * headR;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.lineWidth   = line.width * (1 + bloomT * 2.5);
          ctx.strokeStyle = line.color;
          ctx.shadowBlur  = 6 + bloomT * 24;
          ctx.shadowColor = line.color;
          ctx.globalAlpha = 0.55 + bloomT * 0.45;
          ctx.stroke();
        });

        ctx.lineCap     = 'butt';
        ctx.shadowBlur  = 0;
        ctx.globalAlpha = 1;

        if (bloomT > 0) {
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxLen * 1.1);
          grad.addColorStop(0,   `rgba(255,255,255,${bloomT * 0.85})`);
          grad.addColorStop(0.4, `rgba(0,212,255,${bloomT * 0.35})`);
          grad.addColorStop(0.8, `rgba(255,255,255,${bloomT * 0.25})`);
          grad.addColorStop(1,   `rgba(255,255,255,${bloomT * 0.15})`);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);
        }

        if (flashT > 0) {
          ctx.fillStyle = `rgba(255,255,255,${Math.min(flashT * 1.05, 0.97)})`;
          ctx.fillRect(0, 0, W, H);
        }
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onCompleteRef.current?.();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []); // empty deps — animation runs once on mount; onCompleteRef stays current

  return createPortal(
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        top:           0,
        left:          0,
        width:         '100vw',
        height:        '100vh',
        zIndex:        9999,
        pointerEvents: 'none',
      }}
    />,
    document.body
  );
}
