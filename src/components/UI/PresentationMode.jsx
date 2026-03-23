// src/components/UI/PresentationMode.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { presentationSlides, STUDY_SLIDE_COUNTS } from '../../data/presentationSlides';
import FragmentedOrbits   from './FragmentedOrbits';
import ThroughputCollapse from './ThroughputCollapse';
import InterferenceWaves  from './InterferenceWaves';
import './PresentationMode.css';

// Map study number → problem visualisation component
const PROBLEM_VIZ = {
  1: FragmentedOrbits,    // Banana Phone
  2: ThroughputCollapse,  // AI Texting
  3: InterferenceWaves,   // MyRocket
};

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
  const VizComponent = PROBLEM_VIZ[slide.study];
  return (
    <div className="pm-slide pm-slide--text pm-slide--problem">
      <div className="pm-problem-body">
        <div className="pm-problem-text">
          <div className="pm-slide-label" style={{ color: slide.accent }}>The Problem</div>
          <div className="pm-divider" style={{ background: slide.accent }} />
          <p className="pm-nugget">{slide.nugget}</p>
        </div>
        {VizComponent && (
          <div className="pm-problem-viz">
            <VizComponent color={slide.accent} />
          </div>
        )}
      </div>
    </div>
  );
}

function SlideSolution({ slide }) {
  return (
    <div className="pm-slide pm-slide--solution">
      <div className="pm-slide-label" style={{ color: slide.accent }}>The Solution</div>
      <div className="pm-divider" style={{ background: slide.accent }} />
      <div className="pm-solution-body">
        {slide.video ? (
          <div className="pm-solution-image">
            <video src={slide.video} autoPlay loop muted playsInline />
          </div>
        ) : slide.image ? (
          <div className="pm-solution-image">
            <img src={slide.image} alt={`${slide.title} solution`} />
          </div>
        ) : null}
        <p className="pm-nugget">{slide.nugget}</p>
      </div>
    </div>
  );
}

function SlideImpact({ slide }) {
  return (
    <div className="pm-slide pm-slide--text pm-slide--impact">
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

function SlideExplore({ slide }) {
  const isSide = slide.layout === 'side';
  return (
    <div className="pm-slide pm-slide--explore">
      <div className="pm-slide-label" style={{ color: slide.accent }}>{slide.label || 'The Process'}</div>
      <div className="pm-divider" style={{ background: slide.accent }} />
      {isSide ? (
        <div className="pm-solution-body">
          {slide.images?.[0] && (
            <div className="pm-solution-image">
              <img src={slide.images[0]} alt={`${slide.title} exploration`} />
            </div>
          )}
          <p className="pm-nugget">{slide.nugget}</p>
        </div>
      ) : (
        <div className="pm-explore-body">
          {slide.images?.length > 0 && (
            <div className="pm-explore-images">
              {slide.images.map((src, i) => (
                <div key={i} className="pm-explore-image">
                  <img src={src} alt={`${slide.title} exploration ${i + 1}`} />
                </div>
              ))}
            </div>
          )}
          <p className="pm-nugget">{slide.nugget}</p>
        </div>
      )}
    </div>
  );
}

const SLIDE_COMPONENTS = {
  title:    SlideTitle,
  problem:  SlideProblem,
  explore:  SlideExplore,
  solution: SlideSolution,
  impact:   SlideImpact,
};

// Reference width the slides are designed at — used for proportional scaling
const SLIDE_BASE_W = 1100;

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
  const [navVisible, setNavVisible]  = useState(false);
  const [slideScale,  setSlideScale]  = useState(1);
  const closeButtonRef = useRef(null);
  const stageRef       = useRef(null);
  const total = presentationSlides.length;
  const slide = presentationSlides[slideIndex];

  const handleMouseMove = useCallback((e) => {
    if (e.clientY >= window.innerHeight * 0.80) {
      setNavVisible(true);
    } else {
      setNavVisible(false);
    }
  }, []);

  // Reset to first slide whenever opened; clear nav on close
  useEffect(() => {
    if (isOpen) {
      setSlideIndex(0);
    } else {
      setNavVisible(false);
    }
  }, [isOpen]);

  // Proportional scale: recompute whenever the overlay opens or viewport resizes
  useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      if (!stageRef.current) return;
      const scale = Math.min(1, (stageRef.current.clientWidth - 64) / SLIDE_BASE_W);
      setSlideScale(Math.max(0.3, scale));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isOpen]);

  // Focus close button when overlay opens (rAF ensures portal DOM is painted)
  useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keep a ref so goNext/goPrev closures never stale-close over slideIndex
  const slideIndexRef = useRef(slideIndex);
  useEffect(() => { slideIndexRef.current = slideIndex; }, [slideIndex]);

  const goNext = useCallback(() => {
    if (slideIndexRef.current < total - 1) {
      setDirection(1);
      setSlideIndex((i) => i + 1);
    }
  }, [total]);

  const goPrev = useCallback(() => {
    if (slideIndexRef.current > 0) {
      setDirection(-1);
      setSlideIndex((i) => i - 1);
    }
  }, []);

  // Keyboard navigation — handler is stable; no re-register on every slide change
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

  const SlideComponent    = SLIDE_COMPONENTS[slide.type];
  const currentStudy      = slide.study;                   // 1 | 2 | 3
  const studySlideCount   = STUDY_SLIDE_COUNTS[currentStudy - 1];
  const studyStartIndex   = STUDY_SLIDE_COUNTS.slice(0, currentStudy - 1).reduce((a, b) => a + b, 0);
  const slideInStudy      = slideIndex - studyStartIndex;

  return createPortal(
    <motion.div
      className="pm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Portfolio Presentation"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onMouseMove={handleMouseMove}
    >
      {/* ── Top bar: progress dots + close ── */}
      <div className="pm-header">
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
            {Array.from({ length: studySlideCount }, (_, i) => (
              <span
                key={i}
                className="pm-slide-dot"
                style={{ background: i === slideInStudy ? slide.accent : undefined }}
              />
            ))}
          </div>
        </div>
        <button ref={closeButtonRef} className="close-button pm-close" onClick={onClose} aria-label="Close presentation">
          <X size={20} />
        </button>
      </div>

      {/* ── Content stage: fills remaining space, scales content proportionally ── */}
      <div className="pm-stage" ref={stageRef}>
        <div
          className="pm-slide-scaler"
          style={{ transform: `scale(${slideScale})` }}
        >
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
      </div>

      {/* ── Arrow navigation — revealed on hover near bottom ── */}
      <div className={`pm-nav${navVisible ? ' pm-nav--visible' : ''}`}>
        <button
          className="pm-nav-btn"
          onClick={goPrev}
          disabled={slideIndex === 0}
          style={{ opacity: slideIndex === 0 ? 0 : 1 }}
          aria-label="Previous slide"
        >
          <ArrowLeft size={18} />
          Prev
        </button>
        <button
          className="pm-nav-btn"
          onClick={goNext}
          disabled={slideIndex === total - 1}
          style={{ opacity: slideIndex === total - 1 ? 0 : 1 }}
          aria-label="Next slide"
        >
          Next
          <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>,
    document.body
  );
}
