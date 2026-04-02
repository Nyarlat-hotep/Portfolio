import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { TrackballControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { useState, useEffect, Suspense, useMemo, useCallback, useRef, lazy } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Move, ZoomIn, HelpCircle, X, Volume2, VolumeX, Crosshair } from 'lucide-react';
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
import Monolith from './Monolith';
import BottomNav from '../Navigation/BottomNav';
import HUDFrame from '../UI/HUDFrame';
import LightspeedTransition from '../UI/LightspeedTransition';
import '../UI/PresentationMode.css';
const PresentationMode = lazy(() => import('../UI/PresentationMode'));
const AlienSnake       = lazy(() => import('../UI/AlienSnake'));
const NebulaCloud      = lazy(() => import('./NebulaCloud'))
const AsteroidBelt     = lazy(() => import('./AsteroidBelt'));
const OuterBody        = lazy(() => import('./OuterBody'));
const OortCloud        = lazy(() => import('./OortCloud'));
const GalaxyCluster    = lazy(() => import('./GalaxyCluster'));
const SpaceStation     = lazy(() => import('./SpaceStation'));

// Preload GLB on module init so it's ready before user zooms out
useGLTF.preload('/models/sci-fi_space_station_2-v2.glb')
import { planetsData, getAdjacentPlanet } from '../../data/planets';
import { isWebGLSupported } from '../../utils/webglDetect';
import { isTouchDevice } from '../../utils/isTouchDevice';
import { playBackground, stopBackground, getMuted, setMuted, playMenuClick, playCaseStudyOpen, playCaseStudyClose, playWarp } from '../../utils/sounds';

// Check WebGL support once on module load
const webGLSupported = isWebGLSupported();

const DERELICT_LOG = `VESSEL: ICARUS-VII  //  REGISTRY: EC-7741
DATE: [CORRUPTED]   //  CREW: 4 of 9 [REMAINING]

DAY ??? — ENGINES COLD. LIFE SUPPORT AT 12%.
MAGNETIC LOCK HAS FAILED. WE ARE DRIFTING.

CARTER SAYS SHE SAW SOMETHING OUTSIDE.
SOMETHING MOVING BETWEEN THE DEBRIS.
I TOLD HER SHE WAS DREAMING.

I TOLD HER.

IF ANYONE FINDS THIS — DO NOT COME HERE.
WHATEVER PULLED US OFF COURSE,
IT IS STILL.

STILL.

STILL WAITING.

— CDR. YUSUF ADEOLA
[TRANSMISSION ENDS]`;

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
// Keyboard camera: arrow L/R orbits, arrow U/D zooms — lives inside Canvas for useFrame access
const _yAxis = new THREE.Vector3(0, 1, 0);
function KeyboardCameraController({ controlsRef }) {
  const keysRef = useRef({});

  useEffect(() => {
    const onDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        keysRef.current[e.key] = true;
      }
    };
    const onUp = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  useFrame((_, delta) => {
    const keys = keysRef.current;
    const controls = controlsRef.current;
    if (!controls) return;
    if (!keys.ArrowLeft && !keys.ArrowRight && !keys.ArrowUp && !keys.ArrowDown) return;

    const ORBIT_SPEED = 1.4; // rad/sec

    const cam    = controls.object;
    const target = controls.target;
    const eye    = cam.position.clone().sub(target);

    if (keys.ArrowLeft || keys.ArrowRight) {
      const angle = (keys.ArrowLeft ? 1 : -1) * ORBIT_SPEED * delta;
      eye.applyAxisAngle(_yAxis, angle);
    }

    if (keys.ArrowUp || keys.ArrowDown) {
      const dist      = eye.length();
      const zoomSpeed = dist > 120 ? 60 : 18; // faster beyond 120 units
      const newDist   = Math.max(
        controls.minDistance || 10,
        Math.min(controls.maxDistance || 500, dist + (keys.ArrowUp ? -1 : 1) * zoomSpeed * delta)
      );
      eye.normalize().multiplyScalar(newDist);
    }

    cam.position.copy(target).add(eye);
    cam.lookAt(target);
  });

  return null;
}

const _reorientTarget = new THREE.Vector3(0, 0, 0)
const _flatEnd        = new THREE.Vector3()

const _upTarget = new THREE.Vector3(0, 1, 0)

function ReorientController({ controlsRef, isActive, onComplete }) {
  const { camera } = useThree()
  const startPos    = useRef(null)
  const startTarget = useRef(null)
  const startUp     = useRef(null)
  const endPos      = useRef(null)
  const progress    = useRef(0)

  useEffect(() => {
    if (isActive) {
      startPos.current    = camera.position.clone()
      startTarget.current = controlsRef.current?.target.clone() ?? new THREE.Vector3()
      startUp.current     = camera.up.clone()
      progress.current    = 0
      // Keep azimuthal angle and distance, flatten Y to 0
      const dist = camera.position.length()
      const flat = new THREE.Vector3(camera.position.x, 0, camera.position.z)
      if (flat.lengthSq() < 0.001) flat.set(0, 0, 1)
      flat.normalize().multiplyScalar(dist)
      endPos.current = flat
    }
  }, [isActive, camera, controlsRef])

  useFrame((_, delta) => {
    if (!isActive) return
    progress.current = Math.min(1, progress.current + delta / 2.2)
    const t = 1 - Math.pow(1 - progress.current, 3) // easeOutCubic
    camera.position.lerpVectors(startPos.current, endPos.current, t)
    camera.up.lerpVectors(startUp.current, _upTarget, t)
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(startTarget.current, _reorientTarget, t)
    }
    if (progress.current >= 1) onComplete?.()
  })

  return null
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
  const introCompletedRef = useRef(false);
  const controlsRef = useRef(null);
  const shootingStarsRef = useRef();
  const containerRef = useRef(null);
  const pendingTapRef = useRef(null);
  const [muted, setMutedState] = useState(() => getMuted());
  const [isReorienting, setIsReorienting] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [asteroidModalOpen,  setAsteroidModalOpen]  = useState(false);
  const [codexInput,         setCodexInput]         = useState('');
  const [codexError,         setCodexError]         = useState(false);
  const [warpActive,         setWarpActive]          = useState(false);
  const [presentationOpen,   setPresentationOpen]   = useState(false);
  const [showSnake,          setShowSnake]           = useState(false);
  const [derelictOpen,       setDerelictOpen]        = useState(false);
  const snakeActiveRef = useRef(false);
  // Ref-stable wrapper — prevents handler useMemo/useCallback deps from invalidating
  // when parent passes a new onPlanetClick function reference on each render
  const onPlanetClickRef = useRef(onPlanetClick);
  onPlanetClickRef.current = onPlanetClick;

  const bottomNavRef = useRef(null);

  // Start intro only after scene is ready (runs once)
  useEffect(() => {
    if (sceneReady && !introCompletedRef.current && !isIntroActive) {
      playBackground();
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

  // Stable modal / button callbacks — no inline functions in JSX
  const handleDerelictClick          = useCallback(() => { setDerelictOpen(true); }, []);
  const handleCloseDerelict          = useCallback(() => { setDerelictOpen(false); }, []);
  const handleCloseAsteroidModal     = useCallback(() => { playCaseStudyClose(); setAsteroidModalOpen(false); }, []);
  const handleCloseConstellationModal = useCallback(() => { playCaseStudyClose(); setConstellationModal(null); }, []);
  const handleCodexChange            = useCallback((e) => { setCodexInput(e.target.value); setCodexError(false); }, []);
  const handleMuteToggle             = useCallback(() => {
    const next = !getMuted();
    setMuted(next);
    setMutedState(next);
  }, []);
  const handleHelpToggle             = useCallback(() => setHelpVisible(v => !v), []);

  // Memoized vignette style — vignetteIntensity updates many times/sec near the void
  const vignetteStyle = useMemo(() => ({
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: 'none',
    background: `radial-gradient(ellipse at center,
      transparent 0%,
      transparent ${Math.max(0, 60 - vignetteIntensity * 40)}%,
      rgba(0, 0, 0, ${vignetteIntensity * 0.2}) ${Math.max(0, 80 - vignetteIntensity * 30)}%,
      rgba(0, 0, 0, ${vignetteIntensity * 0.3}) 100%
    )`,
    transition: 'background 0.5s ease-out',
    zIndex: 10,
  }), [vignetteIntensity]);

  // Mobile tap detection — TrackballControls intercepts all touch events.
  // We detect taps here and hand off to MobileTapHandler (inside Canvas) which
  // does real Three.js raycasting via useThree, bypassing DOM events entirely.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let tapData = null;

    const onTouchStart = (e) => {
      if (e.target.closest('.bottom-nav')) return;
      const t = e.touches[0];
      tapData = { x: t.clientX, y: t.clientY, time: performance.now() };
    };

    const onTouchEnd = (e) => {
      if (!tapData) return;
      if (e.target.closest('.bottom-nav')) { tapData = null; return; }
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
    playCaseStudyOpen();
    setAsteroidModalOpen(true);
    setCodexInput('');
    setCodexError(false);
  }, []);

  const handleCodexSubmit = useCallback(() => {
    if (codexInput.trim().toLowerCase() === "r'lyeh") {
      setAsteroidModalOpen(false);
      setCodexInput('');
      stopBackground();
      playWarp();
      setWarpActive(true);
    } else {
      setCodexError(true);
    }
  }, [codexInput]);

  const handleCodexKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleCodexSubmit();
  }, [handleCodexSubmit]);

  // Memoized click handlers per planet — stable forever via ref, no dep on onPlanetClick
  const planetClickHandlers = useMemo(() => {
    return planetsData.reduce((handlers, planet, index) => {
      if (planet.id === 'home') {
        // Sun click toggles the nav
        handlers[planet.id] = () => {
          bottomNavRef.current?.toggleNav();
        };
      } else {
        handlers[planet.id] = () => {
          setCurrentPlanetIndex(index);
          onPlanetClickRef.current?.(planet);
        };
      }
      return handlers;
    }, {});
  }, []);

  // Memoized void click handler — stable via ref
  const handleVoidClick = useCallback(() => {
    onPlanetClickRef.current?.({ id: 'experiments', name: 'Experiments', color: '#6b2fa0' });
  }, []);

  // Constellation select — fetch Wikipedia summary, cache per session
  const handleConstellationSelect = useCallback(async (constellation) => {
    playCaseStudyOpen();
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

  // Return fallback UI if WebGL is not supported
  if (!webGLSupported) {
    return <WebGLFallback />;
  }

  // Void position - behind the user's starting camera angle (camera faces -Z, void is at +Z)
  const voidPosition = [0, 0, 80];

  // Shift+M → mute, Shift+H → toggle help hints
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.shiftKey && e.key === 'M') {
        const next = !getMuted();
        setMuted(next);
        setMutedState(next);
      } else if (e.shiftKey && e.key === 'H') {
        setHelpVisible(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Keep snakeActiveRef in sync for ESC guard
  useEffect(() => { snakeActiveRef.current = showSnake; }, [showSnake]);

  // ESC closes asteroid modal first; if none open, returns to home view
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (presentationOpen) return;
      if (snakeActiveRef.current) return;
      if (e.key === 'Escape') {
        if (derelictOpen) { handleCloseDerelict(); return; }
        if (asteroidModalOpen) {
          playCaseStudyClose();
          setAsteroidModalOpen(false);
          return;
        }
        const homePlanet = planetsData.find(p => p.id === 'home');
        onPlanetClickRef.current?.(homePlanet);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentationOpen, asteroidModalOpen, derelictOpen, handleCloseDerelict]);

  // Shift+P — skip codex, go straight to warp
  useEffect(() => {
    const handler = (e) => {
      if (e.shiftKey && e.key === 'P') {
        setAsteroidModalOpen(false);
        stopBackground();
        playWarp();
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

        {/* Arrow key camera: L/R orbits, U/D zooms */}
        <KeyboardCameraController controlsRef={controlsRef} />

        {/* Re-orient animation — smoothly returns camera to home plane */}
        <ReorientController controlsRef={controlsRef} isActive={isReorienting} onComplete={() => setIsReorienting(false)} />

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
          maxDistance={500}
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

        {/* Alien monolith — floating above planet cluster */}
        <Monolith position={[2, 35, -3]} onOpen={() => setShowSnake(true)} />

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

        {/* Nebula clouds — fade in as camera zooms beyond 100u */}
        <Suspense fallback={null}>
          <NebulaCloud position={[-80, 15, -120]} color="#4466ff" secondaryColor="#aa44ff" radius={35} particleCount={400} cameraFadeStart={100} cameraFadeEnd={160} />
          <NebulaCloud position={[120, -20, 80]} color="#ff6622" secondaryColor="#ffaa22" radius={28} particleCount={300} cameraFadeStart={110} cameraFadeEnd={170} />
          <NebulaCloud position={[-30, 40, 160]} color="#22ffaa" secondaryColor="#2288ff" radius={22} particleCount={250} cameraFadeStart={120} cameraFadeEnd={180} />
          <AsteroidBelt innerRadius={90} outerRadius={130} count={600} cameraFadeStart={90} cameraFadeEnd={140} />
          {/* Floating outer bodies — moons and ringed bodies drifting in deep space */}
          {/* Frost (Uranus) — ice-blue rings, wide flat bands */}
          <OuterBody position={[-65, 22, -135]} textureUrl="/textures/uranus.jpg" bodyRadius={2.2} orbitRadius={9} orbitSpeed={0.004} orbitInclination={0.10} hasRings ringColor="#99ddff" ringTilt={0.12} ringBand1={[1.6, 2.8]} ringBand2={[3.1, 4.2]} />
          {/* Small rocky moon — no rings */}
          <OuterBody position={[100, -8, 72]}   textureType="rocky" bodyRadius={0.9} orbitRadius={5} orbitSpeed={0.009} orbitInclination={0.42} />
          {/* Alien — no rings (replaced green ring body) */}
          <OuterBody position={[35, 35, 175]}   textureType="alien" bodyRadius={1.8} orbitRadius={8} orbitSpeed={0.005} orbitInclination={0.22} hazeColor="#88ffcc" moons={[{ radius: 3.2, speed: 0.06, tilt: 0.15, size: 0.22 }, { radius: 5.0, speed: 0.035, tilt: 0.4, size: 0.14 }]} />
          {/* Tiny rocky — no rings */}
          <OuterBody position={[-155, -12, 55]} textureType="rocky" bodyRadius={0.55} orbitRadius={3} orbitSpeed={0.012} orbitInclination={0.65} />
          {/* Haze (Venus) — golden-amber rings, narrow steep tilt, 1 moon */}
          <OuterBody position={[80, 45, -160]}  textureUrl="/textures/venus.jpg"  bodyRadius={1.3} orbitRadius={6} orbitSpeed={0.006} orbitInclination={0.55} hasRings ringColor="#ffcc55" ringTilt={0.52} ringBand1={[1.8, 2.3]} ringBand2={[2.6, 3.1]} hazeColor="#ffdd88" moons={[{ radius: 3.5, speed: 0.04, tilt: 0.3, size: 0.18 }]} />
        </Suspense>

        {/* Layer 3 — Oort Cloud shell surrounding everything, fade in 280–400u */}
        <Suspense fallback={null}>
          <OortCloud cameraFadeStart={280} cameraFadeEnd={400} />
          <SpaceStation onClick={handleDerelictClick} />
          <GalaxyCluster position={[350, -80, -150]} cameraFadeStart={320} cameraFadeEnd={420} />
        </Suspense>
      </Canvas>

      {/* Vignette overlay - creeping darkness */}
      <div
        style={vignetteStyle}
      />

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
              className={`asteroid-message${codexError ? ' codex-rejected' : ''}`}
            >
              <div className="asteroid-message-header">
                <span className="asteroid-message-label">
                  {codexError ? 'INVALID CODEX' : 'SIGNAL INTERCEPTED'}
                </span>
                <button
                  className="asteroid-message-close"
                  onClick={handleCloseAsteroidModal}
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
                  onChange={handleCodexChange}
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

      {/* Derelict lore modal */}
      {createPortal(
        derelictOpen && (
          <div className="asteroid-message-overlay" onClick={handleCloseDerelict}>
            <div className="derelict-modal" onClick={e => e.stopPropagation()}>
              <div className="asteroid-message-header">
                <span className="asteroid-message-label">// FINAL TRANSMISSION //</span>
                <button className="asteroid-message-close" onClick={handleCloseDerelict}>✕</button>
              </div>
              <div className="asteroid-message-body">
                <pre className="derelict-log">{DERELICT_LOG}</pre>
              </div>
            </div>
          </div>
        ),
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

      {/* Mute + Help buttons, collapsible hints — top-right on mobile, bottom-right on desktop */}
      {sceneReady && (
        <div className={`scene-hud${isTouch ? ' scene-hud--touch' : ''}`}>
          {/* Re-orient — return camera to home plane */}
          <button
            className="mute-btn"
            onClick={() => { playMenuClick(); setIsReorienting(true); }}
            aria-label="Re-orient view"
            onMouseEnter={playMenuClick}
          >
            <Crosshair size={14} />
            {!isTouch && (
              <span className="nav-tooltip hud-tooltip">
                <span className="tooltip-key">Re-orient</span>
              </span>
            )}
          </button>

          {/* Mute toggle */}
          <button
            className="mute-btn"
            onClick={handleMuteToggle}
            aria-label={muted ? 'Unmute' : 'Mute'}
            onMouseEnter={playMenuClick}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {!isTouch && (
              <span className="nav-tooltip hud-tooltip">
                <span className="tooltip-key">Shift M</span>
              </span>
            )}
          </button>

          {/* Help toggle */}
          <button
            className={`mute-btn help-btn${helpVisible ? ' help-btn--active' : ''}`}
            onClick={handleHelpToggle}
            aria-label={helpVisible ? 'Hide controls' : 'Show controls'}
            onMouseEnter={playMenuClick}
          >
            <HelpCircle size={14} />
            {!isTouch && (
              <span className="nav-tooltip hud-tooltip">
                <span className="tooltip-key">Shift H</span>
              </span>
            )}
          </button>

          {/* Navigation hints — CSS grid drawer, no DOM removal so no reflow jump */}
          <div className={`nav-hints-drawer${helpVisible ? ' nav-hints-drawer--open' : ''}`}>
            <div>
              <div className="nav-hints-inner">
                {isTouch ? (
                  <>
                    <div className="nav-hint-row">
                      <Move size={12} /> Drag to orbit
                    </div>
                    <div className="nav-hint-row">
                      <ZoomIn size={12} /> Pinch to zoom
                    </div>
                    <div>Tap planets to explore</div>
                  </>
                ) : (
                  <>
                    <div className="nav-hint-row">
                      <ArrowLeft size={12} /> <ArrowRight size={12} /> Orbit left / right
                    </div>
                    <div className="nav-hint-row">
                      <ArrowUp size={12} /> <ArrowDown size={12} /> Zoom in / out
                    </div>
                    <div>Click and drag to orbit</div>
                    <div>Scroll to zoom</div>
                    <div>ESC to return home</div>
                  </>
                )}
              </div>
            </div>
          </div>
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
                onClick={handleCloseConstellationModal}
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
          ref={bottomNavRef}
          activePlanetId={activePlanetId}
          onNavigate={onPlanetClick}
          onCreatePlanet={onCreatePlanet}
          onDeletePlanet={onDeletePlanet}
          hasCustomPlanet={!!customPlanet}
          onExpandChange={handleNavExpandChange}
        />
      )}

      {/* HUD overlay — inside opacity wrapper so it fades in with the scene */}
      <HUDFrame />

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
      {presentationOpen && (
        <Suspense fallback={null}>
          <PresentationMode
            isOpen={presentationOpen}
            onClose={() => {
              setPresentationOpen(false);
              onPlanetClickRef.current?.(planetsData.find(p => p.id === 'home'));
            }}
          />
        </Suspense>
      )}

      {/* Alien Snake game — opened from monolith */}
      {createPortal(
        <AnimatePresence>
          {showSnake && (
            <Suspense fallback={null}>
              <AlienSnake onClose={() => setShowSnake(false)} />
            </Suspense>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
