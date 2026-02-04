import { useState, useCallback } from 'react';
import Galaxy from './components/Galaxy/Galaxy';
import PageOverlay from './components/UI/PageOverlay';
import VoidOverlay from './components/UI/VoidOverlay';
import ErrorBoundary from './components/UI/ErrorBoundary';
import CaseStudy from './components/Pages/CaseStudy';
import About from './components/Pages/About';
import Experiments from './components/Pages/Experiments';
import { caseStudies, aboutContent } from './data/caseStudies';
import './App.css';

function App() {
  const [activePlanet, setActivePlanet] = useState(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

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
        />
      </ErrorBoundary>

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
