import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useState, useEffect } from 'react';
import Planet from './Planet';
import Starfield from './Starfield';
import BottomNav from '../Navigation/BottomNav';
import { planetsData, getAdjacentPlanet } from '../../data/planets';

export default function Galaxy({ onPlanetClick, activePlanetId }) {
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const [currentPlanetIndex, setCurrentPlanetIndex] = useState(0);

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
      <Canvas>
        {/* Camera setup */}
        <PerspectiveCamera makeDefault position={[0, 5, 20]} fov={60} />

        {/* Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={10}
          maxDistance={40}
          maxPolarAngle={Math.PI / 1.5}
          minPolarAngle={Math.PI / 3}
        />

        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00d4ff" />

        {/* Starfield background */}
        <Starfield count={3000} />

        {/* Planets */}
        {planetsData.map((planet) => (
          <Planet
            key={planet.id}
            {...planet}
            onClick={() => {
              const index = planetsData.findIndex(p => p.id === planet.id);
              setCurrentPlanetIndex(index);
              onPlanetClick?.(planet);
            }}
            onHover={setHoveredPlanet}
            isActive={activePlanetId === planet.id}
          />
        ))}
      </Canvas>

      {/* Planet name tooltip */}
      {hoveredPlanet && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            color: 'white',
            fontSize: '24px',
            fontWeight: '300',
            textShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '2px'
          }}
        >
          {hoveredPlanet}
        </div>
      )}

      {/* Navigation hint */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '12px',
          fontFamily: 'monospace',
          textAlign: 'right',
          pointerEvents: 'none'
        }}
      >
        <div>← → Arrow keys to navigate</div>
        <div>Click and drag to orbit</div>
        <div>Scroll to zoom</div>
        <div>ESC to return home</div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav activePlanetId={activePlanetId} onNavigate={onPlanetClick} />
    </div>
  );
}
