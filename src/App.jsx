import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { LayoutGrid } from 'lucide-react';
import Galaxy from './components/Galaxy/Galaxy';
import PageOverlay from './components/UI/PageOverlay';
import VoidOverlay from './components/UI/VoidOverlay';
import ErrorBoundary from './components/UI/ErrorBoundary';
const PlanetCreator = lazy(() => import('./components/UI/PlanetCreator'));
const CaseStudy     = lazy(() => import('./components/Pages/CaseStudy'));
const About         = lazy(() => import('./components/Pages/About'));
const Experiments   = lazy(() => import('./components/Pages/Experiments'));
import GateModal from './components/UI/GateModal';
import { isUnlocked } from './utils/gate';
import { caseStudies, aboutContent } from './data/caseStudies';
import { playCaseStudyOpen, playCaseStudyClose, playPlanetExplosion, playPlanetCreation, stopBackground, playBackground } from './utils/sounds';
import './App.css';
import * as THREE from 'three';
import { getQualityTier, TIER } from './utils/qualityTier';

// Anisotropic filtering, applied before anything constructs a texture.
// Lives here rather than main.jsx so the intro page doesn't pull in three.
//
// Without it, a texture viewed at a grazing angle is minified along one axis
// only, and trilinear filtering has to pick a mip that is far too blurry for
// the other — which is why the ring bands shimmer and smear where they run away
// from the camera. three clamps this to whatever the GPU actually supports, so
// a value above the hardware maximum is harmless.
//
// Set as the global default rather than per texture: it only ever engages on
// mipmapped minification, so render targets and LUTs (LinearFilter, no mips)
// are unaffected and there is nothing to opt out.
//
// Tiered, because it is not free — a grazing pixel can cost up to this many
// texture samples. The tier resolves synchronously at module load, so this is
// decided before the first texture exists.
THREE.Texture.DEFAULT_ANISOTROPY =
  getQualityTier() >= TIER.HIGH ? 8 : getQualityTier() >= TIER.MED ? 4 : 1;

const GATED_IDS = new Set(['case-study-1', 'case-study-3']);

function App({ onMenu }) {
  const [activePlanet, setActivePlanet] = useState(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [showPlanetCreator, setShowPlanetCreator] = useState(false);
  const [customPlanet, setCustomPlanet] = useState(null);
  const [isCustomPlanetDeleting, setIsCustomPlanetDeleting] = useState(false);

  const [gateModal, setGateModal] = useState({ open: false, planet: null });
  const [pendingPlanet, setPendingPlanet] = useState(null);

  // After gate modal closes, navigate to the planet
  useEffect(() => {
    if (!pendingPlanet) return;
    setActivePlanet(pendingPlanet);
    stopBackground();
    playCaseStudyOpen();
    setIsOverlayOpen(true);
    setPendingPlanet(null);
  }, [pendingPlanet]);

  const handlePlanetClick = useCallback((planet) => {
    if (GATED_IDS.has(planet.id) && !isUnlocked()) {
      setGateModal({ open: true, planet });
    } else {
      setActivePlanet(planet);
      if (planet.id !== 'home') {
        stopBackground();
        playCaseStudyOpen();
        setIsOverlayOpen(true);
      } else {
        setIsOverlayOpen(false);
      }
    }
  }, []);

  function handleGateSuccess() {
    setPendingPlanet(gateModal.planet);
    setGateModal({ open: false, planet: null });
  }

  const handleGateClose = useCallback(() => {
    setGateModal({ open: false, planet: null });
  }, []);

  const handleCloseOverlay = useCallback(() => {
    playCaseStudyClose();
    playBackground();
    setIsOverlayOpen(false);
    setActivePlanet(null);
  }, []);

  const handleOpenPlanetCreator = useCallback(() => {
    playCaseStudyOpen();
    setShowPlanetCreator(true);
  }, []);

  const handleClosePlanetCreator = useCallback(() => {
    playCaseStudyClose();
    setShowPlanetCreator(false);
  }, []);

  const handleSavePlanet = useCallback((planetData) => {
    playPlanetCreation();
    // Generate random position for the custom planet
    const angle = Math.random() * Math.PI * 2;
    const distance = 8 + Math.random() * 6; // Between 8 and 14 units from center
    const position = [
      Math.cos(angle) * distance,
      (Math.random() - 0.5) * 4, // Random Y between -2 and 2
      Math.sin(angle) * distance
    ];

    setCustomPlanet({
      id: 'custom-planet',
      name: planetData.name,
      position,
      scale: planetData.scale,
      textureUrl: planetData.textureUrl,
      color: planetData.color,
      tintIntensity: planetData.tintIntensity,
      rotationSpeed: 0.15,
    });
    setShowPlanetCreator(false);
  }, []);

  const handleDeletePlanet = useCallback(() => {
    playPlanetExplosion();
    // Start deletion animation
    setIsCustomPlanetDeleting(true);

    // After animation completes, remove the planet
    setTimeout(() => {
      setCustomPlanet(null);
      setIsCustomPlanetDeleting(false);
    }, 800);
  }, []);

  // Overlay color: use case study's accentColor when defined, else the planet's color
  const activeCaseStudy = activePlanet ? caseStudies[activePlanet.id] : null;
  const overlayColor = activeCaseStudy?.accentColor || activePlanet?.color;

  // Determine what content to show in overlay
  const getOverlayContent = () => {
    if (!activePlanet) return null;

    if (activePlanet.id === 'about') {
      return <About aboutData={aboutContent} planetColor={activePlanet.color} />;
    }

    // Case study pages
    const caseStudy = caseStudies[activePlanet.id];
    if (caseStudy) {
      return <CaseStudy caseStudy={caseStudy} planetColor={overlayColor} />;
    }

    return null;
  };

  return (
    <div className="App">
      {onMenu && (
        <button className="space-menu-btn" onClick={onMenu} aria-label="Back to menu">
          <LayoutGrid size={14} />
          <span>Menu</span>
        </button>
      )}
      <ErrorBoundary>
        <Galaxy
          onPlanetClick={handlePlanetClick}
          activePlanetId={activePlanet?.id}
          customPlanet={customPlanet}
          onCreatePlanet={handleOpenPlanetCreator}
          onDeletePlanet={handleDeletePlanet}
          isCustomPlanetDeleting={isCustomPlanetDeleting}
        />
      </ErrorBoundary>

      {/* Planet Creator Overlay */}
      {showPlanetCreator && (
        <Suspense fallback={null}>
          <PlanetCreator
            isOpen={showPlanetCreator}
            onClose={handleClosePlanetCreator}
            onSave={handleSavePlanet}
          />
        </Suspense>
      )}

      {/* Void overlay for experiments */}
      {activePlanet?.id === 'experiments' ? (
        <VoidOverlay
          isOpen={isOverlayOpen}
          onClose={handleCloseOverlay}
          title="ERR_X.0"
        >
          <Suspense fallback={null}>
            <Experiments />
          </Suspense>
        </VoidOverlay>
      ) : (
        <PageOverlay
          isOpen={isOverlayOpen}
          onClose={handleCloseOverlay}
          title={activePlanet?.id === 'about' ? aboutContent.name : caseStudies[activePlanet?.id]?.title}
          planetColor={overlayColor}
          planetId={activePlanet?.id}
        >
          {getOverlayContent()}
        </PageOverlay>
      )}

      <GateModal
        open={gateModal.open}
        planetId={gateModal.planet?.id}
        onSuccess={handleGateSuccess}
        onClose={handleGateClose}
      />
    </div>
  );
}

export default App;
