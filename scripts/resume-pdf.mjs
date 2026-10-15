/**
 * Renders /resume through its print stylesheet into public/Taylor-Cornelius-Resume.pdf,
 * so the download always matches the page.
 *
 *   npm run dev -- --port 5199   (in another terminal)
 *   node scripts/resume-pdf.mjs [url]
 */
import puppeteer from 'puppeteer';

const TARGET = process.argv[2] || 'http://localhost:5199/resume';
const OUT = new URL('../public/Taylor-Cornelius-Resume.pdf', import.meta.url).pathname;

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 1400 });
await page.goto(TARGET, { waitUntil: 'networkidle0' });
await page.evaluateHandle('document.fonts.ready');
// Let the stat count-ups finish before printing.
await new Promise((r) => setTimeout(r, 2500));
await page.pdf({ path: OUT, printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log(`wrote ${OUT}`);
