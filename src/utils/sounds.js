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

function play(src, volume = 1) {
  const pool = getPool(src)
  const audio = pool.instances[pool.index]
  pool.index = (pool.index + 1) % POOL_SIZE
  audio.volume = volume
  audio.currentTime = 0
  audio.play().catch(() => {})
}

// Kick off preloading all sounds immediately
Object.values(SRCS).forEach(getPool)

// Background: browsers block autoplay without a prior user gesture.
// Try immediately; if blocked, queue it for the first real interaction.
let _bgQueued = false

window.addEventListener('pointerdown', () => {
  if (_bgQueued) { _bgQueued = false; play(SRCS.background, 0.4) }
}, { once: true, capture: true })

export function playBackground() {
  getPool(SRCS.background).instances[0].volume = 0.4
  getPool(SRCS.background).instances[0].currentTime = 0
  getPool(SRCS.background).instances[0].play().catch(() => { _bgQueued = true })
}

export function playBlackHole()     { play(SRCS.blackHole,     1.0) }
export function playCaseStudyOpen() { play(SRCS.caseStudyOpen, 0.9) }
export function playMenuClick()     { play(SRCS.menuClick,     0.8) }
export function playMenuHover()     { play(SRCS.menuHover,     0.5) }
