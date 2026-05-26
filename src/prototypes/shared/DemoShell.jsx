import { Suspense, useEffect, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { PROTOTYPES } from '../index.js';
import { useScriptedFlow } from './useScriptedFlow.js';
import NarrationHud from './NarrationHud.jsx';
import './DemoShell.css';

const ESC_HINT_TIMEOUT_MS = 2500;

// Fullscreen portal wrapper used when a prototype is launched from a
// case study page CTA. Supports both scripted (steps array + narration HUD
// + arrow-key advance) and free-click (steps undefined) prototypes.
export default function DemoShell({ prototypeId, isOpen, onClose }) {
  const proto = PROTOTYPES[prototypeId];
  const flow = useScriptedFlow(proto?.steps || []);
  const isScripted = (proto?.steps?.length || 0) > 0;
  const [hintVisible, setHintVisible] = useState(true);
  const hintTimerRef = useRef(null);

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

  // Esc hint: show on open, hide after a few seconds; pop back on mouse move.
  useEffect(() => {
    if (!isOpen) return;
    const showAndQueueHide = () => {
      setHintVisible(true);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setHintVisible(false), ESC_HINT_TIMEOUT_MS);
    };
    showAndQueueHide();
    window.addEventListener('mousemove', showAndQueueHide);
    return () => {
      window.removeEventListener('mousemove', showAndQueueHide);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, [isOpen]);

  // Use a ref so the capture-phase listener doesn't need to be re-registered
  // every time flow/onClose change.
  const handlerStateRef = useRef({ isOpen, isScripted, flow, onClose });
  useEffect(() => {
    handlerStateRef.current = { isOpen, isScripted, flow, onClose };
  });

  // Capture-phase keydown so Esc is consumed BEFORE PageOverlay's bubble-phase
  // window listener can close the underlying case study modal. stopImmediate-
  // Propagation also stops any sibling window listeners from firing.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      const { isScripted: scripted, flow: f, onClose: close } = handlerStateRef.current;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        close?.();
        return;
      }
      if (!scripted) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); f.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); f.prev(); }
      else if (e.key === 'r' || e.key === 'R') { f.restart(); }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [isOpen]);

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
          <AnimatePresence>
            {hintVisible && (
              <motion.div
                key="esc-hint"
                className="demo-shell-esc-hint"
                aria-hidden="true"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                <span>Press</span>
                <kbd>Esc</kbd>
                <span>to close</span>
              </motion.div>
            )}
          </AnimatePresence>

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
