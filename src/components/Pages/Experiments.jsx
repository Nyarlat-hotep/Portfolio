import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

export default function Experiments({ planetColor = '#6b2fa0', scrollContainerRef, isVoidMode = false }) {
  const viewport = {
    root: scrollContainerRef,
    once: true,
    amount: 0.15
  };

  // Experiments data - themed for the void
  const experiments = [
    {
      title: 'SIGNAL_DECAY',
      description: 'Transmission intercepted from beyond the threshold. Contents: fragmented. Origin: unknown.',
      tags: ['Three.js', 'WebGL', 'Noise'],
      link: null,
      status: 'CORRUPTED'
    },
    {
      title: 'MEMBRANE_BREACH',
      description: 'Attempting to visualize the boundary between spaces. Results inconclusive. Side effects reported.',
      tags: ['Shaders', 'GLSL'],
      link: null,
      status: 'UNSTABLE'
    },
    {
      title: 'ECHO_CHAMBER',
      description: 'Sounds from nowhere. Voices that speak in geometries. Do not listen for too long.',
      tags: ['Web Audio', 'Generative'],
      link: null,
      status: 'ACTIVE'
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
          <Eye size={14} />
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
              className="experiment-card"
              variants={cardVariants}
              whileHover={{
                y: -6,
                boxShadow: '0 0 30px rgba(0, 255, 106, 0.2), inset 0 0 20px rgba(0, 255, 106, 0.05)'
              }}
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
    </div>
  );
}
