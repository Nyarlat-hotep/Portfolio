import { useState, useCallback } from 'react';
import Galaxy from './components/Galaxy/Galaxy';
import PageOverlay from './components/UI/PageOverlay';
import VoidOverlay from './components/UI/VoidOverlay';
import ErrorBoundary from './components/UI/ErrorBoundary';
import PlanetCreator from './components/UI/PlanetCreator';
import CaseStudy from './components/Pages/CaseStudy';
import About from './components/Pages/About';
import Experiments from './components/Pages/Experiments';
import CustomCursor from './components/UI/CustomCursor';
import HUDFrame from './components/UI/HUDFrame';
import { caseStudies, aboutContent } from './data/caseStudies';
import { playCaseStudyOpen, playCaseStudyClose, playPlanetExplosion, playPlanetCreation, stopBackground, playBackground } from './utils/sounds';
import './App.css';

function App() {
  const [activePlanet, setActivePlanet] = useState(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [showPlanetCreator, setShowPlanetCreator] = useState(false);
  const [customPlanet, setCustomPlanet] = useState(null);
  const [isCustomPlanetDeleting, setIsCustomPlanetDeleting] = useState(false);

  const handlePlanetClick = useCallback((planet) => {
    setActivePlanet(planet);

    if (planet.id !== 'home') {
      stopBackground();
      playCaseStudyOpen();
      setIsOverlayOpen(true);
    } else {
      setIsOverlayOpen(false);
    }
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
      <CustomCursor />
      <HUDFrame />
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
      <PlanetCreator
        isOpen={showPlanetCreator}
        onClose={handleClosePlanetCreator}
        onSave={handleSavePlanet}
      />

      {/* Void overlay for experiments */}
      {activePlanet?.id === 'experiments' ? (
        <VoidOverlay
          isOpen={isOverlayOpen}
          onClose={handleCloseOverlay}
          title="ERR_X.0"
        >
          <Experiments />
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
    </div>
  );
}

export default App;
