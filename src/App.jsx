import { useState, useCallback } from 'react';
import Galaxy from './components/Galaxy/Galaxy';
import PageOverlay from './components/UI/PageOverlay';
import VoidOverlay from './components/UI/VoidOverlay';
import ErrorBoundary from './components/UI/ErrorBoundary';
import PlanetCreator from './components/UI/PlanetCreator';
import CaseStudy from './components/Pages/CaseStudy';
import About from './components/Pages/About';
import Experiments from './components/Pages/Experiments';
import { caseStudies, aboutContent } from './data/caseStudies';
import './App.css';

function App() {
  const [activePlanet, setActivePlanet] = useState(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [showPlanetCreator, setShowPlanetCreator] = useState(false);
  const [customPlanet, setCustomPlanet] = useState(null);
  const [isCustomPlanetDeleting, setIsCustomPlanetDeleting] = useState(false);

  const handlePlanetClick = useCallback((planet) => {
    setActivePlanet(planet);

    // Don't open overlay for home planet
    if (planet.id !== 'home') {
      setIsOverlayOpen(true);
    } else {
      setIsOverlayOpen(false);
    }
  }, []);

  const handleCloseOverlay = useCallback(() => {
    setIsOverlayOpen(false);
    setActivePlanet(null);
  }, []);

  const handleOpenPlanetCreator = useCallback(() => {
    setShowPlanetCreator(true);
  }, []);

  const handleClosePlanetCreator = useCallback(() => {
    setShowPlanetCreator(false);
  }, []);

  const handleSavePlanet = useCallback((planetData) => {
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
    // Start deletion animation
    setIsCustomPlanetDeleting(true);

    // After animation completes, remove the planet
    setTimeout(() => {
      setCustomPlanet(null);
      setIsCustomPlanetDeleting(false);
    }, 800);
  }, []);

  // Determine what content to show in overlay
  const getOverlayContent = () => {
    if (!activePlanet) return null;

    if (activePlanet.id === 'about') {
      return <About aboutData={aboutContent} planetColor={activePlanet.color} />;
    }

    if (activePlanet.id === 'experiments') {
      return <Experiments planetColor={activePlanet.color} />;
    }

    // Case study pages
    const caseStudy = caseStudies[activePlanet.id];
    if (caseStudy) {
      return <CaseStudy caseStudy={caseStudy} planetColor={activePlanet.color} />;
    }

    return null;
  };

  return (
    <div className="App">
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
          planetColor={activePlanet?.color}
        >
          {getOverlayContent()}
        </PageOverlay>
      )}
    </div>
  );
}

export default App;
