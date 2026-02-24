import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ImageCompare from '../UI/ImageCompare';
import JourneyMap from '../UI/JourneyMap';
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
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const phaseRefs = useRef([]);
  const lastScrollY = useRef(0);
  const scrollDirection = useRef('down');
  const visibleSections = useRef(new Set());

  // Track which process phase is currently in view
  useEffect(() => {
    if (!caseStudy?.process || caseStudy.process.length === 0) return;

    const root = scrollContainerRef?.current || null;

    // Track scroll direction
    const handleScroll = () => {
      const currentScrollY = root ? root.scrollTop : window.scrollY;
      scrollDirection.current = currentScrollY > lastScrollY.current ? 'down' : 'up';
      lastScrollY.current = currentScrollY;
    };

    const scrollTarget = root || window;
    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });

    // Single observer for all sections
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = phaseRefs.current.indexOf(entry.target);
          if (index === -1) return;

          if (entry.isIntersecting) {
            visibleSections.current.add(index);
          } else {
            visibleSections.current.delete(index);
          }
        });

        // Determine active section based on visible sections and scroll direction
        if (visibleSections.current.size > 0) {
          const visibleArray = Array.from(visibleSections.current).sort((a, b) => a - b);
          const viewportHeight = root ? root.clientHeight : window.innerHeight;

          let activeIndex = visibleArray[0];

          if (scrollDirection.current === 'down') {
            // Scrolling DOWN: activate the highest-indexed section that has entered viewport
            // This makes the beam move forward as soon as a new section appears
            activeIndex = visibleArray[visibleArray.length - 1];
          } else {
            // Scrolling UP: activate section whose top is above the 40% trigger point
            // This makes the beam move back when you scroll up past a section
            const triggerPoint = viewportHeight * 0.4;

            for (const idx of visibleArray) {
              const el = phaseRefs.current[idx];
              if (el) {
                const rect = el.getBoundingClientRect();
                const containerRect = root ? root.getBoundingClientRect() : { top: 0 };
                const relativeTop = rect.top - containerRect.top;

                if (relativeTop <= triggerPoint) {
                  activeIndex = idx;
                }
              }
            }
          }

          setCurrentPhaseIndex(activeIndex);
        }
      },
      {
        root,
        rootMargin: '0px 0px 0px 0px',
        threshold: [0, 0.05, 0.1]
      }
    );

    // Observe all phase sections
    phaseRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
      scrollTarget.removeEventListener('scroll', handleScroll);
    };
  }, [caseStudy?.process, scrollContainerRef]);

  // Handle click on journey map waypoint - scroll to that phase
  const handlePhaseClick = (index) => {
    const phaseElement = phaseRefs.current[index];
    if (phaseElement) {
      phaseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (!caseStudy) return null;

  const viewport = {
    root: scrollContainerRef,
    once: true,
    amount: 0.15
  };

  // Auto-incrementing section counter
  let _sectionCounter = 0;
  const sectionNum = () => String(++_sectionCounter).padStart(2, '0');

  const cssVars = {
    '--planet-color': planetColor,
    '--planet-color-rgb': planetColor
      .replace('#', '')
      .match(/.{2}/g)
      .map((x) => parseInt(x, 16))
      .join(', ')
  };

  return (
    <div className="case-study-layout" style={cssVars}>
      {/* Sidebar with Journey Map */}
      {caseStudy.process && caseStudy.process.length > 0 && (
        <aside className="case-study-sidebar">
          <JourneyMap
            phases={caseStudy.process}
            currentPhaseIndex={currentPhaseIndex}
            planetColor={planetColor}
            onPhaseClick={handlePhaseClick}
          />
        </aside>
      )}

      {/* Main Content */}
      <div className="case-study">
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

      {/* Process Phases — each phase gets its own section */}
      {caseStudy.process && caseStudy.process.map((phase, index) => (
        <div
          key={phase.title || index}
          ref={(el) => (phaseRefs.current[index] = el)}
        >
          <AnimatedSection
            number={sectionNum()}
            title={phase.title}
            viewport={viewport}
          >
            <motion.p className="section-text" variants={contentVariants}>
              {phase.description}
            </motion.p>
            {phase.image && (
              <motion.div
                className="process-image"
                variants={galleryItemVariants}
              >
                <img src={phase.image} alt={phase.title} />
              </motion.div>
            )}
          </AnimatedSection>
        </div>
      ))}

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
    </div>
  );
}
