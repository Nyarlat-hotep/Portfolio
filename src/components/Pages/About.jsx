import { motion } from 'framer-motion';
import './About.css';

export default function About({ aboutData }) {
  if (!aboutData) return null;

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
      className="about-page"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="about-header" variants={itemVariants}>
        <div className="about-intro">
          <h2 className="about-tagline">{aboutData.tagline}</h2>
        </div>
      </motion.div>

      {/* Bio */}
      <motion.section className="about-section" variants={itemVariants}>
        <h3 className="section-title">
          <span className="title-accent">01</span>
          About Me
        </h3>
        <div className="bio-content">
          {aboutData.bio.map((paragraph, index) => (
            <p key={index} className="bio-paragraph">
              {paragraph}
            </p>
          ))}
        </div>
      </motion.section>

      {/* Skills & Tools Grid */}
      <motion.div className="skills-tools-grid" variants={itemVariants}>
        {/* Skills */}
        <section className="about-section">
          <h3 className="section-title">
            <span className="title-accent">02</span>
            Skills
          </h3>
          <div className="chip-grid">
            {aboutData.skills.map((skill, index) => (
              <div key={index} className="skill-chip">
                <span className="chip-icon">✦</span>
                {skill}
              </div>
            ))}
          </div>
        </section>

        {/* Tools */}
        <section className="about-section">
          <h3 className="section-title">
            <span className="title-accent">03</span>
            Tools
          </h3>
          <div className="chip-grid">
            {aboutData.tools.map((tool, index) => (
              <div key={index} className="tool-chip">
                <span className="chip-icon">⚡</span>
                {tool}
              </div>
            ))}
          </div>
        </section>
      </motion.div>

      {/* Contact */}
      <motion.section className="about-section" variants={itemVariants}>
        <h3 className="section-title">
          <span className="title-accent">04</span>
          Get In Touch
        </h3>
        <div className="contact-card">
          <p className="contact-text">
            I'm always interested in hearing about new projects and opportunities.
          </p>
          {aboutData.contact.email && (
            <a
              href={`mailto:${aboutData.contact.email}`}
              className="contact-button"
            >
              <span className="button-icon">✉</span>
              {aboutData.contact.email}
            </a>
          )}
        </div>
      </motion.section>

      {/* Social Links */}
      {aboutData.social && (
        <motion.section className="about-section" variants={itemVariants}>
          <h3 className="section-title">
            <span className="title-accent">05</span>
            Connect
          </h3>
          <div className="social-links">
            {aboutData.social.linkedin && (
              <a
                href={aboutData.social.linkedin}
                className="social-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="social-icon">in</span>
                <span className="social-label">LinkedIn</span>
              </a>
            )}
            {aboutData.social.dribbble && (
              <a
                href={aboutData.social.dribbble}
                className="social-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="social-icon">dr</span>
                <span className="social-label">Dribbble</span>
              </a>
            )}
            {aboutData.social.behance && (
              <a
                href={aboutData.social.behance}
                className="social-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="social-icon">be</span>
                <span className="social-label">Behance</span>
              </a>
            )}
            {aboutData.social.twitter && (
              <a
                href={aboutData.social.twitter}
                className="social-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="social-icon">𝕏</span>
                <span className="social-label">Twitter</span>
              </a>
            )}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}
