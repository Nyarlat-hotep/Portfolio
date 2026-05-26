import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import './NarrationHud.css';

// Bottom narration strip — narration text, step dots, prev/next/restart controls.
// Reused across every prototype so the demo cadence feels consistent.
export default function NarrationHud({
  narration,
  index,
  total,
  isFirst,
  isLast,
  onPrev,
  onNext,
  onRestart,
  accent = '#f5c842',
}) {
  return (
    <div className="hud" style={{ '--hud-accent': accent }}>
      <div className="hud-narration">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            {narration}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="hud-controls">
        <button
          className="hud-btn"
          onClick={onPrev}
          disabled={isFirst}
          aria-label="Previous step"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="hud-dots">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className="hud-dot"
              style={{ background: i === index ? 'var(--hud-accent)' : undefined }}
            />
          ))}
        </div>

        <button
          className="hud-btn"
          onClick={onNext}
          disabled={isLast}
          aria-label="Next step"
        >
          <ArrowRight size={16} />
        </button>

        {isLast && (
          <button
            className="hud-btn hud-btn--restart"
            onClick={onRestart}
            aria-label="Restart demo"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
