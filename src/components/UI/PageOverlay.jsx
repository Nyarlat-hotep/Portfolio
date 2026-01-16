import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './PageOverlay.css';

export default function PageOverlay({ isOpen, onClose, children, title }) {
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="overlay-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          {/* Main Overlay Container */}
          <motion.div
            className="overlay-container"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1]
            }}
          >
            {/* Decorative corner accents */}
            <div className="corner-accent top-left"></div>
            <div className="corner-accent top-right"></div>
            <div className="corner-accent bottom-left"></div>
            <div className="corner-accent bottom-right"></div>

            {/* Header */}
            <div className="overlay-header">
              <div className="header-content">
                {title && (
                  <motion.h1
                    className="overlay-title"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {title}
                  </motion.h1>
                )}
              </div>

              <button
                className="close-button"
                onClick={onClose}
                aria-label="Close overlay"
              >
                <span className="close-icon">×</span>
                <span className="close-text">ESC</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <motion.div
              className="overlay-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {children}
            </motion.div>

            {/* Bottom gradient fade */}
            <div className="overlay-fade"></div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
