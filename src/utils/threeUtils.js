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
 * Shared nebula splat texture — large soft particles that accumulate into haze.
 * Cached at module level so Constellation and DistantGalaxy share one instance.
 */
let cachedNebulaSplatTexture = null;

export function createNebulaSplatTexture() {
  if (cachedNebulaSplatTexture) return cachedNebulaSplatTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
  grad.addColorStop(0,    'rgba(255,255,255,0.3)');
  grad.addColorStop(0.2,  'rgba(255,255,255,0.18)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.08)');
  grad.addColorStop(0.7,  'rgba(255,255,255,0.02)');
  grad.addColorStop(1,    'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  cachedNebulaSplatTexture = new THREE.CanvasTexture(canvas);
  return cachedNebulaSplatTexture;
}

