// src/components/UI/PresentationMode.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
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
            <img src={slide.image} alt={`${slide.title} solution`} />
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
  const closeButtonRef = useRef(null);
  const total = presentationSlides.length;
  const slide = presentationSlides[slideIndex];

  // Reset to first slide whenever opened
  useEffect(() => {
    if (isOpen) setSlideIndex(0);
  }, [isOpen]);

  // Focus close button when overlay opens for accessibility
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
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
      role="dialog"
      aria-modal="true"
      aria-label="Portfolio Presentation"
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
      <button ref={closeButtonRef} className="close-button pm-close" onClick={onClose} aria-label="Close presentation">
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
          style={{ opacity: slideIndex === 0 ? 0 : 1, pointerEvents: slideIndex === 0 ? 'none' : 'auto' }}
          aria-label="Previous slide"
        >
          <ArrowLeft size={18} />
          Prev
        </button>
        <button
          className="pm-nav-btn"
          onClick={goNext}
          disabled={slideIndex === total - 1}
          style={{ opacity: slideIndex === total - 1 ? 0 : 1, pointerEvents: slideIndex === total - 1 ? 'none' : 'auto' }}
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
