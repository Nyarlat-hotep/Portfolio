import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { checkCode, rememberUnlock } from '../../utils/gate';
import { playCaseStudyClose } from '../../utils/sounds';
import './GateModal.css';

const PROMPTS = {
  'case-study-1': 'Restricted transmission detected. Supply clearance code to decrypt file.',
  'case-study-3': 'Classified intelligence archive. Authorization code required to proceed.',
};

// Password prompt for the gated case studies. `placement="center"` floats it
// mid-screen (intro page); the default docks it to the bottom like the other
// in-galaxy transmissions.
export default function GateModal({ open, ...props }) {
  return createPortal(
    <AnimatePresence>{open && <GatePanel key="case-gate" {...props} />}</AnimatePresence>,
    document.body
  );
}

// Mounted fresh on every open, so the input and error state start clean.
function GatePanel({ planetId, onSuccess, onClose, placement = 'bottom' }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { playCaseStudyClose(); onClose?.(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function submit() {
    if (checkCode(value)) {
      rememberUnlock();
      onSuccess?.();
    } else {
      setError(true);
    }
  }

  return (
    <div className={`gate-overlay gate-overlay--${placement}`}>
      {placement === 'center' && (
        <motion.div
          className="gate-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => { playCaseStudyClose(); onClose?.(); }}
        />
      )}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-label"
        initial={{ opacity: 0, y: 12, scale: placement === 'center' ? 0.97 : 1 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className={`gate-modal${error ? ' gate-modal--rejected' : ''}`}
      >
        <div className="gate-header">
          <span className="gate-status">{error ? 'ACCESS DENIED' : 'CLEARANCE REQUIRED'}</span>
          <button
            className="gate-close"
            onClick={() => { playCaseStudyClose(); onClose?.(); }}
            aria-label="Close"
          ><X size={16} /></button>
        </div>
        <form className="gate-body" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <label id="gate-label" className="gate-label" htmlFor="gate-input">
            {PROMPTS[planetId] ?? PROMPTS['case-study-1']}
          </label>
          <div className="gate-row">
            <input
              id="gate-input"
              className={`gate-input${error ? ' gate-input--error' : ''}`}
              type="password"
              value={value}
              onChange={(e) => { setValue(e.target.value); if (error) setError(false); }}
              autoFocus
              autoComplete="off"
              placeholder="_ _ _ _ _ _ _"
            />
            <button type="submit" className="gate-submit" aria-label="Submit clearance code">
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
