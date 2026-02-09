import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './JourneyMap.css';

export default function JourneyMap({
  phases,
  currentPhaseIndex = -1,
  planetColor = '#a855f7',
  onPhaseClick
}) {
  const [beam, setBeam] = useState(null); // { origin, target, key }
  const prevPhaseRef = useRef(-1);
  const waypointRefs = useRef([]);
  const trackRef = useRef(null);
  const animatingRef = useRef(false);
  const pendingPhaseRef = useRef(null);

  // Process phase change - may queue if animation in progress
  const processPhaseChange = useCallback((newPhase) => {
    const origin = prevPhaseRef.current;

    // Update tracking ref
    prevPhaseRef.current = newPhase;

    // Skip if same phase or no valid origin
    if (origin < 0 || origin === newPhase) return;

    // If animation in progress, store the pending target
    if (animatingRef.current) {
      pendingPhaseRef.current = newPhase;
      return;
    }

    // Start animation
    animatingRef.current = true;
    setBeam({
      origin,
      target: newPhase,
      key: `${origin}-${newPhase}-${Date.now()}`
    });
  }, []);

  // Handle animation complete
  const handleAnimationComplete = useCallback(() => {
    animatingRef.current = false;
    setBeam(null);

    // Process any pending phase change
    if (pendingPhaseRef.current !== null) {
      const pending = pendingPhaseRef.current;
      pendingPhaseRef.current = null;

      // Only animate if it's different from current
      if (pending !== prevPhaseRef.current) {
        processPhaseChange(pending);
      }
    }
  }, [processPhaseChange]);

  // Detect phase changes
  useEffect(() => {
    if (currentPhaseIndex >= 0 && currentPhaseIndex !== prevPhaseRef.current) {
      processPhaseChange(currentPhaseIndex);
    } else if (currentPhaseIndex >= 0 && prevPhaseRef.current < 0) {
      // Initial load - just set the ref without animating
      prevPhaseRef.current = currentPhaseIndex;
    }
  }, [currentPhaseIndex, processPhaseChange]);

  // Clear animation after duration
  useEffect(() => {
    if (beam) {
      const timer = setTimeout(handleAnimationComplete, 700);
      return () => clearTimeout(timer);
    }
  }, [beam, handleAnimationComplete]);

  if (!phases || phases.length === 0) return null;

  // Calculate beam animation values based on waypoint positions
  const getBeamAnimation = () => {
    if (!beam) return { initial: {}, animate: {} };

    const originEl = waypointRefs.current[beam.origin];
    const targetEl = waypointRefs.current[beam.target];
    const trackEl = trackRef.current;

    if (!originEl || !targetEl || !trackEl) return { initial: {}, animate: {} };

    const trackRect = trackEl.getBoundingClientRect();
    const originRect = originEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    // Calculate center positions
    const originCenter = originRect.top - trackRect.top + originRect.height / 2;
    const targetCenter = targetRect.top - trackRect.top + targetRect.height / 2;

    // Beam height offset (beam is 24px tall, center it)
    const beamOffset = 12;

    const startY = originCenter - beamOffset;
    // Stop 80% of the way to fade out before reaching target
    const distance = targetCenter - originCenter;
    const endY = originCenter + (distance * 0.75) - beamOffset;

    return {
      initial: {
        top: startY,
        opacity: 1
      },
      animate: {
        top: endY,
        opacity: [1, 1, 0]
      }
    };
  };

  const beamAnimation = getBeamAnimation();

  return (
    <div
      className="journey-map"
      style={{
        '--planet-color': planetColor,
        '--planet-color-rgb': planetColor
          .replace('#', '')
          .match(/.{2}/g)
          .map((x) => parseInt(x, 16))
          .join(', ')
      }}
    >
      <div className="journey-label">Flight Path</div>

      <div className="journey-track" ref={trackRef}>
        {/* Animated beam that travels between waypoints */}
        <AnimatePresence mode="wait">
          {beam && (
            <motion.div
              key={beam.key}
              className="journey-beam"
              initial={beamAnimation.initial}
              animate={beamAnimation.animate}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.4, 0, 0.2, 1],
                opacity: { duration: 0.6, times: [0, 0.7, 1] }
              }}
            />
          )}
        </AnimatePresence>

        {/* Waypoints */}
        {phases.map((phase, index) => {
          const isActive = index === currentPhaseIndex;
          const isPast = index < currentPhaseIndex;
          const isBeamTarget = beam?.target === index;

          return (
            <button
              key={phase.title || index}
              ref={(el) => (waypointRefs.current[index] = el)}
              className={`journey-waypoint ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
              onClick={() => onPhaseClick?.(index)}
              title={phase.title}
            >
              <div className="waypoint-marker">
                <div className="waypoint-dot" />
                {/* CSS-animated pulse for stability */}
                {isActive && <div className="waypoint-pulse" />}
                {/* Burst effect when beam arrives */}
                <AnimatePresence>
                  {isBeamTarget && (
                    <motion.div
                      key="burst"
                      className="waypoint-burst"
                      initial={{ scale: 0.5, opacity: 1 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  )}
                </AnimatePresence>
              </div>
              <div className="waypoint-label">{phase.title}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
