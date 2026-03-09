const SRCS = {
  background:    '/sounds/background.mp3',
  blackHole:     '/sounds/black-hole.mp3',
  caseStudyOpen: '/sounds/case-study-open.mp3',
  menuClick:     '/sounds/menu-click.mp3',
  menuHover:     '/sounds/menu-hover.mp3',
  cosmicVoid:    '/sounds/cosmic-void.mp3',
  spaceBattle:   '/sounds/space-battle.mp3',
}

// Pool of pre-loaded instances per sound — no fetch delay on playback
const POOL_SIZE = 2
const _pools = {}

function getPool(src) {
  if (!_pools[src]) {
    _pools[src] = {
      instances: Array.from({ length: POOL_SIZE }, () => {
        const a = new Audio(src)
        a.preload = 'auto'
        return a
      }),
      index: 0,
    }
  }
  return _pools[src]
}

let _muted = false

function play(src, volume = 1) {
  if (_muted) return
  const pool = getPool(src)
  const audio = pool.instances[pool.index]
  pool.index = (pool.index + 1) % POOL_SIZE
  audio.volume = volume
  try { audio.currentTime = 0 } catch (_) {}
  audio.play().catch(() => {})
}

// Kick off preloading all sounds immediately
Object.values(SRCS).forEach(getPool)

// ── Background ────────────────────────────────────────────────────────────────
// Loops, and queues on first user gesture if autoplay is blocked.
let _bgQueued = false
const _bgAudio = getPool(SRCS.background).instances[0]
_bgAudio.loop = true

window.addEventListener('pointerdown', () => {
  if (_bgQueued && !_muted) { _bgQueued = false; _bgAudio.volume = 0.2; _bgAudio.play().catch(() => {}) }
}, { once: true, capture: true })

export function playBackground() {
  _bgAudio.volume = 0.2
  try { _bgAudio.currentTime = 0 } catch (_) {}
  if (_muted) return
  _bgAudio.play().catch(() => { _bgQueued = true })
}

export function stopBackground() {
  _bgQueued = false
  _bgAudio.pause()
  try { _bgAudio.currentTime = 0 } catch (_) {}
}

export function getMuted()  { return _muted }
export function setMuted(v) {
  _muted = v
  if (v) _bgAudio.pause()
}

// ── Cosmic void — dedicated instance so it can be stopped on pointer-out ──────
const _cvAudio = getPool(SRCS.cosmicVoid).instances[0]

export function playCosmicVoid() {
  if (_muted) return
  _cvAudio.volume = 0.8
  try { _cvAudio.currentTime = 0 } catch (_) {}
  _cvAudio.play().catch(() => {})
}

export function stopCosmicVoid() {
  _cvAudio.pause()
  try { _cvAudio.currentTime = 0 } catch (_) {}
}

// ── Black hole — dedicated instance so it can be stopped on well collapse ─────
const _bhAudio = getPool(SRCS.blackHole).instances[0]

export function playBlackHole() {
  if (_muted) return
  _bhAudio.volume = 0.25
  try { _bhAudio.currentTime = 0 } catch (_) {}
  _bhAudio.play().catch(() => {})
}

export function stopBlackHole() {
  _bhAudio.pause()
  try { _bhAudio.currentTime = 0 } catch (_) {}
}

// ── Space battle — dedicated instance, loops while camera is near the galaxy ──
const _sbAudio = getPool(SRCS.spaceBattle).instances[0]
_sbAudio.loop = true

export function playSpaceBattle() {
  if (_muted || !_sbAudio.paused) return
  _sbAudio.volume = 0.5
  _sbAudio.play().catch(() => {})
}

export function stopSpaceBattle() {
  _sbAudio.pause()
  try { _sbAudio.currentTime = 0 } catch (_) {}
}

export function playCaseStudyOpen() { play(SRCS.caseStudyOpen, 0.9) }
export function playMenuClick()     { play(SRCS.menuClick,     0.8) }
export function playMenuHover()     { play(SRCS.menuHover,     0.5) }
