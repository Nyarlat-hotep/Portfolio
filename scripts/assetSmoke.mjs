/**
 * Runtime assertions for two load-time behaviours that regress silently.
 *
 *   node scripts/assetSmoke.mjs [url]     (needs a dev server already running)
 *
 * Neither of these shows up in a build, a lint, or scripts/smoke.mjs: the page
 * looks and behaves identically whether they hold or not. They only appear as
 * mount-time main-thread blocking, which is exactly what makes them easy to
 * undo by accident.
 *
 *  1. No AudioContext is constructed before a user gesture. Constructing one
 *     costs ~130ms of blocking work, and autoplay policy means one built that
 *     early is suspended and unusable. A single getBgCtx() call moved back into
 *     the mount path reintroduces the whole cost.
 *
 *  2. Each quality tier loads the albedo resolution it is supposed to. Low and
 *     medium take the half-size _lo variants — a 4x cut in GPU memory and
 *     upload time. Any load site that forgets albedoFor() quietly pulls the
 *     2048x1024 original back in, and nothing looks wrong.
 */
import puppeteer from 'puppeteer';

const BASE = process.argv[2] || 'http://localhost:5199/';
const SETTLE_MS = 7000;
const fails = [];

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--no-sandbox',
    '--autoplay-policy=document-user-activation-required',
  ],
});

// ── 1. Audio is deferred until a gesture, but still starts on one ────────────
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 800 });
  await page.evaluateOnNewDocument(() => {
    window.__ctxCount = 0;
    const Real = window.AudioContext;
    window.AudioContext = class extends Real {
      constructor(...a) { super(...a); window.__ctxCount++; window.__lastCtx = this; }
    };
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  await new Promise(r => setTimeout(r, 5000));

  const atMount = await page.evaluate(() => window.__ctxCount);
  if (atMount === 0) {
    console.log('  PASS  no AudioContext before a gesture');
  } else {
    console.log(`  FAIL  ${atMount} AudioContext(s) constructed at mount — something calls getBgCtx() before a gesture`);
    fails.push('audio-eager');
  }

  await page.mouse.click(550, 400);
  await new Promise(r => setTimeout(r, 3000));
  const after = await page.evaluate(() => ({ n: window.__ctxCount, state: window.__lastCtx?.state ?? null }));
  if (after.n >= 1 && after.state === 'running') {
    console.log('  PASS  AudioContext created and running after a gesture');
  } else {
    console.log(`  FAIL  after gesture: ${after.n} context(s), state=${after.state} — deferral broke playback`);
    fails.push('audio-never-starts');
  }
  await page.close();
}

// ── 2. Albedo resolution matches the tier ────────────────────────────────────
const EXPECT = {
  low:  { lo: true,  normals: false },
  med:  { lo: true,  normals: true  },
  high: { lo: false, normals: true  },
};

for (const tier of ['low', 'med', 'high']) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 800 });
  const seen = new Set();
  const failedReqs = [];
  page.on('response', r => {
    const u = r.url();
    if (!u.includes('/textures/')) return;
    seen.add(u.split('/').pop().split('?')[0]);
    if (r.status() >= 400) failedReqs.push(u);
  });
  await page.goto(`${BASE}?q=${tier}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  await new Promise(r => setTimeout(r, SETTLE_MS));
  await page.close();

  const all     = [...seen];
  const lo      = all.filter(f => f.includes('_lo.'));
  const normals = all.filter(f => f.includes('_n.'));
  const full    = all.filter(f => !f.includes('_lo.') && !f.includes('_n.'));
  const want    = EXPECT[tier];

  const wrongRes = want.lo ? full.length > 0 : lo.length > 0;
  const noneAtAll = all.length === 0;
  const badNormals = want.normals ? normals.length === 0 : normals.length > 0;

  if (noneAtAll) {
    console.log(`  FAIL  q=${tier}: no planet textures requested at all`);
    fails.push(`tex-${tier}-none`);
  } else if (wrongRes) {
    const wrong = want.lo ? full : lo;
    console.log(`  FAIL  q=${tier}: wrong albedo resolution — ${wrong.join(' ')}`);
    fails.push(`tex-${tier}-res`);
  } else if (badNormals) {
    console.log(`  FAIL  q=${tier}: expected normals=${want.normals}, got ${normals.length}`);
    fails.push(`tex-${tier}-normals`);
  } else if (failedReqs.length) {
    console.log(`  FAIL  q=${tier}: ${failedReqs.length} texture request(s) failed — ${failedReqs[0]}`);
    fails.push(`tex-${tier}-404`);
  } else {
    console.log(`  PASS  q=${tier}: ${want.lo ? 'half-res' : 'full-res'} albedos, ${normals.length} normal map(s)`);
  }
}

await browser.close();

if (fails.length) {
  console.log(`\nFAILED: ${fails.join(', ')}`);
  process.exit(1);
}
console.log('\nALL ASSET CHECKS PASS');
