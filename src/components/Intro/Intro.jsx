import { lazy, Suspense, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Lock, Mail, Linkedin, Dribbble } from 'lucide-react';
import Starfield2D from './Starfield2D';
import GateModal from '../UI/GateModal';
import { navigate } from '../../utils/route';
import { isUnlocked } from '../../utils/gate';
import { playCaseStudyOpen, playCaseStudyClose } from '../../utils/sounds';
import { isTouchDevice } from '../../utils/isTouchDevice';
import './Intro.css';

const CaseStudyView = lazy(() => import('./CaseStudyView'));

const EASE = [0.22, 1, 0.36, 1];
const isTouch = isTouchDevice();

function ResumeGlyph() {
  return (
    <svg viewBox="0 0 64 64" className="dest-glyph glyph-resume" aria-hidden="true">
      <line x1="16" y1="10" x2="16" y2="54" className="g-spine" />
      {[16, 32, 48].map((y, i) => (
        <g key={y} style={{ '--i': i }}>
          <circle cx="16" cy={y} r="3.2" className="g-node" />
          <rect x="26" y={y - 3.5} width={30 - i * 6} height="2.4" rx="1.2" className="g-bar" />
          <rect x="26" y={y + 1.5} width={18 - i * 3} height="1.6" rx="0.8" className="g-bar g-bar--dim" />
        </g>
      ))}
    </svg>
  );
}

function CaseGlyph() {
  return (
    <svg viewBox="0 0 64 64" className="dest-glyph glyph-case" aria-hidden="true">
      <rect x="19" y="7" width="26" height="46" rx="5" className="g-frame" />
      <rect x="24" y="16" width="13" height="5" rx="2.5" className="g-bubble" />
      <rect x="27" y="24" width="13" height="5" rx="2.5" className="g-bubble g-bubble--out" />
      <rect x="24" y="32" width="9" height="5" rx="2.5" className="g-bubble" />
      <line x1="21" y1="12" x2="43" y2="12" className="g-scan" />
      <circle cx="45" cy="49" r="8" className="g-badge" />
      <path d="M42 49.5h6v4h-6z M43.2 49.5v-2a1.8 1.8 0 0 1 3.6 0v2" className="g-lock" />
    </svg>
  );
}

function SpaceGlyph() {
  return (
    <svg viewBox="0 0 64 64" className="dest-glyph glyph-space" aria-hidden="true">
      <defs>
        <radialGradient id="g-planet" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffcf8a" />
          <stop offset="45%" stopColor="#ff7700" />
          <stop offset="100%" stopColor="#3a1200" />
        </radialGradient>
        <clipPath id="g-front" clipPathUnits="userSpaceOnUse">
          <rect x="0" y="32" width="64" height="32" />
        </clipPath>
      </defs>
      <g transform="rotate(-18 32 32)">
        <ellipse cx="32" cy="32" rx="27" ry="8" className="g-ring g-ring--back" />
      </g>
      <circle cx="32" cy="32" r="12" fill="url(#g-planet)" />
      <g transform="rotate(-18 32 32)">
        <ellipse cx="32" cy="32" rx="27" ry="8" className="g-ring" clipPath="url(#g-front)" />
      </g>
      <g className="g-orbit"><circle cx="32" cy="6" r="2" className="g-moon" /></g>
    </svg>
  );
}

const DESTINATIONS = [
  {
    id: 'resume',
    index: '01',
    kicker: 'Experience',
    title: 'Resume',
    desc: 'A decade-plus of product design — roles, impact and timeline at a glance.',
    meta: 'Quickest read',
    Glyph: ResumeGlyph,
  },
  {
    id: 'case',
    index: '02',
    kicker: 'Case study',
    title: 'Banana Phone',
    desc: 'Taking Rocket Mortgage’s enterprise communication platform from stalled to shipped.',
    meta: 'Clearance required',
    locked: true,
    Glyph: CaseGlyph,
  },
  {
    id: 'space',
    index: '03',
    kicker: 'Interactive',
    title: 'Explore space',
    desc: 'The full portfolio as a 3D galaxy — case studies, experiments and a few secrets.',
    meta: 'WebGL · Sound on',
    Glyph: SpaceGlyph,
  },
];

function DestinationCard({ dest, onSelect, delay, reduce }) {
  const { Glyph } = dest;
  return (
    <motion.button
      type="button"
      className={`dest-card dest-card--${dest.id}`}
      onClick={() => onSelect(dest.id)}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      <span className="dest-top">
        <span className="dest-index">{dest.index}</span>
        <span className="dest-kicker">{dest.kicker}</span>
      </span>
      <span className="dest-visual"><Glyph /></span>
      <span className="dest-title">
        {dest.title}
        <ArrowUpRight className="dest-arrow" size={20} strokeWidth={1.5} />
      </span>
      <span className="dest-desc">{dest.desc}</span>
      <span className="dest-meta">
        {dest.locked && <Lock size={11} strokeWidth={2} />}
        {dest.meta}
        {!isTouch && <kbd className="dest-key">{Number(dest.index)}</kbd>}
      </span>
    </motion.button>
  );
}

export default function Intro({ path, onExplore, preloadSpace }) {
  const reduce = useReducedMotion();
  const [gateOpen, setGateOpen] = useState(false);
  const onCaseRoute = path === '/banana-phone';
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const showGate = gateOpen || (onCaseRoute && !unlocked);
  const showCase = onCaseRoute && unlocked;

  // Warm the galaxy chunk once the intro has painted and the main thread is idle.
  // Skipped on Save-Data / 2G so resume-only visitors on mobile data don't pay
  // for ~300 KB of three.js they may never use; the warp still loads it on demand.
  useEffect(() => {
    const conn = navigator.connection;
    if (conn?.saveData || /2g/.test(conn?.effectiveType ?? '')) return;
    const idle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    const id = idle(() => preloadSpace(), { timeout: 4000 });
    return () => cancel(id);
  }, [preloadSpace]);

  function select(id) {
    if (id === 'resume') {
      playCaseStudyOpen();
      navigate('/resume');
    } else if (id === 'case') {
      if (unlocked) { playCaseStudyOpen(); navigate('/banana-phone'); }
      else setGateOpen(true);
    } else {
      onExplore();
    }
  }

  useEffect(() => {
    if (showGate || showCase) return;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const dest = DESTINATIONS[Number(e.key) - 1];
      if (dest) select(dest.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function closeGate() {
    setGateOpen(false);
    if (onCaseRoute) navigate('/', { replace: true });
  }

  function gateSuccess() {
    setUnlocked(true);
    setGateOpen(false);
    playCaseStudyOpen();
    navigate('/banana-phone');
  }

  function closeCase() {
    playCaseStudyClose();
    navigate('/');
  }

  const fade = (delay) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay, ease: EASE },
  });

  return (
    <div className="intro page-scroll">
      <div className="intro-sky" aria-hidden="true">
        <Starfield2D className="intro-stars" />
        <div className="intro-nebula" />
        <div className="intro-horizon" />
        <div className="intro-vignette" />
      </div>

      <main className="intro-main">
        <header className="intro-hero">
          <motion.p className="intro-eyebrow" {...fade(0.15)}>
            <span className="intro-pulse" aria-hidden="true" />
            Portfolio — {new Date().getFullYear()}
          </motion.p>

          <h1 className="intro-name">
            {['Taylor', 'Cornelius'].map((word, i) => (
              <span className="intro-name-mask" key={word}>
                <motion.span
                  className="intro-name-word"
                  initial={reduce ? { opacity: 0 } : { y: '110%' }}
                  animate={reduce ? { opacity: 1 } : { y: '0%' }}
                  transition={{ duration: 1.1, delay: 0.25 + i * 0.12, ease: EASE }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p className="intro-role" {...fade(0.6)}>
            Lead Product Designer <span className="intro-sep">/</span> Rocket Mortgage
          </motion.p>

          <motion.p className="intro-statement" {...fade(0.72)}>
            I design AI-assisted tools for one of the largest banking teams in the country —
            turning complex systems into experiences people trust.
          </motion.p>
        </header>

        <section className="intro-choices" aria-labelledby="intro-choose">
          <motion.h2 id="intro-choose" className="intro-choose" {...fade(0.85)}>
            Choose your trajectory
          </motion.h2>
          <div className="dest-grid">
            {DESTINATIONS.map((d, i) => (
              <DestinationCard key={d.id} dest={d} onSelect={select} delay={0.95 + i * 0.1} reduce={reduce} />
            ))}
          </div>
        </section>

        <motion.footer className="intro-footer" {...fade(1.35)}>
          <nav className="intro-links" aria-label="Contact">
            <a href="mailto:tcorneliusart@gmail.com"><Mail size={14} /> tcorneliusart@gmail.com</a>
            <a href="https://www.linkedin.com/in/taylorcornelius/" target="_blank" rel="noreferrer"><Linkedin size={14} /> LinkedIn</a>
            <a href="https://dribbble.com/TCorn" target="_blank" rel="noreferrer"><Dribbble size={14} /> Dribbble</a>
          </nav>
          {!isTouch && <p className="intro-hint">Press <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> to jump</p>}
        </motion.footer>
      </main>

      <GateModal
        open={showGate}
        planetId="case-study-1"
        placement="center"
        onSuccess={gateSuccess}
        onClose={closeGate}
      />

      {showCase && (
        <Suspense fallback={null}>
          <CaseStudyView onClose={closeCase} />
        </Suspense>
      )}
    </div>
  );
}
