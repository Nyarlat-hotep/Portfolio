const SRCS = {
  background:     '/sounds/background.mp3',
  blackHole:      '/sounds/black-hole.mp3',
  caseStudyOpen:  '/sounds/case-study-open.mp3',
  caseStudyClose: '/sounds/case-study-close.mp3',
  menuClick:      '/sounds/menu-click.mp3',
  cosmicVoid:     '/sounds/cosmic-void.mp3',
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
const _bgAudio = getPool(SRCS.background).instances[0]
_bgAudio.loop = true

export function playBackground() {
  _bgAudio.volume = 0.2
  try { _bgAudio.currentTime = 0 } catch (_) {}
  if (_muted) return
  _bgAudio.play().catch(() => {
    // Autoplay blocked — resume on next user gesture (covers mobile Safari)
    const resume = () => {
      if (!_muted) _bgAudio.play().catch(() => {})
    }
    window.addEventListener('touchend', resume, { once: true, capture: true })
    window.addEventListener('pointerdown', resume, { once: true, capture: true })
  })
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


// ── Menu click — dedicated instance with its own volume control ───────────────
const _mcAudio = getPool(SRCS.menuClick).instances[0]

export function playMenuClick() {
  if (_muted) return
  _mcAudio.volume = 0.4  // ← adjust here
  try { _mcAudio.currentTime = 0 } catch (_) {}
  _mcAudio.play().catch(() => {})
}

export function playCaseStudyOpen()  { play(SRCS.caseStudyOpen,  0.9) }
export function playCaseStudyClose() { play(SRCS.caseStudyClose, 0.9) }
export function playMenuHover()      { playMenuClick() }
