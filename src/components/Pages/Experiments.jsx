import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, ExternalLink, Eye, Image, X } from 'lucide-react';
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

export default function Experiments({ planetColor = '#6b2fa0', scrollContainerRef, isVoidMode = false }) {
  const viewport = {
    root: scrollContainerRef,
    once: true,
    amount: 0.15
  };

  const [galleryOpen, setGalleryOpen] = useState(false);
  const touchStartY = useRef(0);
  const panelRef = useRef(null);

  // Placeholder gallery items (will be replaced with real images)
  const galleryItems = [
    { id: 1, aspectRatio: 1.5 },
    { id: 2, aspectRatio: 0.8 },
    { id: 3, aspectRatio: 1.2 },
    { id: 4, aspectRatio: 1.0 },
    { id: 5, aspectRatio: 0.75 },
    { id: 6, aspectRatio: 1.3 },
    { id: 7, aspectRatio: 1.1 },
    { id: 8, aspectRatio: 0.9 },
  ];

  // Handle swipe down to close
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY > 80) {
      setGalleryOpen(false);
    }
  };

  // Experiments data - themed for the void
  const experiments = [
    {
      title: 'SIGNAL_DECAY',
      description: 'Transmission intercepted from beyond the threshold. Contents: fragmented. Origin: unknown.',
      tags: ['Three.js', 'WebGL', 'Noise'],
      link: null,
      status: 'CORRUPTED',
      action: null
    },
    {
      title: 'VISUAL_ARCHIVE',
      description: 'Fragments of creation. Images pulled from the spaces between projects. Handle with care.',
      tags: ['Gallery', 'Art'],
      link: null,
      status: 'ACTIVE',
      action: () => setGalleryOpen(true)
    },
    {
      title: 'ECHO_CHAMBER',
      description: 'Sounds from nowhere. Voices that speak in geometries. Do not listen for too long.',
      tags: ['Web Audio', 'Generative'],
      link: null,
      status: 'UNSTABLE',
      action: null
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

      {/* Gallery Panel - slides up from bottom */}
      <AnimatePresence>
        {galleryOpen && (
          <>
            {/* Click-outside area (top 25%) */}
            <motion.div
              className="gallery-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setGalleryOpen(false)}
            />

            {/* Gallery panel */}
            <motion.div
              ref={panelRef}
              className="gallery-panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Swipe indicator */}
              <div className="gallery-swipe-indicator">
                <div className="swipe-bar" />
              </div>

              {/* Gallery header */}
              <div className="gallery-header">
                <div className="gallery-title-group">
                  <h2 className="gallery-title">VISUAL_ARCHIVE</h2>
                </div>
              </div>

              {/* Masonry grid */}
              <div className="gallery-grid">
                {galleryItems.map((item) => (
                  <motion.div
                    key={item.id}
                    className="gallery-item"
                    style={{ aspectRatio: item.aspectRatio }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: item.id * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="gallery-placeholder">
                      <span className="placeholder-id">#{String(item.id).padStart(3, '0')}</span>
                      <span className="placeholder-text">AWAITING_DATA</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bottom fade */}
              <div className="gallery-bottom-fade" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
