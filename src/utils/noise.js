// ── 2D value noise utilities ───────────────────────────────────────────────────
// Used for procedural texture generation (asteroid surface, etc.)

function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return hash(ix,   iy)   * (1 - ux) * (1 - uy) +
         hash(ix+1, iy)   *      ux  * (1 - uy) +
         hash(ix,   iy+1) * (1 - ux) *      uy  +
         hash(ix+1, iy+1) *      ux  *      uy;
}

export function fbm(x, y, octaves = 6) {
  let v = 0, amp = 0.5, freq = 1;
  for (let o = 0; o < octaves; o++) {
    v += smoothNoise(x * freq, y * freq) * amp;
    amp *= 0.5; freq *= 2;
  }
  return v;
}
