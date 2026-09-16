/**
 * Runtime smoke test — loads the app in headless Chrome and fails on any
 * console error or uncaught exception.
 *
 *   node scripts/smoke.mjs [url]
 *
 * This exists because the static suites cannot catch the class of bug that
 * actually broke the page: passing an array where three expected a Texture
 * type-checks fine, builds fine, and lints fine — it only fails when a frame
 * is drawn. Anything that touches the render loop needs to be *run*.
 *
 * WebGL runs on SwiftShader so this works without a GPU.
 */
import puppeteer from 'puppeteer';

const BASE = process.argv[2] || 'http://localhost:5199/';

// Every quality tier compiles a DIFFERENT shader — the raymarching tiers pull in
// blocks the analytic tier never sees. Headless SwiftShader reports few cores, so
// the auto-detected tier here is always LOW; testing only that meant a shader
// that failed to compile on MED and HIGH passed this suite repeatedly while the
// hole was invisible in a real browser. ?q= forces each one.
const TIERS = ['low', 'med', 'high'];
const SETTLE_MS = 6000;

// Noise that is not ours and not actionable.
const IGNORE = [
  /favicon/i,
  /Download the React DevTools/i,
  /Failed to load resource.*404.*\.map/i,
];

async function checkTier(tier) {
const URL_ARG = `${BASE}?q=${tier}`;
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--no-sandbox',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

const errors = [];
const warnings = [];
page.on('pageerror', (e) => errors.push(`UNCAUGHT: ${e.message.split('\n')[0]}`));
page.on('console', (m) => {
  const text = m.text();
  if (IGNORE.some((re) => re.test(text))) return;
  if (m.type() === 'error')   errors.push(`CONSOLE: ${text.slice(0, 300)}`);
  if (m.type() === 'warning') warnings.push(text.slice(0, 200));
});
page.on('requestfailed', (r) => {
  const u = r.url();
  const why = r.failure()?.errorText || '';
  if (IGNORE.some((re) => re.test(u))) return;
  // Headless Chrome aborts media it cannot autoplay without a user gesture, so
  // ERR_ABORTED on an audio file is expected here and not a real failure.
  // Deliberately narrow: a missing file still surfaces, because that reports as
  // a 404 rather than an abort.
  if (/ERR_ABORTED/.test(why) && /\.(mp3|ogg|wav|m4a)(\?|$)/i.test(u)) return;
  errors.push(`REQUEST FAILED: ${u} (${why})`);
});

try {
  console.log(`  loading ${URL_ARG}`);
  await page.goto(URL_ARG, { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForSelector('canvas', { timeout: 20000 });
  console.log('  canvas mounted');

  // Let the intro animation, texture loads and shader compiles all happen.
  await new Promise((r) => setTimeout(r, SETTLE_MS));

  // Confirm frames are actually being produced, not just that nothing threw.
  const frames = await page.evaluate(() => new Promise((res) => {
    let n = 0;
    const t0 = performance.now();
    const tick = () => {
      n++;
      if (performance.now() - t0 > 1000) res(n);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  console.log(`  ${frames} frames in 1s (startup)`);
  // Only asserts the page is alive. This window lands on the intro animation,
  // texture loads and shader compiles, which on SwiftShader legitimately runs
  // at 3-7 fps — a stricter bound here failed intermittently for no real
  // reason. The post-interaction measurement below is the stable one and
  // carries the actual health check.
  if (frames < 1) { errors.push(`NOT RENDERING: ${frames} frames in 1s`); }

  // Exercise the black hole path. Getting here is fiddly and was worth pinning
  // down: the nebula sits at world (-60, 0, 20), roughly 60 units off-axis
  // against a ~32-unit visible half-width, so it is off-screen at startup and
  // no click on the default view can reach it. Zooming out brings it into the
  // left edge of frame.
  //
  // Two traps, both of which silently made this test prove nothing:
  //   - keyboard.press() holds for milliseconds, but the camera controller
  //     orbits/zooms only while a key is HELD, so presses barely move it.
  //   - focusing by clicking the centre hits the sun and opens the nav menu.
  await page.mouse.click(1000, 620);            // focus on empty sky
  await new Promise((r) => setTimeout(r, 400));
  await page.keyboard.down('ArrowDown');        // zoom out
  await new Promise((r) => setTimeout(r, 5000));
  await page.keyboard.up('ArrowDown');
  await new Promise((r) => setTimeout(r, 1500));

  for (const x of [60, 120, 200, 300]) {
    for (const y of [380, 440, 500]) {
      await page.mouse.click(x, y);
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  console.log('  zoomed out and clicked into the nebula');

  // Let a well run: spawn, gravity window, inspiral, collapse flash.
  await new Promise((r) => setTimeout(r, 5000));

  // Frames must still be flowing afterwards — a stall here would mean the
  // extra scene capture per frame has hung the loop.
  const after = await page.evaluate(() => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const tick = () => { n++; if (performance.now() - t0 > 1000) res(n); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }));
  console.log(`  ${after} frames in 1s after interaction`);
  if (after < 5) errors.push(`RENDER STALLED AFTER CLICK: ${after} frames in 1s`);
} catch (err) {
  errors.push(`HARNESS: ${err.message}`);
} finally {
  await browser.close();
}

if (errors.length) {
  console.log(`  FAIL (${tier}) — ${errors.length} error(s):`);
  [...new Set(errors)].forEach((e) => console.log(`    ! ${e}`));
  return false;
}
console.log(`  PASS (${tier})`);
return true;
}

let allOk = true;
for (const t of TIERS) {
  console.log(`\n=== tier ${t} ===`);
  const ok = await checkTier(t);
  if (!ok) allOk = false;
}
console.log(allOk ? '\nALL TIERS PASS' : '\nFAILURES ABOVE');
process.exit(allOk ? 0 : 1);
