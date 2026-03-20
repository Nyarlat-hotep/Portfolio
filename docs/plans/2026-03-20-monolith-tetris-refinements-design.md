# Alien Monolith & Tetris Refinements — Design Doc

**Date:** 2026-03-20
**Scope:** 5 changes to the alien monolith easter egg and Tetris overlay

---

## Change 1: Pyramid Geometry (Monolith.jsx)

Replace the current slim box slab with a full 4-sided pyramid — the same `ConeGeometry(radius, height, 4)` approach used by `Asteroid.jsx` but larger and pointing upward. Proposed dimensions: `ConeGeometry(2.5, 7, 4)`. The pyramid sits at `[2, 28, -3]` with apex pointing up. Rim glow updated to match (slightly larger BackSide cone). Hit zone updated to `ConeGeometry(3.5, 9, 4)` for comfortable click targeting.

---

## Change 2: Custom Geometric Symbol Texture (Monolith.jsx)

Replace Elder Futhark Unicode (`ᚠ ᛒ ᚢ...`) with 8 fully canvas-drawn geometric symbols. Each symbol is drawn programmatically using `ctx.arc`, `ctx.lineTo`, `ctx.moveTo` — no Unicode characters. The 8 symbols:

1. **Dotted circle** — outer ring + center dot (⊙ analog)
2. **Bisected triangle** — equilateral triangle with horizontal line through the middle
3. **Crossed square** — square with both diagonals drawn
4. **Concentric rings** — two nested circles with a gap
5. **Inverted triangle** — downward-pointing triangle, no internal marks
6. **Diamond dot** — rotated square (diamond) with center dot
7. **Mirrored arcs** — two opposing arc curves facing each other
8. **Radial spoke** — circle with 6 evenly-spaced radial lines

All rendered in `rgba(0, 255, 106, alpha)` (same green palette as rest of scene) at varying opacities (0.2–0.5) scattered across the texture canvas. The `createSymbolTexture` function replaces `createRuneTexture`, drawing each symbol ~12 times across a 256×256 canvas with seeded-random placement and scale variation.

---

## Change 3: Hover Spin Acceleration (Monolith.jsx)

Add a `spinSpeedRef` that lerps between idle and hover target:
- **Idle speed:** `0.09 rad/s`
- **Hover target:** `0.9 rad/s`
- **Lerp rate:** `delta * 4` (reaches hover speed in ~0.5s, winds down at same rate)

In `useFrame`: `spinSpeedRef.current += (targetSpeed - spinSpeedRef.current) * Math.min(delta * 4, 1)` then `g.rotation.y += spinSpeedRef.current * delta`.

---

## Change 4: Bigger, Bolder, Sparser UI (AlienTetris.jsx + AlienTetris.css)

### Layout changes
- **Cell size:** 28px → 36px (board becomes 360×720px)
- **Container:** wider to accommodate larger board
- **Sidebar:** stripped to 2 elements only — NEXT piece preview + SIGNAL block
- **SIGNAL block:** big score number (28px) + progress bar + small secondary line showing `L:2  |  12 LINES`

### Typography changes
- **Header "◈ SIGNAL INTERCEPT ◈":** 11px → 18px bold, centered
- **"ESC TO ABORT" button:** 10px → 12px, right-aligned
- **Score value:** 13px → 28px
- **Sidebar labels:** 9px → 13px, more letter-spacing
- **Controls hint:** 9px → 11px
- **"SIGNAL LOST" / "SIGNAL ACQUIRED":** 15px/22px → 26px/32px

### Structural changes
- Remove separate LINES and LEVEL sidebar sections
- Combine into one small secondary line: `L:{level} | {lines} LINES` below the signal bar
- Increase all padding: container padding 20px → 28px, sidebar gap 16px → 24px

---

## Change 5: Wireframe Block Rendering (AlienTetris.css)

### Filled cells (`.tetris-cell.filled`)
- Remove `background: color` (set to `transparent`)
- Set `border: 2px solid <piece-color>` (passed via inline style)
- Add `box-shadow: 0 0 6px <piece-color>, inset 0 0 6px rgba(<piece-color>, 0.15)` for glow presence
- Remove all `.cell-glyph` rendering in JSX (no symbols)

### Ghost cells (`.tetris-cell.ghost`)
- `border: 1px dashed <piece-color>` at 30% opacity
- No background, no glow

### Board background
- Slightly increased empty cell border opacity so the grid reads better against the bigger cells

### JSX change in AlienTetris.jsx
- Remove the `<span className="cell-glyph">` render inside cells
- Pass `--cell-color` CSS custom property per cell for the border/shadow

---

## Files Modified

1. `src/components/Galaxy/Monolith.jsx` — pyramid geometry, geometric symbol texture, spin lerp
2. `src/components/UI/AlienTetris.jsx` — remove glyph spans, larger layout structure, secondary stats line
3. `src/components/UI/AlienTetris.css` — wireframe cells, larger typography, sparser layout

---

## Verification

1. `npm run dev` — monolith in scene is a pyramid, visibly larger than before
2. Hover monolith — spin accelerates smoothly, winds back down on mouse-out
3. Canvas texture shows geometric symbols (not runic Unicode)
4. Click monolith — overlay opens with larger board (36px cells), big score number
5. Sidebar shows only NEXT piece + SIGNAL block with `L:1 | 0 LINES` secondary line
6. Play — blocks are wireframe outlines, no fills, no glyphs inside cells
7. Ghost piece is a dashed outline
8. Win/lose overlays use larger text
