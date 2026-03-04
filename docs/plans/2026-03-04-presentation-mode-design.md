# Presentation Mode Design

## Goal
A hidden, keyboard/click-triggered slideshow for live portfolio reviews. Activated via Shift+P or clicking the pyramid asteroid. Unlocked by typing "r'lyeh" into a codex input. Plays a lightspeed warp animation before revealing a full-screen slide deck covering 3 case studies.

## Architecture

### New Files
- `src/components/UI/PresentationMode.jsx` — full-screen slideshow overlay
- `src/components/UI/PresentationMode.css` — slide layouts, transitions, typography
- `src/components/UI/LightspeedTransition.jsx` — canvas warp animation (portal, z-index 9999)
- `src/data/presentationSlides.js` — curated nugget content for all 12 slides

### Modified Files
- `src/components/Galaxy/Galaxy.jsx`
  - Add `presentationOpen` state
  - Add Shift+P `keydown` listener (window-level)
  - Modify asteroid modal: replace `<pre className="asteroid-message-body">` with codex input
  - On valid codex entry: close modal → trigger warp → open presentation

## Entry Flow

```
Shift+P  OR  asteroid click
        ↓
Asteroid modal ("SIGNAL INTERCEPTED" header unchanged)
Body → input with label "Enter the cosmic codex"
        ↓
User types "r'lyeh" (case-insensitive) → Enter
        ↓
Modal closes
LightspeedTransition canvas plays (~1.5s)
        ↓
PresentationMode fades in on slide 1
```

Wrong input: no-op (input shakes briefly with a glitch CSS animation).

## Slide Structure

**12 slides total: 4 per case study**
**Study order: Banana Phone → AI Texting → MyRocket**

### Slide Types

#### 1. Title Slide
- Large study name (monospace, all-caps, accent color)
- Subtitle, company, role, duration
- No image
- Accent color theming per study

#### 2. Problem Slide
- Label: "THE PROBLEM"
- 2–3 punchy sentences pulled from challenge copy
- No image (text-focused, high contrast)

#### 3. Solution Slide (split layout)
- Label: "THE SOLUTION"
- Left: key image
- Right: 2–3 sentence nugget (the core design insight)

#### 4. Impact Slide
- Label: "THE IMPACT"
- 3 metric cards (value + label) pulled from metrics array
- 1–2 sentence launch summary below

### Content per Study

**Banana Phone** (accent: `#f5c842`)
- Title: "BANANA PHONE" / Enterprise Communication Platform / Rocket Mortgage · Lead Product Designer / 3–4 months to launch
- Problem: "The design had been fragmented across multiple PMs who each owned a separate channel. I inherited this with a fixed deadline, sole-designer scope, and no room to start over."
- Solution: "Enterprise ≠ consumer. I brought the lead queue to a persistent surface and surfaced critical client context — address, timezone, loan stage — directly into the communication view." / Image: `/images/case-studies/BananaPhone/current BP.png`
- Impact: 650K+ Calls · 15M+ Texts · 85% Easy to Use

**AI Texting** (accent: `#ec4899`)
- Title: "AI TEXTING" / Enterprise AI · Banana Phone / Rocket Mortgage · Lead Product Designer / April–June 2025
- Problem: "A phone number migration made mass texts look like spam overnight. Bankers were left writing every client message by hand — one at a time, at scale. That's not a slowdown. It's a breakdown."
- Solution: "A drafting panel inside Banana Phone. Select a category, AI drafts the right message instantly. Send as-is or edit." / Image: `/images/case-studies/AItexting/AI text 1.png`
- Impact: 1.8M AI Texts (first 10 weeks) · 56% of all outbound texts · $75M monthly closing volume

**MyRocket Dashboard** (accent: `#22d3ee`)
- Title: "MYROCKET DASHBOARD" / Consumer Product Design / Rocket Mortgage · Design Lead / 6 months
- Problem: "Users were making major financial decisions without a coherent picture of their finances. Two business units were competing for the same page."
- Solution: "An IA that flexes across radically different user states. A locked state pattern — borrowed from gaming — showed unactivated features as aspirational, not absent." / Image: `/images/case-studies/myrocket/lockedstate.png`
- Impact: 2× Monthly Visit Rate · 500K+ MAUs · 61% CSAT

## Navigation

- **Keyboard**: `←` / `→` arrow keys, `Escape` to close
- **Buttons**: `[ ← ]` and `[ → ]` at bottom corners; first slide hides back, last slide hides forward
- **Progress**: Top-left — 3 study dots (filled = current study, accent-colored) + 4 slide dots below
- **Transitions**: Framer Motion `AnimatePresence` — forward: new slide enters from right, old exits left. Back: reversed. ~350ms with opacity + x-translate.

## Close Button
Reuse `.close-button` class and `<X size={24} />` icon from `PageOverlay.jsx`. Position: top-right corner of the overlay.

## Lightspeed Warp Animation

Canvas portal renders over everything (`z-index: 9999`, `position: fixed`, black background).

**Phase 1 (0–0.6s):** ~200 lines radiate from viewport center outward. Each line: starts at center, extends rapidly toward screen edge. Color: white to cyan, additive glow via `shadowBlur`.

**Phase 2 (0.6–1.1s):** Lines accelerate. Screen brightness blooms via a white radial overlay increasing opacity.

**Phase 3 (1.1–1.5s):** Full white flash → canvas fades to black → unmounts. `PresentationMode` fades in simultaneously.

Implementation: pure `requestAnimationFrame` canvas loop. No Three.js. Runs in `createPortal(document.body)`.

## Styling Notes
- Background: `rgba(4, 2, 10, 0.98)` — near-black with slight purple tint matching site palette
- Each study's accent color is applied to borders, labels, metric values, progress dots
- Font: monospace for labels/titles, system font for body nuggets
- Slide content max-width: 900px centered
- Full viewport height, no scroll — all content fits within one screen
