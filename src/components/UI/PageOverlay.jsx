import { useEffect, useRef, Children, cloneElement, isValidElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import DataStream from './DataStream';
import OverlayStars from './OverlayStars';
import './PageOverlay.css';

export default function PageOverlay({ isOpen, onClose, children, title, planetColor = '#00d4ff', planetId }) {
  const contentRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Focus close button when overlay opens for accessibility
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
            className={`overlay-container${planetId ? ` overlay--${planetId}` : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "overlay-title" : undefined}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1]
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2001,
              background: 'rgba(6, 6, 10, 0.97)',
              borderRadius: 0,
              backdropFilter: 'blur(20px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              '--overlay-color': planetColor,
              '--overlay-color-rgb': planetColor
                .replace('#', '')
                .match(/.{2}/g)
                .map((x) => parseInt(x, 16))
                .join(', ')
            }}
          >
            {/* Background effects */}
            <DataStream />
            <OverlayStars planetColor={planetColor} />

            {/* Header */}
            <div
              className="overlay-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '2rem 3rem',
                borderBottom: `1px solid ${planetColor}26`,
                background: `linear-gradient(180deg, ${planetColor}0d 0%, ${planetColor}00 100%)`,
                flexShrink: 0,
                position: 'relative',
                zIndex: 2
              }}
            >
              <div className="header-content" style={{ flex: 1 }}>
                {title && (
                  <motion.h1
                    id="overlay-title"
                    className="overlay-title"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                      fontWeight: 200,
                      letterSpacing: '2px',
                      margin: 0,
                      color: planetColor
                    }}
                  >
                    {title}
                  </motion.h1>
                )}
              </div>

              <button
                ref={closeButtonRef}
                className="close-button"
                onClick={onClose}
                aria-label="Close overlay"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  background: `${planetColor}1a`,
                  border: `1px solid ${planetColor}4d`,
                  borderRadius: '12px',
                  color: planetColor,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontWeight: 500,
                  letterSpacing: '1px'
                }}
              >
                <X className="close-icon" size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
            <motion.div
              ref={contentRef}
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
              {Children.map(children, child =>
                isValidElement(child)
                  ? cloneElement(child, { scrollContainerRef: contentRef })
                  : child
              )}
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
