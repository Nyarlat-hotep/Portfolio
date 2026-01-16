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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1]
            }}
            style={{
              position: 'fixed',
              top: '7.5vh',
              left: '5%',
              right: '5%',
              bottom: '7.5vh',
              margin: '0 auto',
              maxWidth: '1200px',
              zIndex: 2001,
              background: 'rgba(26, 29, 58, 0.9)',
              borderRadius: '24px',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              boxShadow: '0 0 0 1px rgba(0, 212, 255, 0.1) inset, 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 60px rgba(0, 212, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Decorative corner accents */}
            <div
              className="corner-accent top-left"
              style={{
                position: 'absolute',
                width: '40px',
                height: '40px',
                border: '2px solid rgba(0, 212, 255, 0.6)',
                borderRight: 'none',
                borderBottom: 'none',
                borderTopLeftRadius: '4px',
                top: '16px',
                left: '16px',
                zIndex: 1
              }}
            ></div>
            <div
              className="corner-accent top-right"
              style={{
                position: 'absolute',
                width: '40px',
                height: '40px',
                border: '2px solid rgba(0, 212, 255, 0.6)',
                borderLeft: 'none',
                borderBottom: 'none',
                borderTopRightRadius: '4px',
                top: '16px',
                right: '16px',
                zIndex: 1
              }}
            ></div>
            <div
              className="corner-accent bottom-left"
              style={{
                position: 'absolute',
                width: '40px',
                height: '40px',
                border: '2px solid rgba(0, 212, 255, 0.6)',
                borderRight: 'none',
                borderTop: 'none',
                borderBottomLeftRadius: '4px',
                bottom: '16px',
                left: '16px',
                zIndex: 1
              }}
            ></div>
            <div
              className="corner-accent bottom-right"
              style={{
                position: 'absolute',
                width: '40px',
                height: '40px',
                border: '2px solid rgba(0, 212, 255, 0.6)',
                borderLeft: 'none',
                borderTop: 'none',
                borderBottomRightRadius: '4px',
                bottom: '16px',
                right: '16px',
                zIndex: 1
              }}
            ></div>

            {/* Header */}
            <div
              className="overlay-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2rem 3rem',
                borderBottom: '1px solid rgba(0, 212, 255, 0.15)',
                background: 'linear-gradient(180deg, rgba(0, 212, 255, 0.05) 0%, rgba(0, 212, 255, 0) 100%)',
                flexShrink: 0,
                position: 'relative',
                zIndex: 2
              }}
            >
              <div className="header-content" style={{ flex: 1 }}>
                {title && (
                  <motion.h1
                    className="overlay-title"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                      fontSize: '2.5rem',
                      fontWeight: 200,
                      letterSpacing: '2px',
                      margin: 0,
                      background: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    {title}
                  </motion.h1>
                )}
              </div>

              <button
                className="close-button"
                onClick={onClose}
                aria-label="Close overlay"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#00d4ff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontWeight: 500,
                  letterSpacing: '1px'
                }}
              >
                <span className="close-icon" style={{ fontSize: '24px', lineHeight: 1, fontWeight: 300 }}>×</span>
                <span
                  className="close-text"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    opacity: 0.7,
                    background: 'rgba(0, 212, 255, 0.2)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid rgba(0, 212, 255, 0.3)'
                  }}
                >
                  ESC
                </span>
              </button>
            </div>

            {/* Scrollable Content */}
            <motion.div
              className="overlay-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '2rem 3rem 3rem',
                position: 'relative',
                zIndex: 1
              }}
            >
              {children}
            </motion.div>

            {/* Bottom gradient fade */}
            <div
              className="overlay-fade"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '100px',
                background: 'linear-gradient(to bottom, rgba(26, 29, 58, 0) 0%, rgba(26, 29, 58, 0.9) 100%)',
                pointerEvents: 'none',
                zIndex: 1
              }}
            ></div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
