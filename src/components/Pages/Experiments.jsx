import { motion } from 'framer-motion';
import { FlaskConical, ExternalLink } from 'lucide-react';
import './Experiments.css';

// Card — staggered scale-in
const cardVariants = {
  hidden: { opacity: 0, y: 25, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
  }
};

export default function Experiments({ planetColor = '#6b2fa0', scrollContainerRef }) {
  const viewport = {
    root: scrollContainerRef,
    once: true,
    amount: 0.15
  };

  // Placeholder experiments — replace with your own
  const experiments = [
    {
      title: 'Experiment 1',
      description: 'Description of your first experiment or creative project.',
      tags: ['Three.js', 'WebGL'],
      link: null
    },
    {
      title: 'Experiment 2',
      description: 'Description of your second experiment or creative project.',
      tags: ['React', 'Animation'],
      link: null
    },
    {
      title: 'Experiment 3',
      description: 'Description of your third experiment or creative project.',
      tags: ['Generative Art', 'Canvas'],
      link: null
    }
  ];

  return (
    <div
      className="experiments-page"
      style={{
        '--planet-color': planetColor,
        '--planet-color-rgb': planetColor.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16)).join(', ')
      }}
    >
      {/* Header */}
      <motion.div
        className="experiments-header"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewport}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <p className="experiments-tagline">
          Creative coding, prototypes, and things that didn't fit anywhere else.
        </p>
      </motion.div>

      {/* Experiments Grid — staggered cards */}
      <section className="experiments-section">
        <motion.div
          className="experiments-grid"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.12 } }
          }}
        >
          {experiments.map((exp, index) => (
            <motion.div
              key={index}
              className="experiment-card"
              variants={cardVariants}
              whileHover={{ y: -4 }}
            >
              <div className="card-header">
                <FlaskConical className="card-icon" size={20} />
                <h3 className="card-title">{exp.title}</h3>
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
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
