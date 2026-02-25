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
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(-1);

  // Refs for the 5 fixed journey map sections
  const overviewRef = useRef(null);
  const challengeRef = useRef(null);
  const solutionRef = useRef(null);
  const phaseRefs = useRef([]);   // all process phase divs → waypoint index 3
  const impactRef = useRef(null);

  const lastScrollY = useRef(0);
  const scrollDirection = useRef('down');

  // Track which of the 5 fixed waypoint sections is in view
  useEffect(() => {
    if (!caseStudy) return;

    const root = scrollContainerRef?.current || null;

    let hasScrolled = false;

    const handleScroll = () => {
      hasScrolled = true;
      const currentScrollY = root ? root.scrollTop : window.scrollY;
      scrollDirection.current = currentScrollY > lastScrollY.current ? 'down' : 'up';
      lastScrollY.current = currentScrollY;
    };

    const scrollTarget = root || window;
    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });

    // Map every observed element to its waypoint index (0–4)
    // All process phase divs map to index 3 ("Process")
    const sections = [
      { el: overviewRef.current,  idx: 0 },
      { el: challengeRef.current, idx: 1 },
      { el: solutionRef.current,  idx: 2 },
      ...(phaseRefs.current.filter(Boolean).map(el => ({ el, idx: 3 }))),
      { el: impactRef.current,    idx: 4 }
    ].filter(s => s.el);

    const elementToIdx = new Map(sections.map(s => [s.el, s.idx]));
    const visibleIndices = new Set();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = elementToIdx.get(entry.target);
          if (idx === undefined) return;
          if (entry.isIntersecting) {
            visibleIndices.add(idx);
          } else {
            visibleIndices.delete(idx);
          }
        });

        if (visibleIndices.size > 0) {
          const arr = Array.from(visibleIndices).sort((a, b) => a - b);
          // Before any scroll: always show the topmost visible section (avoids false-activating
          // lower sections that are all visible simultaneously on initial render)
          // After scrolling: use direction to determine which section is "active"
          const active = !hasScrolled
            ? arr[0]
            : scrollDirection.current === 'down' ? arr[arr.length - 1] : arr[0];
          setCurrentPhaseIndex(active);
        }
      },
      {
        root,
        // Trigger only when section enters top 85% of viewport (15% from bottom)
        rootMargin: '0px 0px -15% 0px',
        threshold: 0
      }
    );

    sections.forEach(({ el }) => observer.observe(el));

    return () => {
      observer.disconnect();
      scrollTarget.removeEventListener('scroll', handleScroll);
    };
  }, [caseStudy, scrollContainerRef]);

  // Scroll to the section corresponding to the clicked waypoint index (0–4)
  const handlePhaseClick = (index) => {
    const targets = [
      overviewRef.current,
      challengeRef.current,
      solutionRef.current,
      phaseRefs.current[0],  // first process phase = top of Process section
      impactRef.current
    ];
    targets[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!caseStudy) return null;

  // Fixed 5 waypoints — always correspond to the actual page sections
  const journeyWaypoints = [
    { title: 'Overview' },
    { title: 'Challenge' },
    { title: 'Solution' },
    { title: 'Process' },
    { title: 'Impact' }
  ];

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
      .join(', '),
    '--accent-color': caseStudy.accentColor || planetColor
  };

  return (
    <div className="case-study-layout" style={cssVars}>
      {/* Sidebar with Journey Map */}
      {journeyWaypoints.length > 0 && (
        <aside className="case-study-sidebar">
          <JourneyMap
            phases={journeyWaypoints}
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
      <div ref={overviewRef}>
        <AnimatedSection number={sectionNum()} title="Overview" viewport={viewport}>
          <motion.p className="section-text" variants={contentVariants}>
            {caseStudy.overview}
          </motion.p>
        </AnimatedSection>
      </div>

      {/* Challenge */}
      <div ref={challengeRef}>
        <AnimatedSection number={sectionNum()} title="Challenge" viewport={viewport}>
          <motion.p className="section-text" variants={contentVariants}>
            {caseStudy.challenge}
          </motion.p>
        </AnimatedSection>
      </div>

      {/* Solution */}
      <div ref={solutionRef}>
        <AnimatedSection number={sectionNum()} title="Solution" viewport={viewport}>
          <motion.p className="section-text" variants={contentVariants}>
            {caseStudy.solution}
          </motion.p>
        </AnimatedSection>
      </div>

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
      <div ref={impactRef}>
      <AnimatedSection
        number={sectionNum()}
        title="Impact"
        viewport={viewport}
      >
        <motion.p className="section-text" variants={contentVariants}>
          {caseStudy.impact}
        </motion.p>

        {/* Metric dashboard cards */}
        {caseStudy.metrics && caseStudy.metrics.length > 0 && (
          <motion.div
            className="metrics-grid"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08, delayChildren: 0.55 } }
            }}
          >
            {caseStudy.metrics.map((metric, index) => (
              <motion.div key={index} className="metric-card" variants={cardVariants}>
                <span className="metric-value">{metric.value}</span>
                <span className="metric-label">{metric.label}</span>
                {metric.sublabel && (
                  <span className="metric-sublabel">{metric.sublabel}</span>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatedSection>
      </div>

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
