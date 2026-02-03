import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ImageCompare from '../UI/ImageCompare';
import './CaseStudy.css';

// --- Variant definitions ---

// Left border draws in from top
const borderVariants = {
  hidden: { scaleY: 0 },
  visible: {
    scaleY: 1,
    transition: { duration: 0.8, delay: 0.15, ease: [0.4, 0, 0.2, 1] }
  }
};

// Section number — larger offset for parallax feel
const numberVariants = {
  hidden: { opacity: 0, y: 60, scale: 0.8 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, delay: 0.15, ease: [0.4, 0, 0.2, 1] }
  }
};

// Title text slides from left
const titleVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, delay: 0.25, ease: [0.4, 0, 0.2, 1] }
  }
};

// Underline draws in from left
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
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.45, ease: [0.4, 0, 0.2, 1] }
  }
};

// Info cards
const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
  }
};

// Gallery images — scale in
const galleryItemVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
  }
};

// Tool chips — pop in
const toolChipVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  }
};

// --- Animated section component ---
function AnimatedSection({ number, title, children, viewport }) {
  return (
    <motion.section
      className="case-study-section"
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
    >
      {/* Animated left border — draws in from top */}
      <motion.span className="section-border-line" variants={borderVariants} />

      <h2 className="section-title">
        {/* Section number — parallax offset */}
        <motion.span className="title-accent" variants={numberVariants}>
          {number}
        </motion.span>

        {/* Title text — slides from left */}
        <motion.span className="section-title-text" variants={titleVariants}>
          {title}
        </motion.span>

        {/* Underline — draws in from left */}
        <motion.span className="section-title-underline" variants={underlineVariants} />
      </h2>

      {children}
    </motion.section>
  );
}

// --- Main component ---
export default function CaseStudy({ caseStudy, planetColor = '#a855f7', scrollContainerRef }) {
  if (!caseStudy) return null;

  const viewport = {
    root: scrollContainerRef,
    once: true,
    amount: 0.15
  };

  // Auto-incrementing section counter
  let _sectionCounter = 0;
  const sectionNum = () => String(++_sectionCounter).padStart(2, '0');

  return (
    <div
      className="case-study"
      style={{
        '--planet-color': planetColor,
        '--planet-color-rgb': planetColor
          .replace('#', '')
          .match(/.{2}/g)
          .map((x) => parseInt(x, 16))
          .join(', ')
      }}
    >
      {/* Meta — slides in from left */}
      <motion.div
        className="case-study-meta"
        initial={{ opacity: 0, x: -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={viewport}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <span className="meta-item">{caseStudy.subtitle}</span>
        {caseStudy.duration && (
          <>
            <span className="meta-divider">&bull;</span>
            <span className="meta-item">{caseStudy.duration}</span>
          </>
        )}
      </motion.div>

      {/* Info Cards — staggered reveal */}
      <motion.div
        className="case-study-info"
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
        }}
      >
        <motion.div className="info-card" variants={cardVariants}>
          <span className="info-label">Role</span>
          <span className="info-value">{caseStudy.role}</span>
        </motion.div>
        <motion.div className="info-card" variants={cardVariants}>
          <span className="info-label">Company</span>
          <span className="info-value">{caseStudy.company}</span>
        </motion.div>
      </motion.div>

      {/* Overview */}
      <AnimatedSection number={sectionNum()} title="Overview" viewport={viewport}>
        <motion.p className="section-text" variants={contentVariants}>
          {caseStudy.overview}
        </motion.p>
      </AnimatedSection>

      {/* Challenge */}
      <AnimatedSection number={sectionNum()} title="Challenge" viewport={viewport}>
        <motion.p className="section-text" variants={contentVariants}>
          {caseStudy.challenge}
        </motion.p>
      </AnimatedSection>

      {/* Solution */}
      <AnimatedSection number={sectionNum()} title="Solution" viewport={viewport}>
        <motion.p className="section-text" variants={contentVariants}>
          {caseStudy.solution}
        </motion.p>
      </AnimatedSection>

      {/* Images Gallery — staggered scale-in */}
      {caseStudy.images && caseStudy.images.length > 0 && (
        <AnimatedSection number={sectionNum()} title="Visuals" viewport={viewport}>
          <motion.div
            className="image-gallery"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.12, delayChildren: 0.45 }
              }
            }}
          >
            {caseStudy.images.map((image, index) => (
              <motion.div
                key={index}
                className="gallery-item"
                variants={galleryItemVariants}
              >
                {image ? (
                  <img src={image} alt={`${caseStudy.title} - ${index + 1}`} />
                ) : (
                  <div className="gallery-placeholder">IMG</div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </AnimatedSection>
      )}

      {/* Before / After Comparisons */}
      {caseStudy.comparisons && caseStudy.comparisons.length > 0 && (
        <AnimatedSection number={sectionNum()} title="Before & After" viewport={viewport}>
          <motion.div
            className="comparisons-grid"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.15, delayChildren: 0.45 }
              }
            }}
          >
            {caseStudy.comparisons.map((comp, index) => (
              <motion.div key={index} variants={galleryItemVariants}>
                <ImageCompare
                  beforeSrc={comp.before}
                  afterSrc={comp.after}
                  beforeLabel={comp.beforeLabel || 'Before'}
                  afterLabel={comp.afterLabel || 'After'}
                  planetColor={planetColor}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatedSection>
      )}

      {/* Impact */}
      <AnimatedSection
        number={sectionNum()}
        title="Impact"
        viewport={viewport}
      >
        <motion.p className="section-text impact-text" variants={contentVariants}>
          {caseStudy.impact}
        </motion.p>
      </AnimatedSection>

      {/* Tools & Technologies — staggered pop-in */}
      {caseStudy.tools && caseStudy.tools.length > 0 && (
        <AnimatedSection
          number={sectionNum()}
          title="Tools & Technologies"
          viewport={viewport}
        >
          <motion.div
            className="tools-grid"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.06, delayChildren: 0.45 }
              }
            }}
          >
            {caseStudy.tools.map((tool, index) => (
              <motion.div key={index} className="tool-chip" variants={toolChipVariants}>
                {tool}
              </motion.div>
            ))}
          </motion.div>
        </AnimatedSection>
      )}

      {/* Links */}
      {caseStudy.links && Object.keys(caseStudy.links).length > 0 && (
        <motion.section
          className="case-study-section"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="case-study-links">
            {caseStudy.links.prototype && (
              <motion.a
                href={caseStudy.links.prototype}
                className="link-button"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                View Prototype <ArrowRight size={18} />
              </motion.a>
            )}
            {caseStudy.links.live && (
              <motion.a
                href={caseStudy.links.live}
                className="link-button"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                Visit Live Site <ArrowRight size={18} />
              </motion.a>
            )}
          </div>
        </motion.section>
      )}
    </div>
  );
}
