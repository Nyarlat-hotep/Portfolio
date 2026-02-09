import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useState, useEffect, Suspense, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Move, ZoomIn } from 'lucide-react';
import Planet from './Planet';
import Starfield from './Starfield';
import CosmicVoid from './CosmicVoid';
import VoidVignette from './VoidVignette';
import CameraController from './CameraController';
import BottomNav from '../Navigation/BottomNav';
import { planetsData, getAdjacentPlanet } from '../../data/planets';
import { isWebGLSupported } from '../../utils/webglDetect';
import { isTouchDevice } from '../../utils/isTouchDevice';

// Check WebGL support once on module load
const webGLSupported = isWebGLSupported();

// Check touch once on module load for UI hints
const isTouch = isTouchDevice();

// Intro animation duration
const INTRO_DURATION = 2.5;
const WELCOME_DISPLAY_DURATION = 5000;

// Fallback UI for browsers without WebGL
function WebGLFallback() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0a0e27',
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

export default function Galaxy({ onPlanetClick, activePlanetId }) {
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const [hoveredPlanetPosition, setHoveredPlanetPosition] = useState(null);
  const [currentPlanetIndex, setCurrentPlanetIndex] = useState(0);
  const [vignetteIntensity, setVignetteIntensity] = useState(0);

  // Intro animation state
  const [isIntroActive, setIsIntroActive] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeTimeoutRef = useRef(null);
  const controlsRef = useRef(null);

  // Memoized hover handler - same for all planets
  const handleHover = useCallback((name, screenPosition) => {
    setHoveredPlanet(name);
    setHoveredPlanetPosition(screenPosition);
  }, []);

  // Memoized vignette handler
  const handleVignetteChange = useCallback((intensity) => {
    setVignetteIntensity(intensity);
  }, []);

  // Memoized click handlers per planet
  const planetClickHandlers = useMemo(() => {
    return planetsData.reduce((handlers, planet, index) => {
      handlers[planet.id] = () => {
        setCurrentPlanetIndex(index);
        onPlanetClick?.(planet);
      };
      return handlers;
    }, {});
  }, [onPlanetClick]);

  // Memoized void click handler
  const handleVoidClick = useCallback(() => {
    onPlanetClick?.({ id: 'experiments', name: 'Experiments', color: '#6b2fa0' });
  }, [onPlanetClick]);

  // Handle intro zoom complete - show welcome text
  const handleIntroComplete = useCallback(() => {
    setShowWelcome(true);
    // Hide welcome after duration
    welcomeTimeoutRef.current = setTimeout(() => {
      setShowWelcome(false);
      setIsIntroActive(false);
    }, WELCOME_DISPLAY_DURATION);
  }, []);

  // Cancel intro on user interaction
  const cancelIntro = useCallback(() => {
    if (isIntroActive) {
      setIsIntroActive(false);
      setShowWelcome(false);
      if (welcomeTimeoutRef.current) {
        clearTimeout(welcomeTimeoutRef.current);
      }
    }
  }, [isIntroActive]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (welcomeTimeoutRef.current) {
        clearTimeout(welcomeTimeoutRef.current);
      }
    };
  }, []);

  // Return fallback UI if WebGL is not supported
  if (!webGLSupported) {
    return <WebGLFallback />;
  }

  // Void position - behind the user's starting camera angle (camera faces -Z, void is at +Z)
  const voidPosition = [0, 0, 80];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        const currentId = planetsData[currentPlanetIndex].id;
        const prevPlanet = getAdjacentPlanet(currentId, 'prev');
        const prevIndex = planetsData.findIndex(p => p.id === prevPlanet.id);
        setCurrentPlanetIndex(prevIndex);
        onPlanetClick?.(prevPlanet);
      } else if (e.key === 'ArrowRight') {
        const currentId = planetsData[currentPlanetIndex].id;
        const nextPlanet = getAdjacentPlanet(currentId, 'next');
        const nextIndex = planetsData.findIndex(p => p.id === nextPlanet.id);
        setCurrentPlanetIndex(nextIndex);
        onPlanetClick?.(nextPlanet);
      } else if (e.key === 'Escape') {
        // Return to home view
        const homePlanet = planetsData.find(p => p.id === 'home');
        onPlanetClick?.(homePlanet);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPlanetIndex, onPlanetClick]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0e27' }}>
      <Canvas
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        {/* Camera setup - starts zoomed out for intro */}
        <PerspectiveCamera makeDefault position={[0, 8, 55]} fov={60} />

        {/* Intro camera animation */}
        <CameraController
          isIntroActive={isIntroActive}
          onIntroComplete={handleIntroComplete}
          introDuration={INTRO_DURATION}
        />

        {/* Controls - cancel intro on any interaction */}
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={10}
          maxDistance={120}
          maxPolarAngle={Math.PI / 1.5}
          minPolarAngle={Math.PI / 3}
          onStart={cancelIntro}
        />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={1.2} color="#00d4ff" />
        <pointLight position={[0, 15, 0]} intensity={0.8} color="#a855f7" />

        {/* Starfield background */}
        <Starfield count={1200} />

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
            rgba(10, 5, 20, ${vignetteIntensity * 0.4}) ${Math.max(0, 80 - vignetteIntensity * 30)}%,
            rgba(5, 2, 15, ${vignetteIntensity * 0.7}) 100%
          )`,
          transition: 'background 0.5s ease-out',
          zIndex: 10
        }}
      />

      {/* Welcome text - appears after intro zoom */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.4, 0, 0.2, 1],
              exit: { duration: 0.5 }
            }}
            style={{
              position: 'absolute',
              bottom: '15%',
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              zIndex: 15
            }}
          >
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '1.25rem',
                fontWeight: 300,
                fontFamily: 'monospace',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                textShadow: '0 0 20px rgba(0, 212, 255, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              Welcome traveller.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Planet name label - futuristic HUD style */}
      <AnimatePresence>
        {hoveredPlanet && hoveredPlanetPosition && (
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
            {(() => {
              const c = hoveredPlanetPosition.color || '#00d4ff';
              const rgb = c.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16)).join(', ');
              return (
                <>
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
                        background: c,
                        borderRadius: '50%',
                        boxShadow: `0 0 8px rgba(${rgb}, 0.8)`
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
                      background: `linear-gradient(90deg, rgba(${rgb}, 0.8), rgba(${rgb}, 0.3))`,
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
                      background: `linear-gradient(135deg, rgba(${rgb}, 0.15), rgba(${rgb}, 0.05))`,
                      border: `1px solid rgba(${rgb}, 0.5)`,
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
                        borderTop: `2px solid ${c}`,
                        borderLeft: `2px solid ${c}`,
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
                        borderBottom: `2px solid ${c}`,
                        borderRight: `2px solid ${c}`,
                        borderBottomRightRadius: '4px'
                      }}
                    />

                    {/* Text */}
                    <div
                      style={{
                        color: c,
                        fontSize: '14px',
                        fontWeight: '500',
                        fontFamily: 'monospace',
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase',
                        textShadow: `0 0 10px rgba(${rgb}, 0.5)`,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {hoveredPlanet}
                    </div>
                  </motion.div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation hint - different for touch vs keyboard */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          color: 'rgba(255, 255, 255, 0.5)',
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

      {/* Bottom Navigation */}
      <BottomNav activePlanetId={activePlanetId} onNavigate={onPlanetClick} />
    </div>
  );
}
