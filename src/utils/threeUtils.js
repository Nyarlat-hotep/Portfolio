import * as THREE from 'three';

/**
 * Dispose of Three.js objects to prevent VRAM leaks.
 * Handles geometry, materials (single or array), and textures.
 */
export function disposeObject(obj) {
  if (!obj) return;

  if (obj.geometry) {
    obj.geometry.dispose();
  }

  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach(mat => disposeMaterial(mat));
    } else {
      disposeMaterial(obj.material);
    }
  }
}

/**
 * Dispose of a single material and its textures.
 */
export function disposeMaterial(material) {
  if (!material) return;

  // Dispose all texture types
  const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'];
  textureProps.forEach(prop => {
    if (material[prop]) {
      material[prop].dispose();
    }
  });

  material.dispose();
}

/**
 * Create a circular particle texture (prevents square points).
 * Cached in a module-level variable to avoid recreating.
 */
let cachedParticleTexture = null;

export function createCircularParticleTexture() {
  if (cachedParticleTexture) {
    return cachedParticleTexture;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);

  cachedParticleTexture = new THREE.CanvasTexture(canvas);
  return cachedParticleTexture;
}

/**
 * Map planet color to texture URL.
 * More maintainable than color string matching.
 */
export const PLANET_TEXTURES = {
  star: '/textures/sun.jpg',
  mercury: '/textures/mercury.jpg',
  venus: '/textures/venus.jpg',
  earth: '/textures/earth.jpg',
  mars: '/textures/mars.jpg',
  jupiter: '/textures/jupiter.jpg',
  saturn: '/textures/saturn.jpg',
  uranus: '/textures/uranus.jpg',
  neptune: '/textures/neptune.jpg',
};

/**
 * Get texture URL for a planet based on its textureId or fallback to color matching.
 */
export function getPlanetTextureUrl(planet) {
  // If planet has explicit textureId, use it
  if (planet.textureId && PLANET_TEXTURES[planet.textureId]) {
    return PLANET_TEXTURES[planet.textureId];
  }

  // Fallback to type-based mapping
  if (planet.type === 'star') {
    return PLANET_TEXTURES.star;
  }

  // Legacy color-based fallback (for backwards compatibility)
  const colorValue = (planet.color || '').toLowerCase();
  if (colorValue.includes('a855f7')) return PLANET_TEXTURES.venus;
  if (colorValue.includes('22d3ee')) return PLANET_TEXTURES.uranus;
  if (colorValue.includes('ec4899')) return PLANET_TEXTURES.mars;
  if (colorValue.includes('10b981')) return PLANET_TEXTURES.neptune;

  return PLANET_TEXTURES.jupiter;
}
