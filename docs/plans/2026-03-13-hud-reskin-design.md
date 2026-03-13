# HUD Reskin — Design Document
**Date:** 2026-03-13
**Approach:** B — Full HUD Reskin
**Reference:** Image 1 (orange/black sci-fi globe HUD dashboard)

---

## Overview

A full restyle of the portfolio's 2D UI layer. The purple-nebula glassmorphism aesthetic is replaced entirely with a military-industrial HUD aesthetic: true black, amber/orange accents, hard bordered panels, and new data-display UI elements. The 3D galaxy scene (Galaxy.jsx and all sub-components) is untouched.

---

## 1. Color System

All CSS variables replaced in `index.css`.

| Token | Old Value | New Value | Use |
|---|---|---|---|
| `--space-dark` | `#1a0d28` | `#050505` | True black base |
| `--space-medium` | `#2a1840` | `#0f0f0f` | Panel backgrounds |
| `--electric-blue` | `#00d4ff` | `#ff7700` | Primary accent (amber) |
| `--neon-purple` | `#a855f7` | `#cc2200` | Secondary accent (deep red) |
| `--cyan` | `#22d3ee` | `#ffaa33` | Highlight / hover states |
| `--pink` | `#ec4899` | `#ff3300` | Danger / alert states |
| `--glass-white` | `rgba(255,255,255,0.1)` | `rgba(255,119,0,0.05)` | Panel fill |
| `--glass-border` | `rgba(255,255,255,0.2)` | `rgba(255,119,0,0.35)` | Panel borders |
| `--amber` | *(new)* | `#ff7700` | Alias for primary accent |

---

## 2. Typography

Fonts unchanged: Exo 2 + Rajdhani.

- **Labels / metadata:** all-caps, `letter-spacing: 0.15em`, reduced weight
- **Display headers:** Rajdhani, larger scale, all-caps, tighter line-height
- **Data numerals:** large scale, tabular figures, amber color (stats, metrics)
- **Body text:** unchanged size/line-height, color shifts to `rgba(255,255,255,0.65)`
- **Status code prefixes:** select section labels prefixed with `ST-01 //` style alphanumeric codes in dimmer amber

---

## 3. Surface & Panel Treatment

Glassmorphism removed entirely.

- **Backgrounds:** solid near-black fills (`#0a0a0a`, `#0f0f0f`) — no backdrop-filter blur
- **Borders:** 1px amber at `rgba(255,119,0,0.35)`
- **Border radius:** `4px` on all panels and cards (no fully sharp corners, no soft rounding)
- **Corner brackets:** existing `.corner-accent` elements kept, updated to amber color
- **Glow:** ambient box-shadow `0 0 20px rgba(255,119,0,0.15)` — subtle
- **Overlay backdrop:** hard `#050505` fill, no blur scrim

---

## 4. New HUD Elements

### Ticker Strip
- Location: just below the header in `PageOverlay` — inherited by all overlays
- Height: ~28px
- Behavior: infinite horizontal scroll, no interaction
- Content: ambient flavor text — `◀▶ SYSTEM NOMINAL ◀▶ OBJECT DETECTED ◀▶ COORDINATES LOCKED ◀▶ SIGNAL ACQUIRED`
- Style: amber text on slightly lighter dark band

### Status Code Labels
- Pure CSS on section header elements
- Format: `ST-01 // SECTION NAME`
- Applied in: About, CaseStudy, Experiments

### Circled Section Numbers
- Small amber-bordered circles with two-digit numbers (`01`, `02`, `03`)
- Mark major content sections
- Applied in: About, CaseStudy

### Targeting Reticle Detail
- CSS pseudo-element on `OctagonAccent` and `HexAccent`
- Partial circle or crosshair motif
- Amber colored, no new JSX

---

## 5. Per-Component Breakdown

| Component | Changes |
|---|---|
| `index.css` | Full color variable replacement |
| `PageOverlay` | Hard panel, 4px radius, amber borders, corner brackets updated, ticker strip added |
| `About` | Display header scaled up, section numbers, status code prefixes, photo frame border amber |
| `CaseStudy` | Same as About, stat numbers get large amber numeral treatment |
| `Experiments` / `VoidOverlay` | Hard panel, amber accents, ticker inherited |
| `PlanetCreator` | Panel treatment updated, controls amber accent |
| `BottomNav` / `Navigation` | Amber active states, all-caps labels, purple/blue removed |
| `HexAccent` / `OctagonAccent` | Reticle detail added, color updated to amber |

---

## Out of Scope

- Galaxy.jsx and all sub-components (3D scene)
- Starfield, Planet, Moon, Asteroid, Constellation, etc.
- Any layout or structural changes
- New fonts
