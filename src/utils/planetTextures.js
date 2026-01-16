import * as THREE from 'three';

// Simple noise function (pseudo-random)
function noise(x, y, seed = 0) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

// Fractal Brownian Motion for more organic noise
function fbm(x, y, octaves = 4, seed = 0) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise(x * frequency, y * frequency, seed + i);
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value;
}

// Create an Earth-like planet texture (blue/green continents)
export function createEarthLikeTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Generate noise-based terrain
      const n = fbm(x / size * 3, y / size * 3, 5, 123);

      // Water vs land threshold
      if (n < 0.45) {
        // Ocean - deep blue
        imageData.data[i] = 20 + n * 100;
        imageData.data[i + 1] = 50 + n * 150;
        imageData.data[i + 2] = 150 + n * 100;
      } else if (n < 0.48) {
        // Shallow water / coast
        imageData.data[i] = 100;
        imageData.data[i + 1] = 150;
        imageData.data[i + 2] = 200;
      } else if (n < 0.65) {
        // Land - green
        imageData.data[i] = 50 + n * 100;
        imageData.data[i + 1] = 120 + n * 80;
        imageData.data[i + 2] = 40;
      } else {
        // Mountains - gray/brown
        imageData.data[i] = 100 + n * 80;
        imageData.data[i + 1] = 90 + n * 70;
        imageData.data[i + 2] = 80 + n * 60;
      }
      imageData.data[i + 3] = 255; // Alpha
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

// Create a gas giant texture (Jupiter-like with bands)
export function createGasGiantTexture(size = 512, baseColor = { r: 200, g: 150, b: 100 }) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Create horizontal bands with turbulence
      const bandNoise = fbm(x / size * 2, y / size * 8, 4, 456);
      const swirl = noise(x / size * 4 + bandNoise * 0.5, y / size * 4, 789) * 0.3;

      const band = (y / size + swirl) % 1;
      const brightness = 0.6 + band * 0.4 + bandNoise * 0.3;

      imageData.data[i] = baseColor.r * brightness;
      imageData.data[i + 1] = baseColor.g * brightness;
      imageData.data[i + 2] = baseColor.b * brightness;
      imageData.data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

// Create a rocky/desert planet texture (Mars-like)
export function createRockyTexture(size = 512, baseColor = { r: 180, g: 100, b: 60 }) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Rocky terrain with craters
      const terrain = fbm(x / size * 4, y / size * 4, 6, 234);
      const craters = noise(x / size * 10, y / size * 10, 567);

      // Add crater spots
      const crater = craters > 0.85 ? 0.5 : 1.0;
      const brightness = terrain * crater;

      imageData.data[i] = baseColor.r * brightness;
      imageData.data[i + 1] = baseColor.g * brightness;
      imageData.data[i + 2] = baseColor.b * brightness;
      imageData.data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

// Create an icy planet texture
export function createIcyTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Ice patterns
      const ice = fbm(x / size * 5, y / size * 5, 5, 345);
      const cracks = noise(x / size * 15, y / size * 15, 678) > 0.7 ? 0.7 : 1.0;

      const brightness = ice * cracks;

      // Blue-white ice
      imageData.data[i] = 200 + brightness * 55;
      imageData.data[i + 1] = 220 + brightness * 35;
      imageData.data[i + 2] = 255;
      imageData.data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

// Create a purple/alien planet texture
export function createAlienTexture(size = 512, baseColor = { r: 150, g: 80, b: 200 }) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Alien terrain patterns
      const pattern1 = fbm(x / size * 3, y / size * 3, 4, 901);
      const pattern2 = fbm(x / size * 6, y / size * 6, 3, 234);
      const combined = (pattern1 + pattern2) / 2;

      imageData.data[i] = baseColor.r * combined;
      imageData.data[i + 1] = baseColor.g * combined;
      imageData.data[i + 2] = baseColor.b * combined;
      imageData.data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}
