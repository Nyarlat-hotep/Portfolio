// Planet data: positions, colors, and metadata
export const planetsData = [
  {
    id: 'home',
    name: 'Home',
    type: 'star',
    position: [0, 0, 0],
    scale: 1.5,
    color: '#00d4ff',
    tooltipColor: '#ff8c00',
    emissive: '#00d4ff',
    emissiveIntensity: 0.8,
    rotationSpeed: 0.04,
    route: '/',
    description: 'Return to galaxy view'
  },
  {
    id: 'case-study-1',
    name: 'Banana Phone',
    type: 'planet',
    position: [8, 2, -3],
    scale: 1.2,
    color: '#a855f7',
    tooltipColor: '#e0c878',
    emissive: '#a855f7',
    emissiveIntensity: 0.3,
    rotationSpeed: 0.15,
    route: '/case-study-1',
    description: 'Featured project showcase',
    moons: [
      { id: 'cs1-moon', scale: 0.2, orbitRadius: 2.5, orbitSpeed: 0.06, orbitTilt: 0.4, textureType: 'alien' },
    ]
  },
  {
    id: 'case-study-2',
    name: 'Case Study 2',
    type: 'planet',
    position: [-6, 4, -5],
    scale: 1.0,
    color: '#22d3ee',
    tooltipColor: '#a8e4f0',
    emissive: '#22d3ee',
    emissiveIntensity: 0.3,
    rotationSpeed: 0.08,
    route: '/case-study-2',
    description: 'Product design project'
  },
  {
    id: 'case-study-3',
    name: 'Case Study 3',
    type: 'planet',
    position: [5, -3, -8],
    scale: 0.9,
    color: '#ec4899',
    tooltipColor: '#d4754e',
    emissive: '#ec4899',
    emissiveIntensity: 0.3,
    rotationSpeed: 0.22,
    route: '/case-study-3',
    description: 'UX research project'
  },
  {
    id: 'about',
    name: 'About Me',
    type: 'planet',
    position: [-8, -2, -4],
    scale: 1.1,
    color: '#10b981',
    tooltipColor: '#7da8f0',
    emissive: '#10b981',
    emissiveIntensity: 0.3,
    rotationSpeed: 0.12,
    route: '/about',
    description: 'Learn more about me',
    moons: [
      { id: 'moon-1', scale: 0.15, orbitRadius: 2.2, orbitSpeed: 0.08, orbitTilt: 0.3, textureType: 'rocky' },
      { id: 'moon-2', scale: 0.1, orbitRadius: 2.8, orbitSpeed: 0.05, orbitTilt: -0.5, textureType: 'icy' },
    ]
  }
];

// Helper function to get planet by ID
export const getPlanetById = (id) => {
  return planetsData.find(planet => planet.id === id);
};

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
