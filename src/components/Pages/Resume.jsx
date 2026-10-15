import { useEffect, useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, Download, Mail, Phone, Globe, Linkedin, Lock, Award, GraduationCap } from 'lucide-react';
import Starfield2D from '../Intro/Starfield2D';
import { resume } from '../../data/resume';
import { navigate } from '../../utils/route';
import { playCaseStudyClose, playCaseStudyOpen } from '../../utils/sounds';
import './Resume.css';

const EASE = [0.22, 1, 0.36, 1];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function toDate(label) {
  if (label === 'Present') return new Date();
  const [month, year] = label.split(' ');
  return new Date(Number(year), MONTHS.indexOf(month), 1);
}

function tenure(start, end) {
  const months = Math.max(1,
    (toDate(end).getFullYear() - toDate(start).getFullYear()) * 12 +
    toDate(end).getMonth() - toDate(start).getMonth());
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y} yr${y > 1 ? 's' : ''}`, m && `${m} mo${m > 1 ? 's' : ''}`].filter(Boolean).join(' ');
}

const short = (label) => (label === 'Present' ? 'Present' : `${label.slice(0, 3)} ${label.split(' ')[1]}`);

function Role({ job, index }) {
  return (
    <motion.li
      className={`rs-role${job.current ? ' rs-role--current' : ''}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      <div className="rs-when">
        <span className="rs-dates">{short(job.start)} — {short(job.end)}</span>
        <span className="rs-tenure">{tenure(job.start, job.end)}</span>
      </div>

      <span className="rs-node" aria-hidden="true">
        {job.current && <span className="rs-node-orbit" />}
      </span>

      <article className="rs-card">
        <header className="rs-card-head">
          <span className="rs-card-index">{String(index + 1).padStart(2, '0')}</span>
          <div>
            <h3 className="rs-role-title">{job.role}</h3>
            <p className="rs-company">
              {job.company}
              <span className="rs-dot" aria-hidden="true">·</span>
              <span className="rs-mode">{job.mode}</span>
              {job.current && <span className="rs-now">Now</span>}
            </p>
          </div>
        </header>
        <ul className="rs-bullets">
          {job.bullets.map((b) => <li key={b}>{b}</li>)}
        </ul>
      </article>
    </motion.li>
  );
}

export default function Resume({ onExplore }) {
  const scrollRef = useRef(null);
  const timelineRef = useRef(null);
  const { scrollYProgress } = useScroll({
    container: scrollRef,
    target: timelineRef,
    offset: ['start 65%', 'end 65%'],
  });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  function back() {
    playCaseStudyClose();
    navigate('/');
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') back(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hero = (delay) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay, ease: EASE },
  });

  return (
    <div className="resume page-scroll" ref={scrollRef}>
      <div className="rs-sky" aria-hidden="true">
        <Starfield2D className="rs-stars" />
        <div className="rs-glow" />
      </div>

      <header className="rs-bar">
        <button type="button" className="rs-bar-btn" onClick={back}>
          <ArrowLeft size={15} /> <span>Home</span>
        </button>
        <span className="rs-bar-name">{resume.name}</span>
        <a className="rs-bar-btn rs-bar-btn--primary" href={resume.pdf} download>
          <Download size={15} /> <span>PDF</span>
        </a>
      </header>

      <main className="rs-main">
        <section className="rs-hero">
          <motion.p className="rs-eyebrow" {...hero(0.05)}>Résumé</motion.p>
          <motion.h1 className="rs-name" {...hero(0.12)}>{resume.name}</motion.h1>
          <motion.p className="rs-title" {...hero(0.2)}>{resume.title}</motion.p>
          <motion.p className="rs-summary" {...hero(0.28)}>{resume.summary}</motion.p>
          <motion.ul className="rs-contact" {...hero(0.36)}>
            <li><a href={`mailto:${resume.email}`}><Mail size={14} />{resume.email}</a></li>
            <li><a href={`tel:${resume.phone.replace(/\D/g, '')}`}><Phone size={14} />{resume.phone}</a></li>
            <li><a href={`https://${resume.site}`} target="_blank" rel="noreferrer"><Globe size={14} />{resume.site}</a></li>
            <li><a href={resume.linkedin} target="_blank" rel="noreferrer"><Linkedin size={14} />LinkedIn</a></li>
          </motion.ul>
        </section>

        <section className="rs-section" aria-labelledby="rs-exp">
          <h2 id="rs-exp" className="rs-heading"><span>Experience</span></h2>
          <div className="rs-timeline" ref={timelineRef}>
            <div className="rs-spine" aria-hidden="true">
              <motion.div className="rs-spine-fill" style={{ scaleY: fill }} />
            </div>
            <ol className="rs-roles">
              {resume.experience.map((job, i) => <Role key={job.role + job.start} job={job} index={i} />)}
            </ol>
          </div>
        </section>

        <section className="rs-section rs-extras">
          <motion.div
            className="rs-panel"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <h2 className="rs-panel-title"><GraduationCap size={16} /> Education</h2>
            <ul className="rs-panel-list">
              {resume.education.map((e) => (
                <li key={e.title}><strong>{e.title}</strong><span>{e.org}</span></li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            className="rs-panel"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.8, delay: 0.08, ease: EASE }}
          >
            <h2 className="rs-panel-title"><Award size={16} /> Awards</h2>
            <ul className="rs-panel-list">
              {resume.awards.map((a) => <li key={a}><strong>{a}</strong></li>)}
            </ul>
          </motion.div>
        </section>

        <section className="rs-cta">
          <p className="rs-cta-kicker">Next</p>
          <h2 className="rs-cta-title">See the work behind it</h2>
          <div className="rs-cta-actions">
            <button type="button" className="rs-cta-btn" onClick={() => { playCaseStudyOpen(); navigate('/banana-phone'); }}>
              <Lock size={14} /> Banana Phone case study <ArrowUpRight size={16} />
            </button>
            <button type="button" className="rs-cta-btn rs-cta-btn--ghost" onClick={onExplore}>
              Explore space <ArrowUpRight size={16} />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
