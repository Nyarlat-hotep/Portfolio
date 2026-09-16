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

const URL_ARG = process.argv[2] || 'http://localhost:5199/';
const SETTLE_MS = 6000;

// Noise that is not ours and not actionable.
const IGNORE = [
  /favicon/i,
  /Download the React DevTools/i,
  /Failed to load resource.*404.*\.map/i,
];

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
  if (IGNORE.some((re) => re.test(u))) return;
  errors.push(`REQUEST FAILED: ${u} (${r.failure()?.errorText})`);
});

let exitCode = 0;
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
  console.log(`  ${frames} frames in 1s`);
  if (frames < 5) { errors.push(`RENDER STALLED: only ${frames} frames in 1s`); }

  // Exercise the black hole path — click the middle of the canvas.
  const box = await page.$eval('canvas', (c) => {
    const r = c.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(box.x, box.y);
  await new Promise((r) => setTimeout(r, 3000));
  console.log('  clicked canvas, settled');
} catch (err) {
  errors.push(`HARNESS: ${err.message}`);
} finally {
  await browser.close();
}

if (warnings.length) {
  console.log(`\n  ${warnings.length} warning(s):`);
  [...new Set(warnings)].slice(0, 5).forEach((w) => console.log(`    - ${w}`));
}
if (errors.length) {
  console.log(`\n  FAIL — ${errors.length} error(s):`);
  [...new Set(errors)].forEach((e) => console.log(`    ! ${e}`));
  exitCode = 1;
} else {
  console.log('\n  PASS — no console errors, no uncaught exceptions, rendering');
}
process.exit(exitCode);
