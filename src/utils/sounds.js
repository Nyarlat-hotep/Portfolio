const SRCS = {
  background:    '/sounds/background.mp3',
  blackHole:     '/sounds/black-hole.mp3',
  caseStudyOpen: '/sounds/case-study-open.mp3',
  menuClick:     '/sounds/menu-click.mp3',
  menuHover:     '/sounds/menu-hover.mp3',
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

// Background: browsers block autoplay without a prior user gesture.
// Try immediately; if blocked, queue it for the first real interaction.
let _bgQueued = false
const _bgAudio = getPool(SRCS.background).instances[0]

window.addEventListener('pointerdown', () => {
  if (_bgQueued && !_muted) { _bgQueued = false; _bgAudio.volume = 0.2; _bgAudio.play().catch(() => {}) }
}, { once: true, capture: true })

export function playBackground() {
  _bgAudio.volume = 0.2
  _bgAudio.currentTime = 0
  if (_muted) return
  _bgAudio.play().catch(() => { _bgQueued = true })
}

export function stopBackground() {
  _bgQueued = false
  _bgAudio.pause()
  _bgAudio.currentTime = 0
}

export function getMuted()  { return _muted }
export function setMuted(v) {
  _muted = v
  if (v) {
    _bgAudio.pause()
  } else if (!_bgAudio.paused) {
    // already playing, nothing to do
  }
}

export function playBlackHole()     { play(SRCS.blackHole,     1.0) }
export function playCaseStudyOpen() { play(SRCS.caseStudyOpen, 0.9) }
export function playMenuClick()     { play(SRCS.menuClick,     0.8) }
export function playMenuHover()     { play(SRCS.menuHover,     0.5) }
