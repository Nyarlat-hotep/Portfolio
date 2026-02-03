import { useState } from 'react';
import Galaxy from './components/Galaxy/Galaxy';
import PageOverlay from './components/UI/PageOverlay';
import CaseStudy from './components/Pages/CaseStudy';
import About from './components/Pages/About';
import Experiments from './components/Pages/Experiments';
import { caseStudies, aboutContent } from './data/caseStudies';
import './App.css';

function App() {
  const [activePlanet, setActivePlanet] = useState(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const handlePlanetClick = (planet) => {
    setActivePlanet(planet);

    // Don't open overlay for home planet
    if (planet.id !== 'home') {
      setIsOverlayOpen(true);
    } else {
      setIsOverlayOpen(false);
    }
  };

  const handleCloseOverlay = () => {
    setIsOverlayOpen(false);
    setActivePlanet(null);
  };

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
      <Galaxy
        onPlanetClick={handlePlanetClick}
        activePlanetId={activePlanet?.id}
      />

      <PageOverlay
        isOpen={isOverlayOpen}
        onClose={handleCloseOverlay}
        title={activePlanet?.id === 'about' ? aboutContent.name : activePlanet?.id === 'experiments' ? 'Experiments' : caseStudies[activePlanet?.id]?.title}
        planetColor={activePlanet?.color}
      >
        {getOverlayContent()}
      </PageOverlay>
    </div>
  );
}

export default App;
