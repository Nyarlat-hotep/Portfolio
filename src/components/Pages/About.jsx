import { motion } from 'framer-motion';
import { Sparkles, Zap, Mail, Linkedin, Dribbble } from 'lucide-react';
import './About.css';

// --- Variant definitions ---

// Section number — parallax offset
const numberVariants = {
  hidden: { opacity: 0, y: 60, scale: 0.8 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, delay: 0.15, ease: [0.4, 0, 0.2, 1] }
  }
};

// Title text slides from left
const titleVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 0.6, delay: 0.25, ease: [0.4, 0, 0.2, 1] }
  }
};

// Underline draws from left
const underlineVariants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.8, delay: 0.35, ease: [0.4, 0, 0.2, 1] }
  }
};

// Body content — subtle slide-up
const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: 0.45, ease: [0.4, 0, 0.2, 1] }
  }
};

// Bio paragraphs (delay handled by parent stagger)
const paragraphVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
  }
};

// Chips — pop in (delay handled by parent stagger)
const chipVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.9 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  }
};

// Social links
const socialVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  }
};

// --- Animated section with title parallax + draw-in ---
function AnimatedSection({ number, title, children, viewport }) {
  return (
    <motion.section
      className="about-section"
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
    >
      <h3 className="section-title">
        <motion.span className="title-accent" variants={numberVariants}>
          {number}
        </motion.span>
        <motion.span className="section-title-text" variants={titleVariants}>
          {title}
        </motion.span>
        <motion.span className="section-title-underline" variants={underlineVariants} />
      </h3>
      {children}
    </motion.section>
  );
}

// --- Main component ---
export default function About({ aboutData, planetColor = '#10b981', scrollContainerRef }) {
  if (!aboutData) return null;

  const viewport = {
    root: scrollContainerRef,
    once: true,
    amount: 0.15
  };

  return (
    <div
      className="about-page"
      style={{
        '--planet-color': planetColor,
        '--planet-color-rgb': planetColor.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16)).join(', ')
      }}
    >
      {/* Header tagline + photo */}
      <motion.div
        className="about-header"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewport}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="about-header-inner">
          <div className="about-intro">
            <h2 className="about-tagline">{aboutData.tagline}</h2>
          </div>
          <motion.div
            className="about-photo-wrap"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewport}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="about-photo-frame">
              <img src="/images/taylor.jpg" alt="Taylor Cornelius" />
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Bio — staggered paragraphs */}
      <AnimatedSection number="01" title="About Me" viewport={viewport}>
        <motion.div
          className="bio-content"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1, delayChildren: 0.45 } }
          }}
        >
          {aboutData.bio.map((paragraph, index) => (
            <motion.p key={index} className="bio-paragraph" variants={paragraphVariants}>
              {paragraph}
            </motion.p>
          ))}
        </motion.div>
      </AnimatedSection>

      {/* Skills & Tools Grid — staggered columns */}
      <motion.div
        className="skills-tools-grid"
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.2 } }
        }}
      >
        {/* Skills */}
        <motion.section
          className="about-section"
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: {
              opacity: 1, y: 0,
              transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
            }
          }}
        >
          <h3 className="section-title">
            <motion.span className="title-accent" variants={numberVariants}>02</motion.span>
            <motion.span className="section-title-text" variants={titleVariants}>Skills</motion.span>
            <motion.span className="section-title-underline" variants={underlineVariants} />
          </h3>
          <motion.div
            className="chip-grid"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05, delayChildren: 0.3 } }
            }}
          >
            {aboutData.skills.map((skill, index) => (
              <motion.div key={index} className="skill-chip" variants={chipVariants}>
                <Sparkles className="chip-icon" size={14} />
                {skill}
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Tools */}
        <motion.section
          className="about-section"
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: {
              opacity: 1, y: 0,
              transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
            }
          }}
        >
          <h3 className="section-title">
            <motion.span className="title-accent" variants={numberVariants}>03</motion.span>
            <motion.span className="section-title-text" variants={titleVariants}>Tools</motion.span>
            <motion.span className="section-title-underline" variants={underlineVariants} />
          </h3>
          <motion.div
            className="chip-grid"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05, delayChildren: 0.3 } }
            }}
          >
            {aboutData.tools.map((tool, index) => (
              <motion.div key={index} className="tool-chip" variants={chipVariants}>
                <Zap className="chip-icon" size={14} />
                {tool}
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      </motion.div>

      {/* Contact + Social — merged */}
      <AnimatedSection number="04" title="Get In Touch" viewport={viewport}>
        <motion.div className="contact-card" variants={contentVariants}>
          <p className="contact-text">
            I'm always interested in hearing about new projects and opportunities.
          </p>
          <div className="contact-actions">
            {aboutData.contact.email && (
              <motion.a
                href={`mailto:${aboutData.contact.email}`}
                className="contact-button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Mail className="button-icon" size={20} />
                {aboutData.contact.email}
              </motion.a>
            )}
            {aboutData.social && (
              <motion.div
                className="social-links"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } }
                }}
              >
                {aboutData.social.linkedin && (
                  <motion.a
                    href={aboutData.social.linkedin}
                    className="social-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    variants={socialVariants}
                    whileHover={{ scale: 1.1 }}
                  >
                    <Linkedin className="social-icon" size={24} />
                  </motion.a>
                )}
                {aboutData.social.dribbble && (
                  <motion.a
                    href={aboutData.social.dribbble}
                    className="social-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    variants={socialVariants}
                    whileHover={{ scale: 1.1 }}
                  >
                    <Dribbble className="social-icon" size={24} />
                  </motion.a>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatedSection>
    </div>
  );
}
