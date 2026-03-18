// Planet data: positions, colors, and metadata
export const planetsData = [
  {
    id: 'home',
    name: 'Home',
    type: 'star',
    position: [0, 0, 0],
    scale: 1.5,
    color: '#00d4ff',
    particleColor: '#f97316',
    texture: '/textures/sun.jpg',
    tooltipColor: '#ff8c00',
    emissive: '#00d4ff',
    emissiveIntensity: 0.8,
    rotationSpeed: 0.04,
  },
  {
    id: 'case-study-1',
    name: 'Banana Phone',
    type: 'planet',
    position: [8, 2, -3],
    scale: 1.2,
    color: '#a855f7',
    texture: '/textures/venus.jpg',
    tooltipColor: '#e0c878',
    emissive: '#a855f7',
    emissiveIntensity: 0.3,
    rotationSpeed: 0.15,
    moons: [
      { id: 'cs1-moon', scale: 0.2, orbitRadius: 2.5, orbitSpeed: 0.06, orbitTilt: 0.4, textureType: 'alien' },
    ]
  },
  {
    id: 'case-study-2',
    name: 'Consumer Dashboard',
    type: 'planet',
    position: [-6, 4, -5],
    scale: 1.0,
    color: '#22d3ee',
    texture: '/textures/uranus.jpg',
    tooltipColor: '#a8e4f0',
    emissive: '#22d3ee',
    emissiveIntensity: 0.3,
    rotationSpeed: 0.08,
  },
  {
    id: 'case-study-3',
    name: 'Enterprise AI',
    type: 'planet',
    position: [5, -3, -8],
    scale: 0.9,
    color: '#ff4400',
    texture: '/textures/mars.jpg',
    tooltipColor: '#ff4400',
    emissive: '#ec4899',
    emissiveIntensity: 0.3,
    rotationSpeed: 0.22,
  },
  {
    id: 'about',
    name: 'About Me',
    type: 'planet',
    position: [-8, -2, -4],
    scale: 1.1,
    color: '#10b981',
    texture: '/textures/neptune.jpg',
    tooltipColor: '#7da8f0',
    emissive: '#10b981',
    emissiveIntensity: 0.3,
    rotationSpeed: 0.12,
    moons: [
      { id: 'moon-1', scale: 0.15, orbitRadius: 2.2, orbitSpeed: 0.08, orbitTilt: 0.3, textureType: 'rocky' },
      { id: 'moon-2', scale: 0.1, orbitRadius: 2.8, orbitSpeed: 0.05, orbitTilt: -0.5, textureType: 'icy' },
    ]
  }
];

// Helper function to get next/previous planet for arrow key navigation
export const getAdjacentPlanet = (currentId, direction) => {
  const currentIndex = planetsData.findIndex(p => p.id === currentId);

  if (direction === 'next') {
    const nextIndex = (currentIndex + 1) % planetsData.length;
    return planetsData[nextIndex];
  } else {
    const prevIndex = currentIndex - 1 < 0 ? planetsData.length - 1 : currentIndex - 1;
    return planetsData[prevIndex];
  }
};
