// src/components/UI/LightspeedTransition.jsx
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function LightspeedTransition({ onComplete }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const W   = (canvas.width  = window.innerWidth);
    const H   = (canvas.height = window.innerHeight);
    const cx  = W / 2;
    const cy  = H / 2;
    const maxLen = Math.sqrt(cx * cx + cy * cy) * 1.1;

    const LINE_COUNT = 220;
    const lines = Array.from({ length: LINE_COUNT }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
      width: 0.4 + Math.random() * 1.6,
      color: Math.random() > 0.55 ? '#00d4ff' : '#ffffff',
    }));

    const DURATION = 1500;
    const startTime = performance.now();

    const easeInOutQuad = (t) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const tick = (now) => {
      const t = Math.min((now - startTime) / DURATION, 1);

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);

      const lineT  = Math.min(t / 0.72, 1);
      const bloomT = t > 0.58 ? (t - 0.58) / 0.3  : 0;
      const flashT = t > 0.88 ? (t - 0.88) / 0.12 : 0;

      lines.forEach((line) => {
        const progress = Math.min(lineT * line.speed * 1.4, 1);
        const eased    = easeInOutQuad(progress);
        const startR   = maxLen * 0.015;
        const endR     = maxLen * eased;

        const x1 = cx + Math.cos(line.angle) * startR;
        const y1 = cy + Math.sin(line.angle) * startR;
        const x2 = cx + Math.cos(line.angle) * endR;
        const y2 = cy + Math.sin(line.angle) * endR;

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

      ctx.shadowBlur  = 0;
      ctx.globalAlpha = 1;

      if (bloomT > 0) {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxLen * 0.85);
        grad.addColorStop(0,   `rgba(255,255,255,${bloomT * 0.65})`);
        grad.addColorStop(0.4, `rgba(0,212,255,${bloomT * 0.2})`);
        grad.addColorStop(1,   'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      if (flashT > 0) {
        ctx.fillStyle = `rgba(255,255,255,${flashT})`;
        ctx.fillRect(0, 0, W, H);
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onComplete?.();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [onComplete]);

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
