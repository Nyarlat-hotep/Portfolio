// scripts/gen-constellations.mjs
// One-time generator — run with: node scripts/gen-constellations.mjs > src/data/constellations.js
// Source data: d3-celestial by Olaf Frohn (MIT license)
// https://github.com/ofrohn/d3-celestial

const LINES_URL = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json';
const NAMES_URL = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.json';

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

  const linesGeo  = await linesRes.json();
  const namesGeo  = await namesRes.json(); // GeoJSON FeatureCollection with Point geometries

  // Build id → English name map from constellations.json
  const namesData = {};
  for (const feature of namesGeo.features) {
    const id = feature.id ?? feature.properties?.desig;
    if (id) namesData[id] = feature.properties?.en ?? feature.properties?.name ?? id;
  }

  const constellations = [];

  for (const feature of linesGeo.features) {
    const id              = feature.id;                    // e.g. "Oph"
    const multiLineString = feature.geometry.coordinates; // [[[ra,dec],...], ...]

    // ── Collect unique star positions ──────────────────────────────────────────
    const pointMap = new Map(); // "ra,dec" → star index
    const rawStars  = [];
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
      for (let i = 0; i < indices.length - 1; i++) {
        if (indices[i] !== indices[i + 1]) linePairs.push([indices[i], indices[i + 1]]);
      }
    }

    if (rawStars.length < 2) {
      process.stderr.write(`Skipping ${id}: fewer than 2 unique stars\n`);
      continue;
    }

    // ── Handle RA wrap-around (constellations crossing 0h/360° boundary) ──────
    const ras    = rawStars.map(s => s[0]);
    const raSpan = Math.max(...ras) - Math.min(...ras);
    const stars  = raSpan > 180
      ? rawStars.map(([ra, dec]) => [ra < 180 ? ra + 360 : ra, dec])
      : rawStars;

    // ── Centroid ───────────────────────────────────────────────────────────────
    const raCenter  = stars.reduce((s, p) => s + p[0], 0) / stars.length;
    const decCenter = stars.reduce((s, p) => s + p[1], 0) / stars.length;
    const cosDec    = Math.cos(decCenter * Math.PI / 180);

    // ── Equirectangular projection centred on constellation ────────────────────
    const projected = stars.map(([ra, dec]) => [
      -(ra - raCenter) * cosDec,
      dec - decCenter,
    ]);

    // ── Normalise so the largest axis spans 9 units (±4.5) ────────────────────
    const xs   = projected.map(p => p[0]);
    const ys   = projected.map(p => p[1]);
    // 0.5 floor prevents div/0 for collinear stars that share the same RA or Dec
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

    const englishName = namesData[id] ?? id;
    const wikiKey     = WIKI_KEYS[id] ?? englishName;

    constellations.push({ name: englishName, wikiKey, stars: scaledStars, lines: uniqueLines });
  }

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

main().catch(err => { process.stderr.write(err.stack + '\n'); process.exit(1); });
