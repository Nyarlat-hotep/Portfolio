import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, ExternalLink, Eye } from 'lucide-react';
import './Experiments.css';

// Card variants for staggered animation
const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
  }
};

// Corrupted text that occasionally glitches
function CorruptedText({ children }) {
  const [text, setText] = useState(children);
  const glitchChars = '!@#$%^&*_+-=|;:<>?/\\~`01';

  useEffect(() => {
    if (typeof children !== 'string') return;

    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        const chars = children.split('');
        const idx = Math.floor(Math.random() * chars.length);
        chars[idx] = glitchChars[Math.floor(Math.random() * glitchChars.length)];
        setText(chars.join(''));
        setTimeout(() => setText(children), 80);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [children]);

  return <span className="corrupted-text">{text}</span>;
}

const galleryImages = [
  '/images/case-studies/visualdesign/OS - dash.png',
  '/images/case-studies/visualdesign/OS 1 - client.png',
  '/images/case-studies/visualdesign/Omni.png',
  '/images/case-studies/visualdesign/Product Recommendations-1.png',
  '/images/case-studies/visualdesign/Scene 1_ Dashboard (daily landing view with Tasks).png',
  '/images/case-studies/visualdesign/TM dashboard.png',
  '/images/case-studies/visualdesign/dashboard home improvements.png',
  '/images/case-studies/visualdesign/messy kitchen AR 9.png',
  '/images/case-studies/visualdesign/v2 homes.png',
  '/images/case-studies/visualdesign/v2.png',
  '/images/case-studies/visualdesign/Frame 48097530.png',
  '/images/case-studies/visualdesign/Frame 48097531.png',
  '/images/case-studies/visualdesign/Frame 48099754.png',
  '/images/case-studies/visualdesign/Frame 48099768.png',
  '/images/case-studies/visualdesign/Frame 48099769.png',
  '/images/case-studies/visualdesign/Frame 48099770.png',
  '/images/case-studies/visualdesign/Frame 48099771.png',
  '/images/case-studies/visualdesign/Frame 48099772.png',
  '/images/case-studies/visualdesign/Frame 48099773.png',
  '/images/case-studies/visualdesign/Frame 48099774.png',
  '/images/case-studies/visualdesign/Frame 48099775.png',
  '/images/case-studies/visualdesign/Frame 48099776.png',
  '/images/case-studies/visualdesign/Frame 48099777.png',
  '/images/case-studies/visualdesign/Frame 48099778.png',
  '/images/case-studies/visualdesign/Frame 48099779.png',
  '/images/case-studies/visualdesign/HBP-progress.png',
  '/images/case-studies/visualdesign/car goal.png',
];

export default function Experiments({ scrollContainerRef, isVoidMode = false }) {
  const viewport = {
    root: scrollContainerRef,
    once: true,
    amount: 0.15
  };

  const [galleryOpen, setGalleryOpen] = useState(false);
  const touchStartY = useRef(0);
  const panelRef = useRef(null);

  // Handle swipe down to close
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    // Require a more deliberate swipe (150px) to close
    if (deltaY > 150) {
      setGalleryOpen(false);
    }
  };

  // Experiments data - themed for the void
  const experiments = [
    {
      title: 'VISUAL_ARCHIVE',
      description: 'Fragments of creation. Images pulled from the spaces between projects. Handle with care.',
      tags: ['Gallery', 'Art'],
      link: null,
      status: 'ACTIVE',
      action: () => setGalleryOpen(true)
    }
  ];

  return (
    <div className={`experiments-page ${isVoidMode ? 'void-mode' : ''}`}>
      {/* Header */}
      <motion.div
        className="experiments-header"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewport}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      >
        <p className="experiments-tagline">
          <CorruptedText>
            Things that should not be. Projects from the spaces between.
          </CorruptedText>
        </p>
        <div className="void-warning">
          <Eye size={16} />
          <span>OBSERVATION MAY ALTER RESULTS</span>
        </div>
      </motion.div>

      {/* Experiments Grid */}
      <section className="experiments-section">
        <motion.div
          className="experiments-grid"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          {experiments.map((exp, index) => (
            <motion.div
              key={index}
              className={`experiment-card ${exp.action ? 'clickable' : ''}`}
              variants={cardVariants}
              whileHover={{
                y: -6,
                boxShadow: '0 0 30px rgba(0, 255, 106, 0.2), inset 0 0 20px rgba(0, 255, 106, 0.05)'
              }}
              onClick={exp.action}
            >
              {/* Status indicator */}
              <div className={`card-status status-${exp.status.toLowerCase()}`}>
                <span className="status-dot" />
                <span className="status-text">{exp.status}</span>
              </div>

              <div className="card-header">
                <Skull className="card-icon" size={20} />
                <h3 className="card-title">
                  <CorruptedText>{exp.title}</CorruptedText>
                </h3>
              </div>

              <p className="card-description">{exp.description}</p>

              <div className="card-footer">
                <div className="card-tags">
                  {exp.tags.map((tag, i) => (
                    <span key={i} className="card-tag">{tag}</span>
                  ))}
                </div>
                {exp.link && (
                  <a
                    href={exp.link}
                    className="card-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>

              {/* Organic border decoration */}
              <div className="card-border-glow" />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Bottom void message */}
      <motion.div
        className="void-message"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={viewport}
        transition={{ delay: 0.5, duration: 1 }}
      >
        <span className="void-message-text">
          [ MORE TRANSMISSIONS INCOMING ]
        </span>
      </motion.div>

      {/* Portal: renders backdrop + clipper directly in document.body,
          keeping position:fixed truly relative to viewport */}
      {createPortal(
        <>
          <AnimatePresence>
            {galleryOpen && (
              <motion.div
                className="gallery-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => setGalleryOpen(false)}
              />
            )}
          </AnimatePresence>

          <motion.div
            ref={panelRef}
            className="gallery-clipper"
            animate={{ y: galleryOpen ? 0 : '100%' }}
            initial={{ y: '100%' }}
            transition={{ type: 'spring', damping: 27, stiffness: 300 }}
            style={{ pointerEvents: galleryOpen ? 'auto' : 'none' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="gallery-panel">
              <div className="gallery-swipe-indicator">
                <div className="swipe-bar" />
              </div>
              <div className="gallery-header">
                <div className="gallery-title-group">
                  <h2 className="gallery-title">VISUAL_ARCHIVE</h2>
                </div>
              </div>
              <div className="gallery-grid">
                {galleryImages.map((src, i) => (
                  <div key={i} className="gallery-item">
                    <img src={src} alt={`Visual archive ${i + 1}`} className="gallery-img" decoding="async" />
                  </div>
                ))}
              </div>
              <div className="gallery-bottom-fade" />
            </div>
          </motion.div>
        </>,
        document.body
      )}
    </div>
  );
}
