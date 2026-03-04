# Presentation Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A hidden slideshow triggered by Shift+P or clicking the pyramid asteroid, unlocked by typing "r'lyeh" into a codex input, with a lightspeed warp animation that reveals a 12-slide full-screen presentation covering 3 case studies.

**Architecture:** New standalone `PresentationMode` overlay (not reusing `PageOverlay`) plus a canvas-based `LightspeedTransition` warp effect. Slide content lives in a dedicated `presentationSlides.js` data file. `Galaxy.jsx` is modified to replace the alien text in the asteroid modal with the codex input and to handle Shift+P.

**Tech Stack:** React, Framer Motion (AnimatePresence for slide transitions), lucide-react icons, HTML5 Canvas (warp animation), createPortal (warp + presentation both rendered in document.body)

---

### Task 1: Presentation slide data

**Files:**
- Create: `src/data/presentationSlides.js`

**Step 1: Create the file with all 12 slide objects**

```js
// src/data/presentationSlides.js

export const SLIDES_PER_STUDY = 4;
export const TOTAL_STUDIES = 3;

export const presentationSlides = [
  // ── BANANA PHONE ─────────────────────────────────
  {
    id: 'bp-title',
    type: 'title',
    study: 1,
    accent: '#f5c842',
    title: 'BANANA PHONE',
    subtitle: 'Enterprise Communication Platform',
    company: 'Rocket Mortgage',
    role: 'Lead Product Designer',
    duration: '3–4 months to launch',
  },
  {
    id: 'bp-problem',
    type: 'problem',
    study: 1,
    accent: '#f5c842',
    title: 'BANANA PHONE',
    nugget: "The design had been fragmented across multiple PMs who each owned a separate channel — and rarely coordinated. I inherited this with a fixed deadline, sole-designer scope, and no room to start over.",
  },
  {
    id: 'bp-solution',
    type: 'solution',
    study: 1,
    accent: '#f5c842',
    title: 'BANANA PHONE',
    nugget: "Enterprise ≠ consumer. I brought the lead queue to a persistent surface and surfaced critical client context — address, timezone, loan stage — directly into the communication view. Unified call, text, and chat into one coherent interface.",
    image: '/images/case-studies/BananaPhone/current BP.png',
  },
  {
    id: 'bp-impact',
    type: 'impact',
    study: 1,
    accent: '#f5c842',
    title: 'BANANA PHONE',
    summary: 'Launched Q4 2024. The communication layer for thousands of bankers across Rocket Mortgage.',
    metrics: [
      { value: '650K+', label: 'Client Calls', sublabel: 'made in 2025' },
      { value: '15M+',  label: 'Texts Sent',   sublabel: 'since Nov 2025' },
      { value: '85%',   label: 'Easy to Use',  sublabel: 'peak satisfaction' },
    ],
  },

  // ── AI TEXTING ────────────────────────────────────
  {
    id: 'ai-title',
    type: 'title',
    study: 2,
    accent: '#ec4899',
    title: 'AI TEXTING',
    subtitle: 'Enterprise AI · Banana Phone',
    company: 'Rocket Mortgage',
    role: 'Lead Product Designer',
    duration: 'April – June 2025',
  },
  {
    id: 'ai-problem',
    type: 'problem',
    study: 2,
    accent: '#ec4899',
    title: 'AI TEXTING',
    nugget: "A phone number migration made mass texts look like spam overnight. Bankers were left writing every client message by hand — one at a time, at scale. That's not a slowdown. It's a breakdown.",
  },
  {
    id: 'ai-solution',
    type: 'solution',
    study: 2,
    accent: '#ec4899',
    title: 'AI TEXTING',
    nugget: "A drafting panel inside Banana Phone. Select a category — first-time hello, rate update, follow-up after silence — and the AI drafts the right message instantly. Send as-is or edit.",
    image: '/images/case-studies/AItexting/AI text 1.png',
  },
  {
    id: 'ai-impact',
    type: 'impact',
    study: 2,
    accent: '#ec4899',
    title: 'AI TEXTING',
    summary: "Launched June 2025. Rocket Mortgage's first major AI integration into the banker workflow.",
    metrics: [
      { value: '1.8M', label: 'AI Texts',        sublabel: 'first 10 weeks' },
      { value: '$75M', label: 'Closing Volume',   sublabel: 'monthly increase' },
      { value: '56%',  label: 'AI-Generated',     sublabel: 'of all outbound texts' },
    ],
  },

  // ── MYROCKET DASHBOARD ────────────────────────────
  {
    id: 'mr-title',
    type: 'title',
    study: 3,
    accent: '#22d3ee',
    title: 'MYROCKET DASHBOARD',
    subtitle: 'Consumer Product Design',
    company: 'Rocket Mortgage',
    role: 'Design Lead, Consumer Experience',
    duration: '6 months',
  },
  {
    id: 'mr-problem',
    type: 'problem',
    study: 3,
    accent: '#22d3ee',
    title: 'MYROCKET DASHBOARD',
    nugget: "Users were making major financial decisions without a coherent picture of their own finances. Two internal business units were competing for the same page — with conflicting priorities.",
  },
  {
    id: 'mr-solution',
    type: 'solution',
    study: 3,
    accent: '#22d3ee',
    title: 'MYROCKET DASHBOARD',
    nugget: "An IA that flexes across radically different user states. A locked state pattern — borrowed from gaming — showed unactivated features as aspirational, not absent. I defended it in a financial context. It launched as the core onboarding mechanism.",
    image: '/images/case-studies/myrocket/lockedstate.png',
  },
  {
    id: 'mr-impact',
    type: 'impact',
    study: 3,
    accent: '#22d3ee',
    title: 'MYROCKET DASHBOARD',
    summary: 'Launched December 2022 with 500K+ monthly active users from day one.',
    metrics: [
      { value: '2×',    label: 'Monthly Visits', sublabel: 'increase at launch' },
      { value: '500K+', label: 'Active Users',    sublabel: 'at launch' },
      { value: '61%',   label: 'CSAT Score',      sublabel: 'growing monthly' },
    ],
  },
];
```

**Step 2: Verify**

Run: `npm run dev`
Check: no import errors. Open browser console — no red errors.

**Step 3: Commit**

```bash
git add src/data/presentationSlides.js
git commit -m "feat: add presentation slide content data"
```

---

### Task 2: LightspeedTransition component

**Files:**
- Create: `src/components/UI/LightspeedTransition.jsx`

**Step 1: Create the component**

```jsx
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
```

**Step 2: Smoke-test it temporarily**

To verify the warp works, temporarily add `<LightspeedTransition onComplete={() => console.log('done')} />` inside `App.jsx`. Run `npm run dev` — you should see the warp animation on load. Remove after confirming.

**Step 3: Commit**

```bash
git add src/components/UI/LightspeedTransition.jsx
git commit -m "feat: add lightspeed warp canvas transition"
```

---

### Task 3: PresentationMode component

**Files:**
- Create: `src/components/UI/PresentationMode.jsx`
- Create: `src/components/UI/PresentationMode.css`

**Step 1: Create PresentationMode.css**

```css
/* src/components/UI/PresentationMode.css */

.pm-overlay {
  position: fixed;
  inset: 0;
  z-index: 8000;
  background: rgba(4, 2, 10, 0.98);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  box-sizing: border-box;
  overflow: hidden;
}

/* ── Progress ─────────────────────── */
.pm-progress {
  position: absolute;
  top: 2rem;
  left: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pm-study-dots,
.pm-slide-dots {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.pm-study-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  transition: background 0.3s ease;
}

.pm-slide-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  transition: background 0.3s ease;
}

/* ── Close button (reuses .close-button from PageOverlay) ─ */
.pm-close {
  position: absolute;
  top: 2rem;
  right: 2rem;
}

/* ── Stage ────────────────────────── */
.pm-stage {
  width: 100%;
  max-width: 860px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.pm-slide-wrapper {
  width: 100%;
}

/* ── Shared slide ─────────────────── */
.pm-slide {
  padding: 0.5rem 0;
}

.pm-slide-label {
  font-family: monospace;
  font-size: 0.65rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
}

.pm-divider {
  height: 1px;
  width: 60px;
  margin-bottom: 2rem;
  opacity: 0.5;
}

.pm-nugget {
  font-size: 1.35rem;
  font-weight: 300;
  line-height: 1.75;
  color: rgba(220, 210, 240, 0.95);
  margin: 0;
  max-width: 740px;
}

/* ── Title slide ──────────────────── */
.pm-slide--title {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.pm-study-badge {
  font-family: monospace;
  font-size: 0.7rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  opacity: 0.8;
}

.pm-title {
  font-size: clamp(2rem, 6vw, 3.75rem);
  font-family: monospace;
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
  margin: 0;
  line-height: 1;
}

.pm-title-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
  color: rgba(200, 190, 220, 0.65);
  flex-wrap: wrap;
  justify-content: center;
}

.pm-meta-dot {
  opacity: 0.35;
}

/* ── Solution slide ───────────────── */
.pm-solution-body {
  display: flex;
  gap: 2.5rem;
  align-items: flex-start;
}

.pm-solution-image {
  flex: 0 0 44%;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.pm-solution-image img {
  width: 100%;
  height: auto;
  display: block;
}

.pm-solution-body .pm-nugget {
  flex: 1;
  font-size: 1.1rem;
}

/* ── Impact slide ─────────────────── */
.pm-metrics {
  display: flex;
  gap: 1.25rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.pm-metric-card {
  flex: 1;
  min-width: 150px;
  padding: 1.25rem 1.5rem;
  border: 1px solid;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.pm-metric-value {
  font-family: monospace;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.pm-metric-label {
  font-size: 0.85rem;
  color: rgba(220, 210, 240, 0.8);
  font-weight: 500;
}

.pm-metric-sublabel {
  font-size: 0.65rem;
  color: rgba(200, 180, 220, 0.45);
  font-family: monospace;
  letter-spacing: 0.5px;
}

.pm-summary {
  font-size: 0.9rem;
  color: rgba(200, 180, 220, 0.6);
  margin: 0;
  line-height: 1.7;
}

/* ── Navigation ───────────────────── */
.pm-nav {
  position: absolute;
  bottom: 2rem;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 2rem;
  pointer-events: none;
}

.pm-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: rgba(220, 210, 240, 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
  pointer-events: auto;
}

.pm-nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.pm-nav-btn:disabled {
  cursor: default;
  pointer-events: none;
}

/* ── Codex input (asteroid modal) ─── */
.asteroid-codex-body {
  padding: 1rem;
}

.asteroid-codex-label {
  display: block;
  font-family: monospace;
  font-size: 0.55rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(0, 255, 106, 0.6);
  margin-bottom: 0.5rem;
}

.asteroid-codex-input {
  width: 100%;
  box-sizing: border-box;
  background: rgba(0, 212, 255, 0.04);
  border: 1px solid rgba(0, 255, 106, 0.4);
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  font-family: monospace;
  font-size: 0.85rem;
  color: rgba(200, 180, 220, 1);
  letter-spacing: 1px;
  outline: none;
  transition: border-color 0.2s ease;
}

.asteroid-codex-input:focus {
  border-color: rgba(0, 255, 106, 0.8);
}

.asteroid-codex-input.codex-error {
  border-color: rgba(255, 80, 80, 0.8);
  animation: codexShake 0.35s ease;
}

@keyframes codexShake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
}

/* ── Mobile ───────────────────────── */
@media (max-width: 768px) {
  .pm-overlay {
    padding: 1.25rem;
  }

  .pm-title {
    font-size: clamp(1.5rem, 8vw, 2.5rem);
  }

  .pm-nugget {
    font-size: 1.05rem;
  }

  .pm-solution-body {
    flex-direction: column;
    gap: 1.5rem;
  }

  .pm-solution-image {
    flex: none;
    width: 100%;
  }

  .pm-metrics {
    gap: 0.75rem;
  }

  .pm-metric-card {
    min-width: 120px;
    padding: 1rem;
  }

  .pm-metric-value {
    font-size: 1.5rem;
  }
}
```

**Step 2: Create PresentationMode.jsx**

```jsx
// src/components/UI/PresentationMode.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { presentationSlides, SLIDES_PER_STUDY } from '../../data/presentationSlides';
import './PresentationMode.css';

// ── Slide sub-components ──────────────────────────────────────

function SlideTitle({ slide }) {
  return (
    <div className="pm-slide pm-slide--title">
      <div className="pm-study-badge" style={{ color: slide.accent }}>
        {slide.subtitle}
      </div>
      <h1 className="pm-title" style={{ color: slide.accent }}>
        {slide.title}
      </h1>
      <div className="pm-title-meta">
        <span>{slide.company}</span>
        <span className="pm-meta-dot">·</span>
        <span>{slide.role}</span>
        <span className="pm-meta-dot">·</span>
        <span>{slide.duration}</span>
      </div>
    </div>
  );
}

function SlideProblem({ slide }) {
  return (
    <div className="pm-slide pm-slide--problem">
      <div className="pm-slide-label" style={{ color: slide.accent }}>The Problem</div>
      <div className="pm-divider" style={{ background: slide.accent }} />
      <p className="pm-nugget">{slide.nugget}</p>
    </div>
  );
}

function SlideSolution({ slide }) {
  return (
    <div className="pm-slide pm-slide--solution">
      <div className="pm-slide-label" style={{ color: slide.accent }}>The Solution</div>
      <div className="pm-divider" style={{ background: slide.accent }} />
      <div className="pm-solution-body">
        {slide.image && (
          <div className="pm-solution-image">
            <img src={slide.image} alt="Solution" />
          </div>
        )}
        <p className="pm-nugget">{slide.nugget}</p>
      </div>
    </div>
  );
}

function SlideImpact({ slide }) {
  return (
    <div className="pm-slide pm-slide--impact">
      <div className="pm-slide-label" style={{ color: slide.accent }}>The Impact</div>
      <div className="pm-divider" style={{ background: slide.accent }} />
      <div className="pm-metrics">
        {slide.metrics.map((m, i) => (
          <div
            key={i}
            className="pm-metric-card"
            style={{ borderColor: `${slide.accent}40` }}
          >
            <span className="pm-metric-value" style={{ color: slide.accent }}>
              {m.value}
            </span>
            <span className="pm-metric-label">{m.label}</span>
            <span className="pm-metric-sublabel">{m.sublabel}</span>
          </div>
        ))}
      </div>
      <p className="pm-summary">{slide.summary}</p>
    </div>
  );
}

const SLIDE_COMPONENTS = {
  title:    SlideTitle,
  problem:  SlideProblem,
  solution: SlideSolution,
  impact:   SlideImpact,
};

// ── Slide transition variants ─────────────────────────────────

const slideVariants = {
  enter:  (dir) => ({ x: dir > 0 ?  60 : -60, opacity: 0 }),
  center:          { x: 0, opacity: 1 },
  exit:   (dir) => ({ x: dir > 0 ? -60 :  60, opacity: 0 }),
};

// ── Main component ────────────────────────────────────────────

export default function PresentationMode({ isOpen, onClose }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [direction,  setDirection]  = useState(1);
  const total = presentationSlides.length;
  const slide = presentationSlides[slideIndex];

  // Reset to first slide whenever opened
  useEffect(() => {
    if (isOpen) setSlideIndex(0);
  }, [isOpen]);

  const goNext = useCallback(() => {
    if (slideIndex < total - 1) {
      setDirection(1);
      setSlideIndex((i) => i + 1);
    }
  }, [slideIndex, total]);

  const goPrev = useCallback(() => {
    if (slideIndex > 0) {
      setDirection(-1);
      setSlideIndex((i) => i - 1);
    }
  }, [slideIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft')  goPrev();
      if (e.key === 'Escape')     onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, goNext, goPrev, onClose]);

  if (!isOpen) return null;

  const SlideComponent = SLIDE_COMPONENTS[slide.type];
  const currentStudy   = slide.study;                   // 1 | 2 | 3
  const slideInStudy   = slideIndex % SLIDES_PER_STUDY; // 0–3

  return createPortal(
    <motion.div
      className="pm-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Progress dots — top left */}
      <div className="pm-progress">
        <div className="pm-study-dots">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className="pm-study-dot"
              style={{ background: s === currentStudy ? slide.accent : undefined }}
            />
          ))}
        </div>
        <div className="pm-slide-dots">
          {Array.from({ length: SLIDES_PER_STUDY }, (_, i) => (
            <span
              key={i}
              className="pm-slide-dot"
              style={{ background: i === slideInStudy ? slide.accent : undefined }}
            />
          ))}
        </div>
      </div>

      {/* Close — top right (reuses .close-button from PageOverlay styles) */}
      <button className="close-button pm-close" onClick={onClose} aria-label="Close presentation">
        <X size={24} />
      </button>

      {/* Slide stage */}
      <div className="pm-stage">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={slideIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
            className="pm-slide-wrapper"
          >
            <SlideComponent slide={slide} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Arrow navigation — bottom left/right */}
      <div className="pm-nav">
        <button
          className="pm-nav-btn"
          onClick={goPrev}
          disabled={slideIndex === 0}
          style={{ opacity: slideIndex === 0 ? 0 : 1 }}
          aria-label="Previous slide"
        >
          <ArrowLeft size={20} />
        </button>
        <button
          className="pm-nav-btn"
          onClick={goNext}
          disabled={slideIndex === total - 1}
          style={{ opacity: slideIndex === total - 1 ? 0 : 1 }}
          aria-label="Next slide"
        >
          <ArrowRight size={20} />
        </button>
      </div>
    </motion.div>,
    document.body
  );
}
```

**Step 3: Smoke-test temporarily**

In `App.jsx`, temporarily add `<PresentationMode isOpen={true} onClose={() => {}} />`. Run `npm run dev`. Verify:
- [ ] Full-screen dark overlay appears
- [ ] "BANANA PHONE" title slide renders with gold accent
- [ ] Progress dots visible top-left
- [ ] Close button top-right
- [ ] Arrow keys → / ← move through slides
- [ ] Slide 2 shows problem text
- [ ] Slide 3 shows image + solution text side by side
- [ ] Slide 4 shows 3 metric cards
- [ ] Slide 5 jumps to "AI TEXTING" in pink

Remove the temporary `isOpen={true}` after confirming.

**Step 4: Commit**

```bash
git add src/components/UI/PresentationMode.jsx src/components/UI/PresentationMode.css
git commit -m "feat: add PresentationMode slideshow overlay"
```

---

### Task 4: Wire up Galaxy.jsx

**Files:**
- Modify: `src/components/Galaxy/Galaxy.jsx` (lines ~135–177, ~464–486)

**Context:** The asteroid modal currently stores the alien text string in `asteroidMessage` state. We need to:
1. Replace `asteroidMessage` (string) with `asteroidModalOpen` (boolean)
2. Add `codexInput` + `codexError` states for the input
3. Add `warpActive` + `presentationOpen` states
4. Replace the modal body `<pre>` with the codex input
5. Add `handleCodexSubmit` — checks for "r'lyeh" → triggers warp → opens presentation
6. Add Shift+P `keydown` listener
7. Import and render `LightspeedTransition` and `PresentationMode`

**Step 1: Add new state variables**

Find the line:
```js
const [asteroidMessage, setAsteroidMessage] = useState(null);
```
Replace with:
```js
const [asteroidModalOpen,  setAsteroidModalOpen]  = useState(false);
const [codexInput,         setCodexInput]         = useState('');
const [codexError,         setCodexError]         = useState(false);
const [warpActive,         setWarpActive]          = useState(false);
const [presentationOpen,   setPresentationOpen]   = useState(false);
```

**Step 2: Update handleAsteroidClick**

Find:
```js
const handleAsteroidClick = useCallback(() => {
  setAsteroidMessage(generateAlienText());
}, []);
```
Replace with:
```js
const handleAsteroidClick = useCallback(() => {
  setAsteroidModalOpen(true);
  setCodexInput('');
  setCodexError(false);
}, []);
```

**Step 3: Add handleCodexSubmit and handleCodexKeyDown**

Add directly after `handleAsteroidClick`:
```js
const handleCodexSubmit = useCallback(() => {
  if (codexInput.trim().toLowerCase() === "r'lyeh") {
    setAsteroidModalOpen(false);
    setCodexInput('');
    setWarpActive(true);
  } else {
    setCodexError(true);
    setTimeout(() => setCodexError(false), 400);
  }
}, [codexInput]);

const handleCodexKeyDown = useCallback((e) => {
  if (e.key === 'Enter') handleCodexSubmit();
}, [handleCodexSubmit]);
```

**Step 4: Add Shift+P listener**

Add inside the Galaxy component, after the existing useEffect blocks:
```js
// Shift+P — open codex modal
useEffect(() => {
  const handler = (e) => {
    if (e.shiftKey && e.key === 'P') {
      setAsteroidModalOpen(true);
      setCodexInput('');
      setCodexError(false);
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

**Step 5: Add imports at the top of Galaxy.jsx**

Find the existing imports block and add:
```js
import LightspeedTransition from '../UI/LightspeedTransition';
import PresentationMode from '../UI/PresentationMode';
```

**Step 6: Update the asteroid modal JSX**

Find:
```jsx
{/* Asteroid alien transmission message */}
<AnimatePresence>
  {asteroidMessage && (
    <motion.div
      key="asteroid-msg"
      ...
      className="asteroid-message"
    >
      <div className="asteroid-message-header">
        <span className="asteroid-message-label">SIGNAL INTERCEPTED</span>
        <button
          className="asteroid-message-close"
          onClick={() => setAsteroidMessage(null)}
          aria-label="Close"
        ><X size={16} /></button>
      </div>
      <pre className="asteroid-message-body">{asteroidMessage}</pre>
    </motion.div>
  )}
</AnimatePresence>
```

Replace with:
```jsx
{/* Asteroid codex modal */}
<AnimatePresence>
  {asteroidModalOpen && (
    <motion.div
      key="asteroid-msg"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="asteroid-message"
    >
      <div className="asteroid-message-header">
        <span className="asteroid-message-label">SIGNAL INTERCEPTED</span>
        <button
          className="asteroid-message-close"
          onClick={() => setAsteroidModalOpen(false)}
          aria-label="Close"
        ><X size={16} /></button>
      </div>
      <div className="asteroid-codex-body">
        <label className="asteroid-codex-label" htmlFor="codex-input">
          Enter the cosmic codex
        </label>
        <input
          id="codex-input"
          className={`asteroid-codex-input${codexError ? ' codex-error' : ''}`}
          type="text"
          value={codexInput}
          onChange={(e) => setCodexInput(e.target.value)}
          onKeyDown={handleCodexKeyDown}
          autoComplete="off"
          autoFocus
          spellCheck={false}
        />
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

**Step 7: Render LightspeedTransition and PresentationMode**

At the bottom of the Galaxy component's return (just before the final closing `</div>`), add:
```jsx
{/* Lightspeed warp — plays before presentation opens */}
{warpActive && (
  <LightspeedTransition
    onComplete={() => {
      setWarpActive(false);
      setPresentationOpen(true);
    }}
  />
)}

{/* Presentation mode */}
<AnimatePresence>
  {presentationOpen && (
    <PresentationMode
      isOpen={presentationOpen}
      onClose={() => setPresentationOpen(false)}
    />
  )}
</AnimatePresence>
```

**Step 8: Verify end-to-end**

Run: `npm run dev`

Test path A (asteroid click):
- [ ] Click the pyramid asteroid — codex modal appears at bottom center
- [ ] Label "ENTER THE COSMIC CODEX" visible
- [ ] Type wrong text → Enter → input shakes red, no navigation
- [ ] Type `r'lyeh` → Enter → modal closes → warp animation plays → presentation opens
- [ ] Close button (×) closes presentation
- [ ] ESC key closes presentation

Test path B (Shift+P):
- [ ] Press Shift+P from any state → codex modal opens
- [ ] Same flow as above

Test navigation:
- [ ] Arrow keys ← / → move through 12 slides
- [ ] Progress dots update correctly (study dots + slide dots)
- [ ] Study 1 = gold, Study 2 = pink, Study 3 cyan
- [ ] Back button hidden on slide 1, forward button hidden on slide 12
- [ ] Solution slides show image left + text right

**Step 9: Commit**

```bash
git add src/components/Galaxy/Galaxy.jsx
git commit -m "feat: wire presentation mode into Galaxy — codex input, warp, slideshow"
```

---

## Done

All 4 tasks complete. The feature is fully wired:
- Shift+P or asteroid click → codex modal
- `r'lyeh` → lightspeed warp → full presentation
- 12 slides across 3 case studies with navigation
- Close button + ESC to exit
