/**
 * Derive tangent-space normal maps from the planet albedos.
 *
 * Run manually, output committed:
 *   node scripts/deriveNormalMaps.mjs
 *
 * Why derive rather than source: planetary albedo genuinely correlates with
 * relief — craters, maria, mountain shadow and cloud banding all darken the
 * colour map where the surface actually deviates. Sobel-filtering luminance
 * therefore produces a normal map that reads correctly on these particular
 * textures, and avoids hunting for licensed matching normal sets.
 *
 * Two details that matter for equirectangular planet maps:
 *  - X wraps. The left and right edges are the same meridian, so the Sobel
 *    kernel wraps in X; clamping there would leave a visible seam down the
 *    planet where the lighting breaks.
 *  - Y clamps. The poles are not adjacent to each other.
 *
 * Output is half the albedo's resolution: normal detail is lower frequency
 * than colour, and these render on spheres a few hundred pixels across.
 */
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'assets/textures-src';
const OUT = 'public/textures';

// Per-planet relief strength. Gas giants are banded cloud, not terrain, so
// their albedo variation should barely perturb the normal; rocky bodies carry
// real topography and take a much stronger filter.
const STRENGTH = {
  mercury: 3.0,   // heavily cratered
  mars:    2.6,
  venus:   1.6,   // thick atmosphere flattens the visible surface
  earth:   1.8,
  // The gas giants were far too timid at 0.4-0.7: measured, their maps came out
  // deviating ~1/255 from flat, i.e. invisible, so the files were pure payload.
  // Their albedo varies almost entirely in Y (horizontal banding), so the X
  // gradient is legitimately near zero — it is the magnitude that needed
  // raising, not the direction.
  jupiter: 1.4,   // cloud bands — the only gas giant with real gradient to work with
  saturn:  1.8,
  // Uranus and Neptune are skipped, not merely weakened. Their albedos are
  // close to uniform, so there is no gradient to amplify: even at 1.8 the
  // output stayed ~1/255 from flat. Shipping those is payload that implies
  // detail the source does not contain.
  uranus:  0.0,
  neptune: 0.0,
  sun:     0.0,   // emissive; a normal map would be meaningless
};

function sobel(lum, w, h, strength) {
  const out = Buffer.alloc(w * h * 3);
  const at = (x, y) => {
    const xx = ((x % w) + w) % w;              // wrap: same meridian
    const yy = y < 0 ? 0 : y >= h ? h - 1 : y; // clamp: poles are not adjacent
    return lum[yy * w + xx];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = at(x - 1, y - 1), t = at(x, y - 1), tr = at(x + 1, y - 1);
      const l  = at(x - 1, y),                      r  = at(x + 1, y);
      const bl = at(x - 1, y + 1), b = at(x, y + 1), br = at(x + 1, y + 1);

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      // Scale gradients into a slope, then normalise. The 1/1020 divisor is the
      // Sobel maximum (4 * 255) so nx/ny land in -1..1 before strength.
      let nx = (-dx / 1020) * strength;
      let ny = (-dy / 1020) * strength;
      const nz = 1.0;
      const inv = 1 / Math.hypot(nx, ny, nz);
      nx *= inv; ny *= inv;

      const i = (y * w + x) * 3;
      out[i]     = Math.round((nx * 0.5 + 0.5) * 255);
      out[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out[i + 2] = Math.round((nz * inv * 0.5 + 0.5) * 255);
    }
  }
  return out;
}

const files = (await readdir(SRC)).filter(f => f.endsWith('.jpg'));
await mkdir(OUT, { recursive: true });

let totalBytes = 0;
for (const file of files.sort()) {
  const name = path.basename(file, '.jpg');
  const strength = STRENGTH[name];
  if (strength === undefined) { console.log(`  skip ${name} (no strength configured)`); continue; }
  if (strength === 0)         { console.log(`  skip ${name} (no derivable relief)`); continue; }

  const src = sharp(path.join(SRC, file));
  const { width, height } = await src.metadata();
  const w = Math.round(width / 2), h = Math.round(height / 2);

  const lum = await sharp(path.join(SRC, file))
    .resize(w, h, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer();

  const normal = sobel(lum, w, h, strength);

  const outPath = path.join(OUT, `${name}_n.webp`);
  const info = await sharp(normal, { raw: { width: w, height: h, channels: 3 } })
    .webp({ quality: 88 })
    .toFile(outPath);

  totalBytes += info.size;
  console.log(`  ${name.padEnd(8)} ${width}x${height} -> ${w}x${h}  strength ${strength}  ${(info.size / 1024).toFixed(0)}KB`);
}
console.log(`\n  total normal maps: ${(totalBytes / 1024).toFixed(0)}KB`);
