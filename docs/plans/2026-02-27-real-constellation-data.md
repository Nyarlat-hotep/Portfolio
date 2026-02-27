# Real Constellation Data Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hand-crafted constellation coordinates in `src/data/constellations.js` with real IAU astronomical data so each constellation's shape matches what users see online.

**Architecture:** A one-time Node.js generation script fetches the MIT-licensed d3-celestial constellation line data (GeoJSON with real RA/Dec coordinates), deduplicates vertices into a star list, builds index-pair line arrays, applies a centered equirectangular projection, normalises each constellation to ±4.5 display units, and outputs a new `constellations.js` module. The script is deleted after use — only the generated file is kept.

**Tech Stack:** Node.js ESM (no extra deps — uses built-in `fetch`), d3-celestial MIT-licensed data hosted on GitHub raw CDN.

---

### Task 1: Create the generation script

**Files:**
- Create: `scripts/gen-constellations.mjs`

Write the file with the exact content below:

```js
// scripts/gen-constellations.mjs
// One-time generator — run with: node scripts/gen-constellations.mjs > src/data/constellations.js
// Source data: d3-celestial by Olaf Frohn (MIT license)
// https://github.com/ofrohn/d3-celestial

const LINES_URL  = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json';
const NAMES_URL  = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellation_names.nom.json';

// Wikipedia article keys — some constellations share names with other topics and need disambiguation
const WIKI_KEYS = {
  And: 'Andromeda_(constellation)',   Ant: 'Antlia',                      Aps: 'Apus',
  Aqr: 'Aquarius_(constellation)',    Aql: 'Aquila_(constellation)',       Ara: 'Ara_(constellation)',
  Ari: 'Aries_(constellation)',       Aur: 'Auriga_(constellation)',       Boo: 'Boötes',
  Cae: 'Caelum',                      Cam: 'Camelopardalis',               Cnc: 'Cancer_(constellation)',
  CVn: 'Canes_Venatici',              CMa: 'Canis_Major',                  CMi: 'Canis_Minor',
  Cap: 'Capricornus',                 Car: 'Carina_(constellation)',        Cas: 'Cassiopeia_(constellation)',
  Cen: 'Centaurus',                   Cep: 'Cepheus_(constellation)',       Cet: 'Cetus',
  Cha: 'Chamaeleon_(constellation)',  Cir: 'Circinus_(constellation)',      Col: 'Columba_(constellation)',
  Com: 'Coma_Berenices',              CrA: 'Corona_Australis',             CrB: 'Corona_Borealis',
  Crv: 'Corvus_(constellation)',      Crt: 'Crater_(constellation)',        Cru: 'Crux',
  Cyg: 'Cygnus_(constellation)',      Del: 'Delphinus',                    Dor: 'Dorado_(constellation)',
  Dra: 'Draco_(constellation)',       Equ: 'Equuleus',                     Eri: 'Eridanus_(constellation)',
  For: 'Fornax',                      Gem: 'Gemini_(constellation)',        Gru: 'Grus_(constellation)',
  Her: 'Hercules_(constellation)',    Hor: 'Horologium_(constellation)',    Hya: 'Hydra_(constellation)',
  Hyi: 'Hydrus',                      Ind: 'Indus_(constellation)',         Lac: 'Lacerta',
  Leo: 'Leo_(constellation)',         LMi: 'Leo_Minor',                    Lep: 'Lepus_(constellation)',
  Lib: 'Libra_(constellation)',       Lup: 'Lupus_(constellation)',         Lyn: 'Lynx_(constellation)',
  Lyr: 'Lyra',                        Men: 'Mensa_(constellation)',         Mic: 'Microscopium',
  Mon: 'Monoceros',                   Mus: 'Musca',                         Nor: 'Norma_(constellation)',
  Oct: 'Octans',                      Oph: 'Ophiuchus',                    Ori: 'Orion_(constellation)',
  Pav: 'Pavo_(constellation)',        Peg: 'Pegasus_(constellation)',       Per: 'Perseus_(constellation)',
  Phe: 'Phoenix_(constellation)',     Pic: 'Pictor',                       Psc: 'Pisces_(constellation)',
  PsA: 'Piscis_Austrinus',            Pup: 'Puppis',                       Pyx: 'Pyxis',
  Ret: 'Reticulum',                   Sge: 'Sagitta',                      Sgr: 'Sagittarius_(constellation)',
  Sco: 'Scorpius',                    Scl: 'Sculptor_(constellation)',      Sct: 'Scutum_(constellation)',
  Ser: 'Serpens',                     Sex: 'Sextans_(constellation)',       Tau: 'Taurus_(constellation)',
  Tel: 'Telescopium',                 Tri: 'Triangulum_(constellation)',    TrA: 'Triangulum_Australe',
  Tuc: 'Tucana',                      UMa: 'Ursa_Major',                   UMi: 'Ursa_Minor',
  Vel: 'Vela_(constellation)',        Vir: 'Virgo_(constellation)',         Vol: 'Volans',
  Vul: 'Vulpecula',
};

async function main() {
  const [linesRes, namesRes] = await Promise.all([
    fetch(LINES_URL),
    fetch(NAMES_URL),
  ]);
  if (!linesRes.ok) throw new Error(`Failed to fetch lines: ${linesRes.status}`);
  if (!namesRes.ok) throw new Error(`Failed to fetch names: ${namesRes.status}`);

  const linesGeo = await linesRes.json();
  const namesData = await namesRes.json(); // { "Ori": { "en": "Orion", ... }, ... }

  const constellations = [];

  for (const feature of linesGeo.features) {
    const id = feature.id; // 3-letter IAU abbreviation e.g. "Oph"
    const multiLineString = feature.geometry.coordinates; // [[[ra,dec],...], ...]

    // ── Collect unique star positions ──────────────────────────────────────────
    const pointMap = new Map(); // "ra,dec" → star index
    const rawStars  = [];       // [ra, dec] in degrees
    const linePairs = [];

    for (const lineString of multiLineString) {
      const indices = [];
      for (const [ra, dec] of lineString) {
        const key = `${ra},${dec}`;
        if (!pointMap.has(key)) {
          pointMap.set(key, rawStars.length);
          rawStars.push([ra, dec]);
        }
        indices.push(pointMap.get(key));
      }
      // Convert polyline of N points → N-1 index pairs
      for (let i = 0; i < indices.length - 1; i++) {
        linePairs.push([indices[i], indices[i + 1]]);
      }
    }

    // ── Handle RA wrap-around (constellations crossing 0h/360° boundary) ──────
    // If the RA spread is > 180°, shift stars with RA < 180 up by 360
    const ras = rawStars.map(s => s[0]);
    const raSpan = Math.max(...ras) - Math.min(...ras);
    const stars = raSpan > 180
      ? rawStars.map(([ra, dec]) => [ra < 180 ? ra + 360 : ra, dec])
      : rawStars;

    // ── Centroid ───────────────────────────────────────────────────────────────
    const raCenter  = stars.reduce((s, p) => s + p[0], 0) / stars.length;
    const decCenter = stars.reduce((s, p) => s + p[1], 0) / stars.length;
    const cosDec    = Math.cos(decCenter * Math.PI / 180);

    // ── Equirectangular projection centred on constellation ────────────────────
    // x: negate because RA increases east→west on the sky
    const projected = stars.map(([ra, dec]) => [
      -(ra - raCenter) * cosDec,
      dec - decCenter,
    ]);

    // ── Normalise so the largest axis spans 9 units (±4.5) ────────────────────
    const xs   = projected.map(p => p[0]);
    const ys   = projected.map(p => p[1]);
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 0.5);
    const scale = 9.0 / span;

    const scaledStars = projected.map(([x, y]) => [
      Math.round(x * scale * 100) / 100,
      Math.round(y * scale * 100) / 100,
    ]);

    // ── Deduplicate line pairs ─────────────────────────────────────────────────
    const seen = new Set();
    const uniqueLines = linePairs.filter(([a, b]) => {
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // ── Name + wikiKey ─────────────────────────────────────────────────────────
    const englishName = namesData[id]?.en ?? id;
    const wikiKey     = WIKI_KEYS[id] ?? englishName;

    constellations.push({ name: englishName, wikiKey, stars: scaledStars, lines: uniqueLines });
  }

  // Sort alphabetically so the array order is deterministic
  constellations.sort((a, b) => a.name.localeCompare(b.name));

  const header = [
    '// All 88 IAU constellations',
    '// Generated by scripts/gen-constellations.mjs from d3-celestial MIT-licensed data',
    '// stars: [x, y] positions in local space (~±4.5 units), equirectangular projection',
    '// lines: [indexA, indexB] pairs connecting stars',
    '// wikiKey: Wikipedia article key for page/summary API',
    '',
  ].join('\n');

  process.stdout.write(header);
  process.stdout.write('export const CONSTELLATIONS = ');
  process.stdout.write(JSON.stringify(constellations, null, 2));
  process.stdout.write(';\n');
}

main().catch(err => { console.error(err); process.exit(1); });
```

**Step 1: Create the scripts directory and file**

```bash
mkdir -p scripts
```
Then write the file as above.

**Step 2: Verify the script exists**

```bash
ls scripts/gen-constellations.mjs
```
Expected: file listed.

---

### Task 2: Run the generator and replace the constellation data

**Files:**
- Overwrite: `src/data/constellations.js`

**Step 1: Run the script**

```bash
node scripts/gen-constellations.mjs > src/data/constellations.js
```

Expected: no errors to stderr, `src/data/constellations.js` is overwritten.

**Step 2: Sanity-check the output**

```bash
head -20 src/data/constellations.js
```
Expected: starts with the generated header comment and `export const CONSTELLATIONS = [`.

```bash
node -e "import('./src/data/constellations.js').then(m => { const c = m.CONSTELLATIONS; console.log('Count:', c.length); const oph = c.find(x => x.name === 'Ophiuchus'); console.log('Ophiuchus stars:', oph.stars.length, '| lines:', oph.lines.length); console.log('Sample star:', oph.stars[0]); })"
```
Expected:
- Count: 88
- Ophiuchus stars: 10+ (real constellation has more than 7)
- Sample star: a pair of floats, not symmetric round numbers like `[0, 4.5]`

**Step 3: Build to ensure no import errors**

```bash
npm run build 2>&1 | tail -6
```
Expected: `✓ built in` with no errors.

**Step 4: Commit**

```bash
git add src/data/constellations.js scripts/gen-constellations.mjs
git commit -m "replace hand-crafted constellation data with real IAU astronomical data

Generated from d3-celestial (MIT) using equirectangular projection.
All 88 constellations now use real star positions and IAU line patterns.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Visual spot-check and optional rollback

**Step 1: Run dev server**

```bash
npm run dev
```

Navigate to the galaxy view and check the constellation visible today.

**Step 2: Verify shape**

Compare the constellation shown against a reference image online. Key checks:
- Ophiuchus should look like an asymmetric humanoid with arms/body spread (not a perfectly symmetric diamond)
- Orion should show the distinctive belt + shoulders + feet
- Cassiopeia should show a W/M shape

**If shapes look wrong / rollback needed:**

```bash
git revert HEAD
```

This undoes the data replacement commit cleanly and returns to the hand-crafted data.

**Step 3: If shapes look good — delete the generation script**

```bash
git rm scripts/gen-constellations.mjs
git commit -m "remove one-time constellation generation script

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Rollback path

At any point, the generation commit can be cleanly reverted:
```bash
git revert <sha-of-generation-commit>
```
This restores the original hand-crafted data with zero risk.
