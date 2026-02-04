import { useEffect, useRef, useState, Children, cloneElement, isValidElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import './VoidOverlay.css';

// Glitch text effect - randomly corrupts characters
function GlitchText({ children, intensity = 0.3 }) {
  const [text, setText] = useState(children);
  const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/\\~`0123456789';

  useEffect(() => {
    if (typeof children !== 'string') return;

    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const chars = children.split('');
        const numGlitches = Math.floor(Math.random() * 3 * intensity) + 1;

        for (let i = 0; i < numGlitches; i++) {
          const idx = Math.floor(Math.random() * chars.length);
          chars[idx] = glitchChars[Math.floor(Math.random() * glitchChars.length)];
        }

        setText(chars.join(''));

        // Reset after brief moment
        setTimeout(() => setText(children), 50 + Math.random() * 100);
      }
    }, 2000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, [children, intensity]);

  return <span className="glitch-text">{text}</span>;
}

// Floating void particles
function VoidParticles({ count = 50 }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: 10 + Math.random() * 20,
    delay: Math.random() * 10
  }));

  return (
    <div className="void-particles">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="void-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
}

export default function VoidOverlay({ isOpen, onClose, children, title }) {
  const contentRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [isEyeOpen, setIsEyeOpen] = useState(true);

  // Focus close button when overlay opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

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

  // Eye blink animation
  useEffect(() => {
    if (!isOpen) return;

    const blink = () => {
      setIsEyeOpen(false);
      setTimeout(() => setIsEyeOpen(true), 150);
    };

    const interval = setInterval(() => {
      if (Math.random() > 0.7) blink();
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - darker, more ominous */}
          <motion.div
            className="void-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={onClose}
          />

          {/* Main Overlay Container */}
          <motion.div
            className="void-container"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "void-title" : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Animated noise overlay */}
            <div className="void-noise" />

            {/* Breathing vignette */}
            <div className="void-vignette" />

            {/* Floating particles */}
            <VoidParticles />

            {/* Tentacle silhouettes */}
            <div className="void-tentacles">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <path className="tentacle t1" d="M-10,100 Q20,80 15,60 T25,20 T10,-10" />
                <path className="tentacle t2" d="M110,100 Q80,75 90,50 T75,20 T95,-10" />
                <path className="tentacle t3" d="M-10,50 Q10,40 5,20 T15,-10" />
              </svg>
            </div>

            {/* Header */}
            <motion.div
              className="void-header"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="void-header-content">
                {title && (
                  <motion.h1
                    id="void-title"
                    className="void-title"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <GlitchText intensity={0.5}>{title}</GlitchText>
                  </motion.h1>
                )}
              </div>

              {/* Eye close button */}
              <motion.button
                ref={closeButtonRef}
                className="void-close-button"
                onClick={onClose}
                aria-label="Close overlay"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => setIsEyeOpen(false)}
                onHoverEnd={() => setIsEyeOpen(true)}
              >
                {isEyeOpen ? <Eye size={28} /> : <EyeOff size={28} />}
              </motion.button>
            </motion.div>

            {/* Scrollable Content */}
            <motion.div
              ref={contentRef}
              className="void-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {Children.map(children, child =>
                isValidElement(child)
                  ? cloneElement(child, { scrollContainerRef: contentRef, isVoidMode: true })
                  : child
              )}
            </motion.div>

            {/* Bottom fade */}
            <div className="void-bottom-fade" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
