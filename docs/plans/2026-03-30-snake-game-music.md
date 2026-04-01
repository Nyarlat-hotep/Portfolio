# Snake Game Music Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Play `game-music.mp3` when the snake game opens and stop it when the game closes.

**Architecture:** Add a dedicated looping Audio instance for game music in `sounds.js` (matching the cosmicVoid/blackHole pattern), then wire it into the existing music `useEffect` in `AlienSnake.jsx`.

**Tech Stack:** Vanilla Web Audio (`Audio` element), React `useEffect`

---

### Task 1: Add game music to sounds.js

**Files:**
- Modify: `src/utils/sounds.js`

**Step 1: Add `gameMusic` to SRCS**

In `src/utils/sounds.js`, add to the `SRCS` object:

```js
const SRCS = {
  background:     '/sounds/background.mp3',
  blackHole:      '/sounds/black-hole.mp3',
  caseStudyOpen:  '/sounds/case-study-open.mp3',
  caseStudyClose: '/sounds/case-study-close.mp3',
  menuClick:        '/sounds/menu-click.mp3',
  cosmicVoid:       '/sounds/cosmic-void.mp3',
  planetExplosion:  '/sounds/planet-explosion.mp3',
  planetCreation:   '/sounds/planet-creation.mp3',
  warp:             '/sounds/warp.mp3',
  gameMusic:        '/sounds/game-music.mp3',
}
```

**Step 2: Add playGameMusic / stopGameMusic exports**

After the `stopBlackHole` block, add:

```js
// ── Game music — dedicated looping instance ───────────────────────────────────
export function playGameMusic() {
  if (_muted) return
  const audio = getPool(SRCS.gameMusic).instances[0]
  audio.volume = 0.5
  audio.loop = true
  try { audio.currentTime = 0 } catch (_) {}
  audio.play().catch(() => {})
}

export function stopGameMusic() {
  const audio = getPool(SRCS.gameMusic).instances[0]
  audio.pause()
  try { audio.currentTime = 0 } catch (_) {}
}
```

**Step 3: Commit**

```bash
git add src/utils/sounds.js
git commit -m "feat: add playGameMusic / stopGameMusic to sounds.js"
```

---

### Task 2: Wire game music into AlienSnake.jsx

**Files:**
- Modify: `src/components/UI/AlienSnake.jsx`

**Step 1: Import the new functions**

Update the existing import at line 4:

```js
import { stopBackground, playBackground, playGameMusic, stopGameMusic } from '../../utils/sounds';
```

**Step 2: Update the music useEffect**

Find the existing music `useEffect` (around line 763):

```js
useEffect(() => {
  stopBackground();
  return () => { playBackground(); };
}, []);
```

Replace with:

```js
useEffect(() => {
  stopBackground();
  playGameMusic();
  return () => {
    stopGameMusic();
    playBackground();
  };
}, []);
```

**Step 3: Verify manually**

- Open the portfolio and start the snake game — game music should begin
- Pause the game — music continues
- Lose the game — music continues
- Close/exit the game — music stops, galaxy background resumes

**Step 4: Commit**

```bash
git add src/components/UI/AlienSnake.jsx
git commit -m "feat: play game-music.mp3 during snake game"
```
