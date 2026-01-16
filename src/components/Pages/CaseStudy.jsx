import { motion } from 'framer-motion';
import './CaseStudy.css';
import HexAccent from '../UI/HexAccent';
import OctagonAccent from '../UI/OctagonAccent';

export default function CaseStudy({ caseStudy }) {
  if (!caseStudy) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div
      className="case-study"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Subtitle / Meta */}
      <motion.div className="case-study-meta" variants={itemVariants}>
        <span className="meta-item">{caseStudy.subtitle}</span>
        {caseStudy.duration && (
          <>
            <span className="meta-divider">•</span>
            <span className="meta-item">{caseStudy.duration}</span>
          </>
        )}
      </motion.div>

      {/* Role & Company */}
      <motion.div className="case-study-info" variants={itemVariants}>
        <div className="info-card">
          <OctagonAccent size={24} opacity={0.4} className="card-accent top-left" />
          <OctagonAccent size={24} opacity={0.4} className="card-accent bottom-right" />
          <span className="info-label">Role</span>
          <span className="info-value">{caseStudy.role}</span>
        </div>
        <div className="info-card">
          <OctagonAccent size={24} opacity={0.4} className="card-accent top-left" />
          <OctagonAccent size={24} opacity={0.4} className="card-accent bottom-right" />
          <span className="info-label">Company</span>
          <span className="info-value">{caseStudy.company}</span>
        </div>
      </motion.div>

      {/* Overview */}
      <motion.section className="case-study-section" variants={itemVariants}>
        <h2 className="section-title">
          <span className="title-accent">01</span>
          Overview
        </h2>
        <p className="section-text">{caseStudy.overview}</p>
      </motion.section>

      {/* Challenge */}
      <motion.section className="case-study-section" variants={itemVariants}>
        <h2 className="section-title">
          <span className="title-accent">02</span>
          Challenge
        </h2>
        <p className="section-text">{caseStudy.challenge}</p>
      </motion.section>

      {/* Solution */}
      <motion.section className="case-study-section" variants={itemVariants}>
        <h2 className="section-title">
          <span className="title-accent">03</span>
          Solution
        </h2>
        <p className="section-text">{caseStudy.solution}</p>
      </motion.section>

      {/* Images Gallery */}
      {caseStudy.images && caseStudy.images.length > 0 && (
        <motion.section className="case-study-section" variants={itemVariants}>
          <h2 className="section-title">
            <span className="title-accent">04</span>
            Visuals
          </h2>
          <div className="image-gallery">
            {caseStudy.images.map((image, index) => (
              <div key={index} className="gallery-item">
                <img src={image} alt={`${caseStudy.title} - ${index + 1}`} />
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Impact */}
      <motion.section className="case-study-section" variants={itemVariants}>
        <h2 className="section-title">
          <span className="title-accent">05</span>
          Impact
        </h2>
        <p className="section-text impact-text">{caseStudy.impact}</p>
      </motion.section>

      {/* Tools & Technologies */}
      {caseStudy.tools && caseStudy.tools.length > 0 && (
        <motion.section className="case-study-section" variants={itemVariants}>
          <h2 className="section-title">
            <span className="title-accent">06</span>
            Tools & Technologies
          </h2>
          <div className="tools-grid">
            {caseStudy.tools.map((tool, index) => (
              <div key={index} className="tool-chip">
                {tool}
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Links */}
      {caseStudy.links && Object.keys(caseStudy.links).length > 0 && (
        <motion.section className="case-study-section" variants={itemVariants}>
          <div className="case-study-links">
            {caseStudy.links.prototype && (
              <a
                href={caseStudy.links.prototype}
                className="link-button"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Prototype →
              </a>
            )}
            {caseStudy.links.live && (
              <a
                href={caseStudy.links.live}
                className="link-button"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Live Site →
              </a>
            )}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}
