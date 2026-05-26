import { Suspense, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { PROTOTYPES } from '../index.js';
import { useScriptedFlow } from './useScriptedFlow.js';
import NarrationHud from './NarrationHud.jsx';
import './DemoShell.css';

// Fullscreen portal wrapper used when a prototype is launched from a
// case study page CTA. Supports both scripted (steps array + narration HUD
// + arrow-key advance) and free-click (steps undefined) prototypes.
export default function DemoShell({ prototypeId, isOpen, onClose }) {
  const proto = PROTOTYPES[prototypeId];
  const flow = useScriptedFlow(proto?.steps || []);
  const isScripted = (proto?.steps?.length || 0) > 0;

  // Reset scripted flow on every open
  useEffect(() => {
    if (isOpen && isScripted) flow.goTo(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isScripted]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  const handleKey = useCallback((e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); onClose?.(); return; }
    // Only intercept arrows / space for scripted demos
    if (!isScripted) return;
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); flow.next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); flow.prev(); }
    else if (e.key === 'r' || e.key === 'R') { flow.restart(); }
  }, [isOpen, isScripted, flow, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, handleKey]);

  if (!proto) return null;
  const { component: ProtoComponent, accent, title } = proto;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="demo-shell"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} prototype`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32 }}
          style={{ '--demo-accent': accent }}
        >
          <div className="demo-shell-esc-hint" aria-hidden="true">
            <span>Press</span>
            <kbd>Esc</kbd>
            <span>to close</span>
          </div>

          <button
            className="demo-shell-close"
            onClick={onClose}
            aria-label="Close prototype"
          >
            <X size={20} />
          </button>

          <div className={`demo-shell-stage${isScripted ? '' : ' demo-shell-stage--free'}`}>
            <Suspense fallback={<DemoFallback accent={accent} />}>
              {isScripted
                ? <ProtoComponent step={flow.step} stepIndex={flow.index} />
                : <ProtoComponent />}
            </Suspense>
          </div>

          {isScripted && (
            <NarrationHud
              narration={flow.step?.narration}
              index={flow.index}
              total={flow.total}
              isFirst={flow.isFirst}
              isLast={flow.isLast}
              onPrev={flow.prev}
              onNext={flow.next}
              onRestart={flow.restart}
              accent={accent}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function DemoFallback({ accent }) {
  return (
    <div className="demo-shell-loading" style={{ color: accent }}>
      <div className="demo-shell-spinner" />
      <span>Loading prototype…</span>
    </div>
  );
}
