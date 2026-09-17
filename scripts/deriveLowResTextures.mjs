/**
 * Half-resolution albedo variants for the low and medium quality tiers.
 *
 * Run manually, output committed:
 *   node scripts/deriveLowResTextures.mjs
 *
 * Why: the albedos ship at 2048x1024. Compressed on disk that is cheap (WebP
 * gets them to ~1.5MB total), but a GPU does not store WebP — each one expands
 * to 2048*1024*4 = 8MB, and with mipmaps ~10.7MB. Nine of them is roughly
 * 96MB of texture memory, uploaded synchronously during mount. That upload was
 * measured as the single largest remaining block of main-thread work at load,
 * and the memory alone is a lot to ask of a phone.
 *
 * Halving each dimension is a 4x cut in both. It is invisible at the sizes
 * these bodies actually render — the largest is a few hundred pixels across,
 * and the small ones (PlanetField's spheres are radius 0.15) were already
 * sampling far below 2048 wide, so the full-resolution mip was never reached.
 * The high tier keeps the originals.
 */
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'assets/textures-src';
const OUT = 'public/textures';

const files = (await readdir(SRC)).filter(f => f.endsWith('.jpg'));
await mkdir(OUT, { recursive: true });

let totalBytes = 0;
for (const file of files.sort()) {
  const name = path.basename(file, '.jpg');
  const src = sharp(path.join(SRC, file));
  const { width, height } = await src.metadata();
  const w = Math.round(width / 2), h = Math.round(height / 2);

  const outPath = path.join(OUT, `${name}_lo.webp`);
  const info = await sharp(path.join(SRC, file))
    .resize(w, h, { fit: 'fill' })
    .webp({ quality: 82 })
    .toFile(outPath);

  totalBytes += info.size;
  console.log(`  ${name.padEnd(8)} ${width}x${height} -> ${w}x${h}  ${(info.size / 1024).toFixed(0)}KB`);
}
console.log(`\n  total low-res albedos: ${(totalBytes / 1024).toFixed(0)}KB`);
