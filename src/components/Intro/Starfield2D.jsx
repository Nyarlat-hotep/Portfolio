import { useEffect, useRef } from 'react';

// Lightweight 2D starfield for the document-style pages: three depth layers
// that drift slowly and parallax against the pointer, plus the occasional
// shooting star. Costs a fraction of the WebGL scene so first paint is instant.
const LAYERS = [
  { density: 1 / 2600, size: [0.3, 0.8], speed: 0.004, parallax: 6,  alpha: [0.25, 0.6] },
  { density: 1 / 9000, size: [0.6, 1.2], speed: 0.009, parallax: 14, alpha: [0.4, 0.85] },
  { density: 1 / 30000, size: [1.0, 1.8], speed: 0.016, parallax: 28, alpha: [0.6, 1] },
];
const WARM = ['255,255,255', '255,240,220', '255,200,140', '255,170,90'];
const rand = (a, b) => a + Math.random() * (b - a);

export default function Starfield2D({ className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, stars = [], raf = 0, last = performance.now();
    let shooting = null, nextShoot = performance.now() + rand(3000, 7000);
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };

    function build() {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = LAYERS.flatMap((L, li) =>
        Array.from({ length: Math.round(W * H * L.density) }, () => ({
          li,
          x: Math.random() * W,
          y: Math.random() * H,
          r: rand(...L.size),
          a: rand(...L.alpha),
          tw: rand(0.4, 1.6),
          ph: Math.random() * Math.PI * 2,
          c: WARM[Math.random() < 0.7 ? 0 : 1 + Math.floor(Math.random() * 3)],
        }))
      );
    }

    function draw(now) {
      const dt = Math.min(now - last, 50);
      last = now;
      ptr.x += (ptr.tx - ptr.x) * 0.04;
      ptr.y += (ptr.ty - ptr.y) * 0.04;
      ctx.clearRect(0, 0, W, H);

      for (const s of stars) {
        const L = LAYERS[s.li];
        if (!reduced) {
          s.x -= L.speed * dt;
          if (s.x < -4) s.x += W + 8;
        }
        const x = s.x + ptr.x * L.parallax;
        const y = s.y + ptr.y * L.parallax;
        const tw = reduced ? 1 : 0.65 + 0.35 * Math.sin(now * 0.001 * s.tw + s.ph);
        ctx.globalAlpha = s.a * tw;
        ctx.fillStyle = `rgb(${s.c})`;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.li === 2) {
          ctx.globalAlpha = s.a * tw * 0.15;
          ctx.beginPath();
          ctx.arc(x, y, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!reduced) {
        if (!shooting && now > nextShoot) {
          const fromLeft = Math.random() < 0.5;
          shooting = {
            x: fromLeft ? rand(0, W * 0.4) : rand(W * 0.6, W),
            y: rand(0, H * 0.35),
            vx: (fromLeft ? 1 : -1) * rand(0.5, 0.8),
            vy: rand(0.18, 0.32),
            life: 0,
          };
        }
        if (shooting) {
          const s = shooting;
          s.life += dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          const t = s.life / 900;
          const fade = t < 0.2 ? t / 0.2 : Math.max(0, 1 - (t - 0.2) / 0.8);
          const len = 90;
          const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * len, s.y - s.vy * len);
          g.addColorStop(0, `rgba(255,220,180,${0.9 * fade})`);
          g.addColorStop(1, 'rgba(255,140,40,0)');
          ctx.globalAlpha = 1;
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - s.vx * len, s.y - s.vy * len);
          ctx.stroke();
          if (t >= 1) { shooting = null; nextShoot = now + rand(5000, 11000); }
        }
      }
      ctx.globalAlpha = 1;
    }

    function loop(now) {
      draw(now);
      raf = requestAnimationFrame(loop);
    }

    const onMove = (e) => {
      ptr.tx = e.clientX / window.innerWidth - 0.5;
      ptr.ty = e.clientY / window.innerHeight - 0.5;
    };
    const onResize = () => { build(); if (reduced) draw(performance.now()); };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) { last = performance.now(); raf = requestAnimationFrame(loop); }
    };

    build();
    if (reduced) draw(performance.now());
    else raf = requestAnimationFrame(loop);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
