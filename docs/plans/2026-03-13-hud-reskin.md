# HUD Reskin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the purple-nebula glassmorphism aesthetic with a true-black / amber military HUD aesthetic across all 2D UI layers, without touching the 3D galaxy scene.

**Architecture:** Swap CSS custom properties at root level first (everything else inherits), then work surface-by-surface from global → layout → components → new elements. Each task is independently verifiable and committable.

**Tech Stack:** React + Vite, plain CSS (no Tailwind), Framer Motion, existing fonts Exo 2 + Rajdhani.

**Design doc:** `docs/plans/2026-03-13-hud-reskin-design.md`

**Revert anchor:** commit `f0a903a` (before any reskin changes)

---

## Task 1: Replace Color Variables in `index.css`

**Files:**
- Modify: `src/index.css`

The root `:root` block currently defines the purple/blue palette. Replace all color tokens with the new amber/black system. This single change cascades through every component that uses CSS vars.

**Step 1: Open `src/index.css` and replace the `:root` color block**

Find the existing `:root` block and replace the color variable section with:

```css
:root {
  /* Color palette — HUD amber/black */
  --space-dark: #050505;
  --space-medium: #0f0f0f;
  --electric-blue: #ff7700;
  --neon-purple: #cc2200;
  --cyan: #ffaa33;
  --pink: #ff3300;
  --glass-white: rgba(255, 119, 0, 0.05);
  --glass-border: rgba(255, 119, 0, 0.35);
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.65);
  --amber: #ff7700;
  --amber-dim: rgba(255, 119, 0, 0.35);
  --amber-glow: rgba(255, 119, 0, 0.15);

  /* Typography */
  font-family: 'Exo 2', 'Rajdhani', system-ui, -apple-system, 'Segoe UI', sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: dark;
  color: var(--text-primary);
  background-color: var(--space-dark);

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

Also update `a` hover and `button` hover/border states later in the file to use `--amber` instead of `--electric-blue`/`--cyan`.

**Step 2: Run dev server and verify**

```bash
npm run dev
```

Expected: entire UI shifts from blue/purple tones to amber. Galaxy scene should be unaffected (it uses inline colors / Three.js materials, not CSS vars).

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: replace color palette with amber/black HUD system"
```

---

## Task 2: Restyle `PageOverlay` — Remove Glassmorphism, Hard Panel

**Files:**
- Modify: `src/components/UI/PageOverlay.css`
- Modify: `src/components/UI/PageOverlay.jsx`

**Step 1: Update `PageOverlay.css`**

Replace the `.overlay-backdrop` and `.overlay-container` blocks:

```css
/* Backdrop */
.overlay-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 2000;
}

/* Main Overlay Container */
.overlay-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2001;

  background: #050505;
  border: none;
  border-radius: 0;

  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Amber edge accent — top border line */
.overlay-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 119, 0, 0.6) 20%,
    rgba(255, 119, 0, 0.6) 80%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 10;
}
```

Update `.corner-accent` to use amber:

```css
.corner-accent {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: rgba(255, 119, 0, 0.6);
  border-style: solid;
  border-width: 0;
}

.corner-accent.top-left {
  top: 12px;
  left: 12px;
  border-top-width: 1.5px;
  border-left-width: 1.5px;
}

.corner-accent.top-right {
  top: 12px;
  right: 12px;
  border-top-width: 1.5px;
  border-right-width: 1.5px;
}

.corner-accent.bottom-left {
  bottom: 12px;
  left: 12px;
  border-bottom-width: 1.5px;
  border-left-width: 1.5px;
}

.corner-accent.bottom-right {
  bottom: 12px;
  right: 12px;
  border-bottom-width: 1.5px;
  border-right-width: 1.5px;
}
```

Update `.overlay-header`:

```css
.overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  border-bottom: 1px solid rgba(255, 119, 0, 0.2);
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

.overlay-title {
  font-family: 'Rajdhani', sans-serif;
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #ffffff;
  margin: 0;
}
```

**Step 2: Update inline styles on close button in `PageOverlay.jsx`**

Find the `<button>` close button and replace its inline `style` prop:

```jsx
style={{
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  background: 'rgba(255, 119, 0, 0.08)',
  border: '1px solid rgba(255, 119, 0, 0.4)',
  borderRadius: '4px',
  color: '#ff7700',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontWeight: 600,
  letterSpacing: '1px',
  textTransform: 'uppercase'
}}
```

**Step 3: Verify in dev server**

Open any overlay. Should render on true black with amber corner brackets and amber header border. No blur/glow fog.

**Step 4: Commit**

```bash
git add src/components/UI/PageOverlay.css src/components/UI/PageOverlay.jsx
git commit -m "feat: restyle PageOverlay as hard HUD panel"
```

---

## Task 3: Build Ticker Strip Component

**Files:**
- Create: `src/components/UI/Ticker.jsx`
- Create: `src/components/UI/Ticker.css`
- Modify: `src/components/UI/PageOverlay.jsx` (import + place ticker)
- Modify: `src/components/UI/PageOverlay.css` (ticker slot spacing)

**Step 1: Create `src/components/UI/Ticker.css`**

```css
.ticker-strip {
  width: 100%;
  height: 28px;
  background: rgba(255, 119, 0, 0.06);
  border-bottom: 1px solid rgba(255, 119, 0, 0.15);
  overflow: hidden;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

.ticker-track {
  display: flex;
  white-space: nowrap;
  animation: tickerScroll 28s linear infinite;
}

.ticker-content {
  display: flex;
  align-items: center;
  gap: 0;
  padding-right: 0;
}

.ticker-text {
  font-family: 'Exo 2', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 119, 0, 0.55);
  padding: 0 2rem;
}

.ticker-sep {
  color: rgba(255, 119, 0, 0.3);
  font-size: 10px;
  letter-spacing: 0;
}

@keyframes tickerScroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}
```

**Step 2: Create `src/components/UI/Ticker.jsx`**

```jsx
import './Ticker.css';

const ITEMS = [
  'SYSTEM NOMINAL',
  'OBJECT DETECTED',
  'COORDINATES LOCKED',
  'SIGNAL ACQUIRED',
  'TRAJECTORY CONFIRMED',
  'DEEP SCAN ACTIVE',
  'PROXIMITY ALERT',
  'DATA STREAM OPEN',
];

export default function Ticker() {
  // Duplicate items so the loop is seamless
  const all = [...ITEMS, ...ITEMS];

  return (
    <div className="ticker-strip" aria-hidden="true">
      <div className="ticker-track">
        <div className="ticker-content">
          {all.map((item, i) => (
            <span key={i}>
              <span className="ticker-sep">◀▶</span>
              <span className="ticker-text">{item}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Add `<Ticker />` to `PageOverlay.jsx`**

Import at the top:
```jsx
import Ticker from './Ticker';
```

Place it directly after the `.overlay-header` closing `</div>` and before the scrollable content div:
```jsx
{/* Ticker strip */}
<Ticker />
```

**Step 4: Verify**

Open any overlay. A thin amber ticker band should scroll horizontally beneath the header.

**Step 5: Commit**

```bash
git add src/components/UI/Ticker.jsx src/components/UI/Ticker.css src/components/UI/PageOverlay.jsx
git commit -m "feat: add scrolling HUD ticker strip to overlay header"
```

---

## Task 4: Restyle Navigation (`BottomNav`)

**Files:**
- Modify: `src/components/Navigation/BottomNav.css`

**Step 1: Update `.nav-main` panel**

Replace its background/border/shadow/radius:

```css
.nav-main {
  background: rgba(5, 5, 5, 0.97);
  border: 1px solid rgba(255, 119, 0, 0.3);
  border-radius: 4px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 119, 0, 0.08);
  width: 270px;
  /* ...keep existing grid-template-rows animation props unchanged... */
}
```

**Step 2: Update hover state**

```css
.nav-main:has(.nav-list.expanded):hover {
  background: rgba(8, 8, 8, 0.99);
  border-color: rgba(255, 119, 0, 0.5);
}
```

**Step 3: Update nav item active/hover states**

Find `.nav-item` active and hover selectors and replace blue/purple accent colors with amber `rgba(255, 119, 0, ...)`.

Find any `#00d4ff`, `#a855f7`, `rgba(0, 212, 255`, `rgba(168, 85, 247` occurrences in `BottomNav.css` and replace with amber equivalents:
- Active borders/accents: `rgba(255, 119, 0, 0.6)`
- Hover backgrounds: `rgba(255, 119, 0, 0.08)`
- Active glow: `rgba(255, 119, 0, 0.15)`

**Step 4: Nav label text treatment**

Add to nav item label styles:
```css
text-transform: uppercase;
letter-spacing: 0.1em;
```

**Step 5: Verify**

Open the nav. Labels should be uppercase, borders amber, no blue/purple anywhere.

**Step 6: Commit**

```bash
git add src/components/Navigation/BottomNav.css
git commit -m "feat: restyle navigation with amber HUD treatment"
```

---

## Task 5: Update `HexAccent` and `OctagonAccent` with Reticle Details

**Files:**
- Modify: `src/components/UI/HexAccent.jsx`
- Modify: `src/components/UI/HexAccent.css`
- Modify: `src/components/UI/OctagonAccent.jsx`
- Modify: `src/components/UI/OctagonAccent.css`

**Step 1: Update default color props in `HexAccent.jsx`**

Change `color = '#00d4ff'` to `color = '#ff7700'` in the function signature.

**Step 2: Add reticle crosshair to `HexAccent.jsx` SVG**

Inside the `<svg>`, after the existing `<polygon>`, add:
```jsx
{/* Reticle crosshair — center dot + tick marks */}
<circle cx="50" cy="57.5" r="2.5" fill="currentColor" opacity="0.6" />
<line x1="50" y1="45" x2="50" y2="50" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
<line x1="50" y1="65" x2="50" y2="70" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
<line x1="35" y1="57.5" x2="40" y2="57.5" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
<line x1="60" y1="57.5" x2="65" y2="57.5" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
```

**Step 3: Update default color props in `OctagonAccent.jsx`**

Change `color = '#00d4ff'` to `color = '#ff7700'`.

**Step 4: Add reticle detail to `OctagonAccent.jsx` SVG**

Inside the `<svg>`, after the existing `<polygon>`, add:
```jsx
{/* Corner tick marks — targeting detail */}
<line x1="30" y1="8" x2="30" y2="18" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
<line x1="22" y1="16" x2="30" y2="8" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
<line x1="70" y1="8" x2="70" y2="18" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
<line x1="78" y1="16" x2="70" y2="8" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
<circle cx="50" cy="50" r="3" fill="currentColor" opacity="0.5" />
```

**Step 5: Update CSS animation colors**

In both `HexAccent.css` and `OctagonAccent.css`, the `--hex-color` / `--octagon-color` default fallbacks reference `#00d4ff` — update to `#ff7700`.

**Step 6: Verify**

Check any page that renders these accents. They should glow amber with subtle crosshair/tick details.

**Step 7: Commit**

```bash
git add src/components/UI/HexAccent.jsx src/components/UI/HexAccent.css src/components/UI/OctagonAccent.jsx src/components/UI/OctagonAccent.css
git commit -m "feat: update accent components to amber with reticle details"
```

---

## Task 6: Restyle `About` Overlay

**Files:**
- Modify: `src/components/Pages/About.css`
- Modify: `src/components/Pages/About.jsx`

**Step 1: Scale up display header in `About.css`**

Find `.about-header` title styles and increase scale. Add/update:

```css
.about-name {
  font-family: 'Rajdhani', sans-serif;
  font-size: clamp(2.8rem, 6vw, 4.5rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  line-height: 1;
  color: #ffffff;
  margin-bottom: 0.4rem;
}

.about-tagline {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: rgba(255, 119, 0, 0.7);
}
```

**Step 2: Update photo frame border in `About.css`**

Replace the `--planet-color-rgb` border with a hard amber border:

```css
.about-photo-frame {
  border: 1px solid rgba(255, 119, 0, 0.45);
  border-radius: 4px;
  box-shadow:
    0 0 18px rgba(255, 119, 0, 0.15),
    0 0 50px rgba(255, 119, 0, 0.05);
}
```

**Step 3: Add status code prefix styling in `About.css`**

```css
.section-title {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 1.5rem;
}

.section-status-code {
  font-family: 'Exo 2', monospace;
  font-size: 0.65rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: rgba(255, 119, 0, 0.5);
}

.section-title-text {
  font-family: 'Rajdhani', sans-serif;
  font-size: clamp(1.2rem, 2.5vw, 1.6rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #ffffff;
}
```

**Step 4: Add circled section numbers styling in `About.css`**

```css
.title-accent {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid rgba(255, 119, 0, 0.5);
  border-radius: 50%;
  font-family: 'Exo 2', monospace;
  font-size: 0.65rem;
  font-weight: 600;
  color: rgba(255, 119, 0, 0.7);
  letter-spacing: 0;
  flex-shrink: 0;
  margin-right: 0.75rem;
}
```

**Step 5: Add status code spans to section headers in `About.jsx`**

In the `AnimatedSection` component, add a status code element above the title text. Find the `<h3 className="section-title">` block and add:

```jsx
<motion.span className="section-status-code" variants={titleVariants}>
  ST-{String(number).padStart(2, '0')} //
</motion.span>
```

So the full section title block becomes:
```jsx
<h3 className="section-title">
  <motion.span className="title-accent" variants={numberVariants}>{number}</motion.span>
  <div>
    <motion.span className="section-status-code" variants={titleVariants}>
      ST-{String(number).padStart(2, '0')} //
    </motion.span>
    <motion.span className="section-title-text" variants={titleVariants}>{title}</motion.span>
  </div>
  <motion.span className="section-title-underline" variants={underlineVariants} />
</h3>
```

**Step 6: Update skill chips / tag styling in `About.css`**

Find `.skill-chip` or similar tag elements. Update border/background to amber:

```css
.skill-chip {
  background: rgba(255, 119, 0, 0.08);
  border: 1px solid rgba(255, 119, 0, 0.3);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

**Step 7: Verify**

Open the About overlay. Should show large Rajdhani header, amber circled section numbers, `ST-01 //` prefixes, and amber photo frame.

**Step 8: Commit**

```bash
git add src/components/Pages/About.css src/components/Pages/About.jsx
git commit -m "feat: restyle About overlay with HUD typography and section markers"
```

---

## Task 7: Restyle `CaseStudy` Overlay

**Files:**
- Modify: `src/components/Pages/CaseStudy.css`

**Step 1: Update meta / label styles**

Find `.case-study-meta` and update:

```css
.case-study-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
  font-size: 0.7rem;
  color: rgba(255, 119, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.2em;
}
```

**Step 2: Update stat/metric numbers**

Find any `.stat-value`, `.metric-number`, or similar large number elements:

```css
.stat-value,
.metric-number {
  font-family: 'Rajdhani', sans-serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  color: #ff7700;
  letter-spacing: 0.05em;
  line-height: 1;
}

.stat-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(255, 255, 255, 0.45);
}
```

**Step 3: Update any card/panel borders in case study**

Replace any blue/purple border references with amber `rgba(255, 119, 0, 0.3)`. Reduce border-radius to `4px` on all panel-type elements.

**Step 4: Add status code prefix to section headings**

Find `<h2>` or `<h3>` section heading elements in `CaseStudy.jsx`. Add `<span className="section-status-code">ST-01 // </span>` before section title text. Use the same `.section-status-code` CSS class from About (already defined — or add to `CaseStudy.css`):

```css
.section-status-code {
  display: block;
  font-family: 'Exo 2', monospace;
  font-size: 0.65rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: rgba(255, 119, 0, 0.5);
  margin-bottom: 0.2rem;
}
```

**Step 5: Verify**

Open a case study. Stats should be large amber numerals, section headers have `ST-0N //` prefixes, no blue/purple anywhere.

**Step 6: Commit**

```bash
git add src/components/Pages/CaseStudy.css src/components/Pages/CaseStudy.jsx
git commit -m "feat: restyle CaseStudy with amber data numerals and HUD labels"
```

---

## Task 8: Restyle `Experiments` / `VoidOverlay`

**Files:**
- Modify: `src/components/Pages/Experiments.css`
- Modify: `src/components/UI/VoidOverlay.css`

**Step 1: Update `Experiments.css`**

Replace any `backdrop-filter` blur, purple/blue accent colors, and soft border-radius values with:
- Hard panel backgrounds: `#050505` / `#0a0a0a`
- Amber borders: `rgba(255, 119, 0, 0.3)`
- Border-radius: `4px`
- Remove any `blur()` filter effects on containers

**Step 2: Update `VoidOverlay.css`**

Same treatment — find all color references and replace:
- `rgba(0, 212, 255`, `rgba(168, 85, 247`, `#00d4ff`, `#a855f7` → amber equivalents
- Panel backgrounds to true dark
- Border-radius to `4px`

**Step 3: Verify**

Open the Experiments / Void overlay. Should feel consistent with the rest — amber accents, hard black panels.

**Step 4: Commit**

```bash
git add src/components/Pages/Experiments.css src/components/UI/VoidOverlay.css
git commit -m "feat: restyle Experiments and VoidOverlay with HUD treatment"
```

---

## Task 9: Restyle `PlanetCreator`

**Files:**
- Modify: `src/components/UI/PlanetCreator.css`

**Step 1: Update panel backgrounds and borders**

Replace any glassmorphism / `backdrop-filter` blocks with hard panel treatment:
- Background: `#0a0a0a`
- Border: `1px solid rgba(255, 119, 0, 0.3)`
- Border-radius: `4px`

**Step 2: Update control accent colors**

Find slider, input, button elements — replace blue/purple with amber:
- Active/focus borders: `rgba(255, 119, 0, 0.6)`
- Accent fills: `rgba(255, 119, 0, 0.1)`

**Step 3: Verify**

Open the PlanetCreator. Controls should read as amber HUD elements on a dark hard panel.

**Step 4: Commit**

```bash
git add src/components/UI/PlanetCreator.css
git commit -m "feat: restyle PlanetCreator with amber HUD treatment"
```

---

## Task 10: Global Cleanup Pass

**Files:**
- Grep entire `src/` for any remaining `#00d4ff`, `#a855f7`, `#22d3ee`, `#ec4899`, `#1a0d28`, `#2a1840`
- Modify any files found

**Step 1: Find remaining old color values**

```bash
grep -rn "#00d4ff\|#a855f7\|#22d3ee\|#ec4899\|#1a0d28\|#2a1840\|rgba(0, 212\|rgba(168, 85\|rgba(34, 211" src/ --include="*.css" --include="*.jsx"
```

**Step 2: Fix any remaining instances**

For each hit, replace with the appropriate amber equivalent:
- Blue highlights → `#ff7700` or `rgba(255, 119, 0, ...)`
- Purple accents → `#cc2200` or `rgba(204, 34, 0, ...)`
- Cyan → `#ffaa33`
- Pink → `#ff3300`

**Step 3: Check `App.css`**

`App.css` uses `var(--space-dark)` — should be fine. Verify it has no hardcoded old colors.

**Step 4: Final visual review**

Visit every overlay (About, each CaseStudy, Experiments, PlanetCreator) and the main galaxy view. Confirm no blue/purple remnants.

**Step 5: Commit**

```bash
git add -p  # stage only changed CSS/JSX files
git commit -m "fix: remove remaining old palette references in cleanup pass"
```

---

## Done

All tasks complete. The 2D UI layer is fully reskinned to the amber/black HUD aesthetic. The 3D galaxy scene is untouched.
