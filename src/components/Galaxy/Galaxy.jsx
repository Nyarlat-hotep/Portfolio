import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { TrackballControls, PerspectiveCamera } from '@react-three/drei';
import { useState, useEffect, Suspense, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Move, ZoomIn, X } from 'lucide-react';
import './Galaxy.css';
import Planet from './Planet';
import CustomPlanet from './CustomPlanet';
import Starfield from './Starfield';
import CosmicVoid from './CosmicVoid';
import VoidVignette from './VoidVignette';
import CameraController from './CameraController';
import Constellation from './Constellation';
import ShootingStars from './ShootingStars';
import DistantGalaxy from './DistantGalaxy';
import GravityField from './GravityField';
import Asteroid from './Asteroid';
import BottomNav from '../Navigation/BottomNav';
import LightspeedTransition from '../UI/LightspeedTransition';
import PresentationMode from '../UI/PresentationMode';
import '../UI/PresentationMode.css';
import { planetsData, getAdjacentPlanet } from '../../data/planets';
import { isWebGLSupported } from '../../utils/webglDetect';
import { isTouchDevice } from '../../utils/isTouchDevice';

// Check WebGL support once on module load
const webGLSupported = isWebGLSupported();

// Check touch once on module load for UI hints
const isTouch = isTouchDevice();

// Intro animation duration (4 seconds for snappy zoom)
const INTRO_DURATION = 4;

// Component that signals when scene is ready (placed inside Suspense)
function SceneReadySignal({ onReady }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return null;
}

// Handles mobile taps by doing real Three.js raycasting inside the Canvas context,
// completely bypassing DOM event interception by TrackballControls.
function MobileTapHandler({ pendingTapRef }) {
  const { camera, raycaster, scene, gl } = useThree();

  useFrame(() => {
    const tap = pendingTapRef.current;
    if (!tap) return;
    pendingTapRef.current = null;

    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    const x = ((tap.x - rect.left) / rect.width) * 2 - 1;
    const y = -((tap.y - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera({ x, y }, camera);
    const hits = raycaster.intersectObjects(scene.children, true);

    for (const hit of hits) {
      const handler = hit.object.__r3f?.handlers?.onClick;
      if (handler) {
        handler({ stopPropagation: () => {}, ...hit });
        break;
      }
    }
  });

  return null;
}

// Fallback UI for browsers without WebGL
function WebGLFallback() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontFamily: 'monospace',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        fontSize: '48px',
        marginBottom: '20px',
        color: '#a855f7'
      }}>
        3D
      </div>
      <h1 style={{
        fontSize: '24px',
        marginBottom: '16px',
        color: '#00d4ff'
      }}>
        WebGL Not Supported
      </h1>
      <p style={{
        fontSize: '14px',
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: '24px',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        This portfolio uses 3D graphics that require WebGL. Please try using a modern browser like Chrome, Firefox, or Safari with hardware acceleration enabled.
      </p>
    </div>
  );
}

// Glitchy text effect - randomly corrupts characters
function GlitchText({ children, active = true }) {
  const [text, setText] = useState(children);
  const glitchChars = '!@#$%^&*_+-=|;:<>?/\\~`01';

  useEffect(() => {
    if (!active || typeof children !== 'string') return;

    let restoreTimeout = null;
    const interval = setInterval(() => {
      // More frequent glitches (60% chance each interval)
      if (Math.random() > 0.4) {
        const chars = children.split('');
        // Glitch 1-2 characters at a time
        const numGlitches = Math.random() > 0.5 ? 2 : 1;
        for (let g = 0; g < numGlitches; g++) {
          const idx = Math.floor(Math.random() * chars.length);
          chars[idx] = glitchChars[Math.floor(Math.random() * glitchChars.length)];
        }
        setText(chars.join(''));
        // Restore after brief glitch — tracked so it can be cancelled on unmount
        restoreTimeout = setTimeout(() => setText(children), 60);
      }
    }, 800);

    return () => {
      clearInterval(interval);
      if (restoreTimeout) clearTimeout(restoreTimeout);
    };
  }, [children, active]);

  return <span>{text}</span>;
}

export default function Galaxy({ onPlanetClick, activePlanetId, customPlanet, onCreatePlanet, onDeletePlanet, isCustomPlanetDeleting }) {
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const [hoveredPlanetPosition, setHoveredPlanetPosition] = useState(null);
  const [currentPlanetIndex, setCurrentPlanetIndex] = useState(0);
  const [vignetteIntensity, setVignetteIntensity] = useState(0);
  const [constellationModal, setConstellationModal] = useState(null); // { name, wikiKey, text, loading }
  const wikiCacheRef = useRef({});

  // Intro animation state
  const [sceneReady, setSceneReady] = useState(false);
  const [isIntroActive, setIsIntroActive] = useState(false);
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const introCompletedRef = useRef(false);
  const welcomeTimeoutRef = useRef(null);
  const welcomeShownRef   = useRef(false);
  const controlsRef = useRef(null);
  const shootingStarsRef = useRef();
  const containerRef = useRef(null);
  const pendingTapRef = useRef(null);
  const [asteroidModalOpen,  setAsteroidModalOpen]  = useState(false);
  const [codexInput,         setCodexInput]         = useState('');
  const [codexError,         setCodexError]         = useState(false);
  const [warpActive,         setWarpActive]          = useState(false);
  const [presentationOpen,   setPresentationOpen]   = useState(false);

  // Ref-stable wrapper — prevents handler useMemo/useCallback deps from invalidating
  // when parent passes a new onPlanetClick function reference on each render
  const onPlanetClickRef = useRef(onPlanetClick);
  onPlanetClickRef.current = onPlanetClick;

  // Start intro only after scene is ready (runs once)
  useEffect(() => {
    if (sceneReady && !introCompletedRef.current && !isIntroActive) {
      const timer = setTimeout(() => {
        setIsIntroActive(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [sceneReady, isIntroActive]);

  // Memoized hover handler - same for all planets
  const handleHover = useCallback((name, screenPosition) => {
    setHoveredPlanet(name);
    setHoveredPlanetPosition(screenPosition);
  }, []);

  // Pre-compute planet label color values — avoids hex parsing on every render
  const hoveredColor    = hoveredPlanetPosition?.color || '#00d4ff';
  const hoveredColorRgb = useMemo(() => {
    const c = hoveredPlanetPosition?.color || '#00d4ff';
    return c.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16)).join(', ');
  }, [hoveredPlanetPosition?.color]);

  // Memoized vignette handler
  const handleVignetteChange = useCallback((intensity) => {
    setVignetteIntensity(intensity);
  }, []);

  // Mobile tap detection — TrackballControls intercepts all touch events.
  // We detect taps here and hand off to MobileTapHandler (inside Canvas) which
  // does real Three.js raycasting via useThree, bypassing DOM events entirely.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let tapData = null;

    const onTouchStart = (e) => {
      const t = e.touches[0];
      tapData = { x: t.clientX, y: t.clientY, time: performance.now() };
    };

    const onTouchEnd = (e) => {
      if (!tapData) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - tapData.x;
      const dy = t.clientY - tapData.y;
      const dt = performance.now() - tapData.time;
      tapData = null;
      if (Math.sqrt(dx * dx + dy * dy) < 12 && dt < 300) {
        // Signal MobileTapHandler (inside Canvas) to raycast on next frame
        pendingTapRef.current = { x: t.clientX, y: t.clientY };
      }
    };

    // capture: true ensures these fire before TrackballControls' bubble-phase handlers
    container.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    container.addEventListener('touchend', onTouchEnd, { capture: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart, { capture: true });
      container.removeEventListener('touchend', onTouchEnd, { capture: true });
    };
  }, []);

  const handleDoubleClick = useCallback(() => {
    shootingStarsRef.current?.trigger();
  }, []);

  // Asteroid click — open codex modal
  const handleAsteroidClick = useCallback(() => {
    setAsteroidModalOpen(true);
    setCodexInput('');
    setCodexError(false);
  }, []);

  const handleCodexSubmit = useCallback(() => {
    if (codexInput.trim().toLowerCase() === "r'lyeh") {
      setAsteroidModalOpen(false);
      setCodexInput('');
      setWarpActive(true);
    } else {
      setCodexError(true);
      setTimeout(() => setCodexError(false), 400);
    }
  }, [codexInput]);

  const handleCodexKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleCodexSubmit();
  }, [handleCodexSubmit]);

  // Memoized click handlers per planet — stable forever via ref, no dep on onPlanetClick
  const planetClickHandlers = useMemo(() => {
    return planetsData.reduce((handlers, planet, index) => {
      handlers[planet.id] = () => {
        setCurrentPlanetIndex(index);
        onPlanetClickRef.current?.(planet);
      };
      return handlers;
    }, {});
  }, []);

  // Memoized void click handler — stable via ref
  const handleVoidClick = useCallback(() => {
    onPlanetClickRef.current?.({ id: 'experiments', name: 'Experiments', color: '#6b2fa0' });
  }, []);

  // Constellation select — fetch Wikipedia summary, cache per session
  const handleConstellationSelect = useCallback(async (constellation) => {
    setConstellationModal({ name: constellation.name, wikiKey: constellation.wikiKey, text: null, loading: true });

    if (wikiCacheRef.current[constellation.wikiKey]) {
      setConstellationModal({ name: constellation.name, wikiKey: constellation.wikiKey, text: wikiCacheRef.current[constellation.wikiKey], loading: false });
      return;
    }

    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${constellation.wikiKey}`);
      const data = await res.json();
      const text = data.extract || 'No information available.';
      wikiCacheRef.current[constellation.wikiKey] = text;
      setConstellationModal({ name: constellation.name, wikiKey: constellation.wikiKey, text, loading: false });
    } catch {
      setConstellationModal({ name: constellation.name, wikiKey: constellation.wikiKey, text: 'Could not retrieve data.', loading: false });
    }
  }, []);

  // Handle intro zoom complete
  const handleIntroComplete = useCallback(() => {
    setIsIntroActive(false);
    introCompletedRef.current = true;
  }, []);

  // Cancel intro zoom on user interaction
  const cancelIntro = useCallback(() => {
    if (!introCompletedRef.current) {
      introCompletedRef.current = true;
      setIsIntroActive(false);
    }
  }, []);

  // Handle nav expansion change from BottomNav
  const handleNavExpandChange = useCallback((expanded) => {
    setIsNavExpanded(expanded);
  }, []);

  // Show welcome text once per page load — only on first nav open, never again
  useEffect(() => {
    if (isNavExpanded && !welcomeShownRef.current) {
      welcomeShownRef.current = true; // mark immediately so re-opens don't re-trigger
      welcomeTimeoutRef.current = setTimeout(() => {
        setShowWelcome(true);
      }, 1600);
    }

    if (!isNavExpanded) {
      setShowWelcome(false); // hide when nav closes
    }

    return () => {
      if (welcomeTimeoutRef.current) {
        clearTimeout(welcomeTimeoutRef.current);
      }
    };
  }, [isNavExpanded]);

  // Return fallback UI if WebGL is not supported
  if (!webGLSupported) {
    return <WebGLFallback />;
  }

  // Void position - behind the user's starting camera angle (camera faces -Z, void is at +Z)
  const voidPosition = [0, 0, 80];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (presentationOpen) return;
      if (e.key === 'ArrowLeft') {
        const currentId = planetsData[currentPlanetIndex].id;
        const prevPlanet = getAdjacentPlanet(currentId, 'prev');
        const prevIndex = planetsData.findIndex(p => p.id === prevPlanet.id);
        setCurrentPlanetIndex(prevIndex);
        onPlanetClickRef.current?.(prevPlanet);
      } else if (e.key === 'ArrowRight') {
        const currentId = planetsData[currentPlanetIndex].id;
        const nextPlanet = getAdjacentPlanet(currentId, 'next');
        const nextIndex = planetsData.findIndex(p => p.id === nextPlanet.id);
        setCurrentPlanetIndex(nextIndex);
        onPlanetClickRef.current?.(nextPlanet);
      } else if (e.key === 'Escape') {
        // Return to home view
        const homePlanet = planetsData.find(p => p.id === 'home');
        onPlanetClickRef.current?.(homePlanet);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPlanetIndex, presentationOpen]);

  // Shift+P — skip codex, go straight to warp
  useEffect(() => {
    const handler = (e) => {
      if (e.shiftKey && e.key === 'P') {
        setAsteroidModalOpen(false);
        setWarpActive(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
      style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--space-dark)',
        opacity: sceneReady ? 1 : 0,
        transition: 'opacity 0.5s ease-in'
      }}
    >
      <Canvas
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        {/* Mobile tap → real raycast inside Canvas context */}
        <MobileTapHandler pendingTapRef={pendingTapRef} />

        {/* Camera setup - starts zoomed out for intro */}
        <PerspectiveCamera makeDefault position={[0, 8, 55]} fov={60} />

        {/* Intro camera animation */}
        <CameraController
          isIntroActive={isIntroActive}
          onIntroComplete={handleIntroComplete}
          introDuration={INTRO_DURATION}
        />

        {/* Controls - full 360° trackball rotation in all axes */}
        <TrackballControls
          ref={controlsRef}
          rotateSpeed={2.0}
          zoomSpeed={1.2}
          panSpeed={0.8}
          minDistance={10}
          maxDistance={120}
          noPan={false}
          noZoom={false}
          noRotate={false}
          mouseButtons={{ LEFT: 0, MIDDLE: 1, RIGHT: 2 }}
          onStart={cancelIntro}
        />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={1.2} color="#00d4ff" />
        <pointLight position={[0, 15, 0]} intensity={0.8} color="#a855f7" />

        {/* Starfield background */}
        <Starfield count={1200} />

        {/* Shooting stars — rare streaks every ~60s */}
        <ShootingStars ref={shootingStarsRef} />

        {/* Distant galaxy — discovered by orbiting east */}
        <DistantGalaxy />

        {/* Ambient gravity field particle cloud */}
        <GravityField />

        {/* Drifting alien asteroid — clickable */}
        <Asteroid onAsteroidClick={handleAsteroidClick} />

        {/* Daily constellation — opposite side of planet cluster from Cosmic Void */}
        <Constellation position={[-28, 18, -55]} onSelect={handleConstellationSelect} onHover={handleHover} />

        {/* Cosmic horror elements */}
        <CosmicVoid
          position={voidPosition}
          onClick={handleVoidClick}
        />

        {/* Vignette tracker */}
        <VoidVignette
          voidPosition={voidPosition}
          threshold={35}
          onDistanceChange={handleVignetteChange}
        />

        {/* Planets - wrapped in Suspense for texture loading */}
        <Suspense fallback={null}>
          {planetsData.map((planet) => (
            <Planet
              key={planet.id}
              {...planet}
              onClick={planetClickHandlers[planet.id]}
              onHover={handleHover}
              isActive={activePlanetId === planet.id}
            />
          ))}
          {/* Custom user-created planet */}
          {customPlanet && (
            <CustomPlanet
              {...customPlanet}
              onHover={handleHover}
              isDeleting={isCustomPlanetDeleting}
            />
          )}
          {/* Signal when planets are loaded */}
          <SceneReadySignal onReady={() => setSceneReady(true)} />
        </Suspense>
      </Canvas>

      {/* Vignette overlay - creeping darkness */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse at center,
            transparent 0%,
            transparent ${Math.max(0, 60 - vignetteIntensity * 40)}%,
            rgba(10, 5, 20, ${vignetteIntensity * 0.2}) ${Math.max(0, 80 - vignetteIntensity * 30)}%,
            rgba(5, 2, 15, ${vignetteIntensity * 0.3}) 100%
          )`,
          transition: 'background 0.5s ease-out',
          zIndex: 10
        }}
      />

      {/* Welcome text - appears once per session after nav animation completes */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1],
              exit: { duration: 0.15 }
            }}
            style={{
              position: 'absolute',
              ...(isTouch ? { top: '8%' } : { bottom: '5%' }),
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 15
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 'auto' }}
              transition={{
                duration: 0.8,
                delay: 0.1,
                ease: 'easeOut'
              }}
              style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '1.25rem',
                fontWeight: 300,
                opacity: 0.75,
                fontFamily: 'monospace',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                textShadow: '0 0 20px rgba(0, 212, 255, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)',
                textAlign: 'center',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}
            >
              <GlitchText active={showWelcome}>Welcome traveler</GlitchText>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asteroid codex modal — flex wrapper guarantees centering */}
      {createPortal(
        <AnimatePresence>
          {asteroidModalOpen && (
            <div className="asteroid-message-overlay">
            <motion.div
              key="asteroid-codex"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="asteroid-message"
            >
              <div className="asteroid-message-header">
                <span className="asteroid-message-label">SIGNAL INTERCEPTED</span>
                <button
                  className="asteroid-message-close"
                  onClick={() => setAsteroidModalOpen(false)}
                  aria-label="Close"
                ><X size={16} /></button>
              </div>
              <div className="asteroid-codex-body">
                <label className="asteroid-codex-label" htmlFor="codex-input">
                  Enter the cosmic codex
                </label>
                <input
                  id="codex-input"
                  className={`asteroid-codex-input${codexError ? ' codex-error' : ''}`}
                  type="text"
                  value={codexInput}
                  onChange={(e) => setCodexInput(e.target.value)}
                  onKeyDown={handleCodexKeyDown}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="_ _ _ _ _ _ _"
                />
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Planet name label - futuristic HUD style (hide for Home planet) */}
      <AnimatePresence>
        {hoveredPlanet && hoveredPlanet !== 'Home' && hoveredPlanetPosition && (
          <motion.div
            key={hoveredPlanet}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'absolute',
              left: `${hoveredPlanetPosition.x}px`,
              top: `${hoveredPlanetPosition.y}px`,
              transform: `translate(${(hoveredPlanetPosition.radius || 40) + 12}px, -16px)`,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
                  {/* Connection dot */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
                    style={{
                      position: 'relative',
                      width: '6px',
                      height: '6px',
                      flexShrink: 0
                    }}
                  >
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        background: hoveredColor,
                        borderRadius: '50%',
                        boxShadow: `0 0 8px rgba(${hoveredColorRgb}, 0.8)`
                      }}
                    />
                  </motion.div>

                  {/* Connection line — draws left to right */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    exit={{ scaleX: 0 }}
                    transition={{ duration: 0.15, delay: 0.03, ease: [0.4, 0, 0.2, 1] }}
                    style={{
                      width: '24px',
                      height: '1px',
                      background: `linear-gradient(90deg, rgba(${hoveredColorRgb}, 0.8), rgba(${hoveredColorRgb}, 0.3))`,
                      transformOrigin: 'left',
                      flexShrink: 0
                    }}
                  />

                  {/* Label container — slides in from left */}
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.2, delay: 0.06, ease: [0.4, 0, 0.2, 1] }}
                    style={{
                      background: `linear-gradient(135deg, rgba(${hoveredColorRgb}, 0.15), rgba(${hoveredColorRgb}, 0.05))`,
                      border: `1px solid rgba(${hoveredColorRgb}, 0.5)`,
                      borderRadius: '4px',
                      padding: '8px 16px',
                      position: 'relative',
                      backdropFilter: 'blur(10px)',
                      clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)'
                    }}
                  >
                    {/* Corner accents */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '-1px',
                        left: '-1px',
                        width: '12px',
                        height: '12px',
                        borderTop: `2px solid ${hoveredColor}`,
                        borderLeft: `2px solid ${hoveredColor}`,
                        borderTopLeftRadius: '4px'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-1px',
                        right: '-1px',
                        width: '12px',
                        height: '12px',
                        borderBottom: `2px solid ${hoveredColor}`,
                        borderRight: `2px solid ${hoveredColor}`,
                        borderBottomRightRadius: '4px'
                      }}
                    />

                    {/* Text */}
                    <div
                      style={{
                        color: hoveredColor,
                        fontSize: '14px',
                        fontWeight: '500',
                        fontFamily: 'monospace',
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase',
                        textShadow: `0 0 10px rgba(${hoveredColorRgb}, 0.5)`,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {hoveredPlanet}
                    </div>
                  </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation hint - different for touch vs keyboard */}
      {sceneReady && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            color: '#ffffff',
            fontSize: '12px',
            fontFamily: 'monospace',
            textAlign: 'right',
            pointerEvents: 'none',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}
        >
          {isTouch ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                <Move size={12} /> Drag to orbit
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                <ZoomIn size={12} /> Pinch to zoom
              </div>
              <div>Tap planets to explore</div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                <ArrowLeft size={12} /> <ArrowRight size={12} /> Arrow keys to navigate
              </div>
              <div>Click and drag to orbit</div>
              <div>Scroll to zoom</div>
              <div>ESC to return home</div>
            </>
          )}
        </div>
      )}

      {/* Constellation modal — bottom-right corner */}
      <AnimatePresence>
        {constellationModal && (
          <motion.div
            className="constellation-modal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="constellation-modal-header">
              <div className="constellation-modal-title-group">
                <span className="constellation-modal-label">CONSTELLATION</span>
                <h3 className="constellation-modal-name">{constellationModal.name}</h3>
              </div>
              <button
                className="constellation-modal-close"
                onClick={() => setConstellationModal(null)}
                aria-label="Close"
              ><X size={16} /></button>
            </div>
            <div className="constellation-modal-body">
              {constellationModal.loading ? (
                <span className="constellation-modal-loading">RETRIEVING DATA...</span>
              ) : (
                <p className="constellation-modal-text">{constellationModal.text}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      {sceneReady && (
        <BottomNav
          activePlanetId={activePlanetId}
          onNavigate={onPlanetClick}
          onCreatePlanet={onCreatePlanet}
          onDeletePlanet={onDeletePlanet}
          hasCustomPlanet={!!customPlanet}
          onExpandChange={handleNavExpandChange}
        />
      )}

      {/* Lightspeed warp transition */}
      {warpActive && (
        <LightspeedTransition
          onComplete={() => {
            setPresentationOpen(true);
            requestAnimationFrame(() => setWarpActive(false));
          }}
        />
      )}

      {/* Presentation mode slideshow */}
      <PresentationMode
        isOpen={presentationOpen}
        onClose={() => {
          setPresentationOpen(false);
          onPlanetClickRef.current?.(planetsData.find(p => p.id === 'home'));
        }}
      />
    </div>
  );
}
