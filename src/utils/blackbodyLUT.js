import * as THREE from 'three';

/**
 * Blackbody colour lookup texture.
 *
 * Maps temperature to an RGB chromaticity so the accretion disk is coloured by
 * physics rather than by a hand-picked gradient. Baking it to a 1D texture
 * makes each sample one fetch; an inlined step()-masked ramp costs ~120 ops.
 *
 * Data is downsampled from Mitchell Charity's CIE 1931 -> sRGB blackbody table
 * (http://www.vendian.org/mncharity/dir3/blackbody/), 1000K-20000K. Each entry
 * is normalised so max(r,g,b) = 1: this carries *chromaticity* only. Brightness
 * comes from the disk's own intensity term, which already folds in the
 * Novikov-Thorne radial profile, Doppler beaming and gravitational redshift.
 *
 * Preferred over the Tanner Helland polynomial approximation because it stays
 * accurate below 2000K, which is exactly where the disk's outer edge sits.
 */

export const BB_MIN_K = 1000;
export const BB_MAX_K = 20000;

// [Kelvin, r, g, b] — normalised sRGB chromaticity, 500K steps to 10000K then 1000K.
const TABLE = [
  [1000, 1.0000, 0.2234, 0.0000],
  [1500, 1.0000, 0.3684, 0.0000],
  [2000, 1.0000, 0.4770, 0.1112],
  [2500, 1.0000, 0.5772, 0.2751],
  [3000, 1.0000, 0.6636, 0.4116],
  [3500, 1.0000, 0.7377, 0.5327],
  [4000, 1.0000, 0.8020, 0.6409],
  [4500, 1.0000, 0.8583, 0.7382],
  [5000, 1.0000, 0.9083, 0.8259],
  [5500, 1.0000, 0.9531, 0.9053],
  [6000, 1.0000, 0.9937, 0.9776],
  [6500, 0.9769, 0.9799, 1.0000],
  [7000, 0.9297, 0.9484, 1.0000],
  [7500, 0.8892, 0.9209, 1.0000],
  [8000, 0.8540, 0.8966, 1.0000],
  [8500, 0.8231, 0.8750, 1.0000],
  [9000, 0.7960, 0.8558, 1.0000],
  [9500, 0.7717, 0.8385, 1.0000],
  [10000, 0.7499, 0.8229, 1.0000],
  [11000, 0.7124, 0.7946, 1.0000],
  [12000, 0.6811, 0.7707, 1.0000],
  [13000, 0.6545, 0.7502, 1.0000],
  [14000, 0.6318, 0.7327, 1.0000],
  [15000, 0.6122, 0.7174, 1.0000],
  [16000, 0.5950, 0.7040, 1.0000],
  [17000, 0.5799, 0.6922, 1.0000],
  [18000, 0.5666, 0.6816, 1.0000],
  [19000, 0.5546, 0.6721, 1.0000],
  [20000, 0.5440, 0.6636, 1.0000],
];

const WIDTH = 256;
let _tex = null;

/** Sample the table at an arbitrary temperature, linearly interpolated. */
export function blackbodyRGB(kelvin) {
  const k = Math.max(BB_MIN_K, Math.min(BB_MAX_K, kelvin));
  let hi = 1;
  while (hi < TABLE.length - 1 && TABLE[hi][0] < k) hi++;
  const lo = hi - 1;
  const [k0, r0, g0, b0] = TABLE[lo];
  const [k1, r1, g1, b1] = TABLE[hi];
  const t = k1 === k0 ? 0 : (k - k0) / (k1 - k0);
  return [r0 + (r1 - r0) * t, g0 + (g1 - g0) * t, b0 + (b1 - b0) * t];
}

/**
 * 256x1 RGBA DataTexture spanning BB_MIN_K..BB_MAX_K.
 * Sample with: texture2D(uBB, vec2((K - 1000.0) / 19000.0, 0.5))
 *
 * colorSpace is NoColorSpace — these are already linear values feeding a
 * lighting calculation, so letting three tag them sRGB would double-encode.
 */
export function getBlackbodyLUT() {
  if (_tex) return _tex;

  const data = new Uint8Array(WIDTH * 4);
  for (let i = 0; i < WIDTH; i++) {
    const k = BB_MIN_K + (BB_MAX_K - BB_MIN_K) * (i / (WIDTH - 1));
    const [r, g, b] = blackbodyRGB(k);
    data[i * 4]     = Math.round(r * 255);
    data[i * 4 + 1] = Math.round(g * 255);
    data[i * 4 + 2] = Math.round(b * 255);
    data[i * 4 + 3] = 255;
  }

  _tex = new THREE.DataTexture(data, WIDTH, 1, THREE.RGBAFormat);
  _tex.minFilter  = THREE.LinearFilter;
  _tex.magFilter  = THREE.LinearFilter;
  _tex.wrapS      = THREE.ClampToEdgeWrapping;
  _tex.wrapT      = THREE.ClampToEdgeWrapping;
  _tex.colorSpace = THREE.NoColorSpace;
  _tex.needsUpdate = true;
  return _tex;
}

/**
 * Explicit disposal. threeUtils' disposeMaterial only walks map/normalMap/etc
 * and never touches uniforms.*.value, so this will not be cleaned up for us.
 */
export function disposeBlackbodyLUT() {
  if (_tex) { _tex.dispose(); _tex = null; }
}
