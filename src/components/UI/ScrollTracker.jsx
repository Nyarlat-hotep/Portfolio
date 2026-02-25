import { useEffect, useRef, useCallback } from 'react';
import './ScrollTracker.css';

const INSET = 100;       // px inset from each end of the line
const ABSORB_DIST = 18;  // px center-to-center → triggers absorption

export default function ScrollTracker({ sections = [], scrollContainerRef, planetColor = '#a855f7' }) {
  const containerRef = useRef(null);
  const amoebaRef    = useRef(null);
  const dotRefs      = useRef([]);

  const fractionsRef = useRef(null);
  const absorbedRef  = useRef(new Array(sections.length).fill(false));

  // ── Sync tracker visual height to the scroll container's actual clientHeight.
  //    CSS starts at 100vh (always visible) and this corrects it.
  //    ResizeObserver is used instead of useLayoutEffect because the overlay-content
  //    is a motion.div whose layout can be measured only after Framer Motion's
  //    initial commit — useLayoutEffect fires too early on first mount.
  useEffect(() => {
    const container = scrollContainerRef?.current;
    const trackerEl = containerRef.current;
    if (!container || !trackerEl) return;

    const syncHeight = () => {
      const h = container.clientHeight;
      if (h > 0) trackerEl.style.height = h + 'px';
    };

    syncHeight(); // try immediately (works after first paint)

    const ro = new ResizeObserver(syncHeight); // reliable fallback
    ro.observe(container);

    return () => ro.disconnect();
  }, [scrollContainerRef]);

  // ── All position math uses container.clientHeight, NOT trackerEl.clientHeight.
  //    This means the amoeba and dot positions are correct even during the brief
  //    window before ResizeObserver corrects the tracker's visual height.

  const computeFractions = useCallback(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) return;

    fractionsRef.current = sections.map(({ ref }) => {
      const el = ref?.current;
      if (!el) return null;
      // Scroll-invariant: getBoundingClientRect.top decreases by the same
      // amount that scrollTop increases, so elTop stays constant while scrolling.
      const elTop =
        el.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop;
      return Math.max(0, Math.min(1, elTop / maxScroll));
    });
  }, [sections, scrollContainerRef]);

  const setDotPositions = useCallback(() => {
    const container = scrollContainerRef?.current;
    if (!container || !fractionsRef.current) return;
    const h     = container.clientHeight;
    const range = h - 2 * INSET;
    fractionsRef.current.forEach((fraction, i) => {
      if (fraction === null) return;
      const dotEl = dotRefs.current[i];
      if (dotEl) dotEl.style.top = (INSET + fraction * range) + 'px';
    });
  }, [scrollContainerRef]);

  const updateAmoeba = useCallback(() => {
    const container = scrollContainerRef?.current;
    const amoeba    = amoebaRef.current;
    if (!container || !amoeba || !fractionsRef.current) return;

    const h        = container.clientHeight;
    const range    = h - 2 * INSET;
    const maxScroll = container.scrollHeight - container.clientHeight;
    const progress  = maxScroll > 0 ? container.scrollTop / maxScroll : 0;
    const amoebaY   = INSET + progress * range;
    amoeba.style.top = amoebaY + 'px';

    fractionsRef.current.forEach((fraction, i) => {
      if (fraction === null) return;
      const dotEl = dotRefs.current[i];
      if (!dotEl) return;

      const dotY        = INSET + fraction * range;
      const dist        = Math.abs(amoebaY - dotY);
      const wasAbsorbed = absorbedRef.current[i];

      if (dist < ABSORB_DIST && !wasAbsorbed) {
        absorbedRef.current[i] = true;
        dotEl.dataset.state = 'absorbing';
        const onDotEnd = () => {
          dotEl.dataset.state = 'absorbed';
          dotEl.removeEventListener('animationend', onDotEnd);
        };
        dotEl.addEventListener('animationend', onDotEnd);

        amoeba.classList.remove('amoeba-absorb');
        void amoeba.offsetWidth;
        amoeba.classList.add('amoeba-absorb');
        const onAmoebaEnd = () => {
          amoeba.classList.remove('amoeba-absorb');
          amoeba.removeEventListener('animationend', onAmoebaEnd);
        };
        amoeba.addEventListener('animationend', onAmoebaEnd);

      } else if (dist >= ABSORB_DIST && wasAbsorbed) {
        absorbedRef.current[i] = false;
        dotEl.dataset.state = 'withdrawing';
        const onDotEnd = () => {
          dotEl.dataset.state = 'dim';
          dotEl.removeEventListener('animationend', onDotEnd);
        };
        dotEl.addEventListener('animationend', onDotEnd);
      }
    });
  }, [scrollContainerRef]);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;

    // Delay so the overlay's entrance animation has settled before we read
    // getBoundingClientRect for section positions.
    const initTimer = setTimeout(() => {
      computeFractions();
      setDotPositions();
      updateAmoeba();
    }, 420);

    const onScroll = () => updateAmoeba();
    const onResize = () => {
      computeFractions();
      setDotPositions();
      updateAmoeba();
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      clearTimeout(initTimer);
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [scrollContainerRef, computeFractions, setDotPositions, updateAmoeba]);

  const handleDotClick = (i) => {
    const el = sections[i]?.ref?.current;
    if (!el) return;
    const container = scrollContainerRef?.current;
    if (container) {
      const elTop =
        el.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop;
      container.scrollTo({ top: elTop, behavior: 'smooth' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const cssVars = {
    '--planet-color': planetColor,
    '--planet-color-rgb': planetColor
      .replace('#', '')
      .match(/.{2}/g)
      .map((x) => parseInt(x, 16))
      .join(', ')
  };

  return (
    <div className="scroll-tracker" ref={containerRef} style={cssVars}>
      <div className="tracker-fade tracker-fade-top" />
      <div className="tracker-fade tracker-fade-bottom" />
      <div className="tracker-line" />

      {sections.map((section, i) => (
        <button
          key={section.label}
          ref={(el) => (dotRefs.current[i] = el)}
          className="tracker-dot"
          style={{ top: INSET + 'px' }}
          onClick={() => handleDotClick(i)}
          title={section.label}
          aria-label={`Scroll to ${section.label}`}
        />
      ))}

      <div ref={amoebaRef} className="tracker-amoeba" style={{ top: INSET + 'px' }} />
    </div>
  );
}
