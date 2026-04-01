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
  derelict:         '/sounds/space-battle.mp3',
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

// ── Background — Web Audio API (bypasses system media session / phone controls) ─
// Strategy:
//   1. playBackground() sets _bgWantsPlay = true; buffer is fetched on first play
//   2. On first user gesture, resume AudioContext and decode+start playback
let _audioCtx    = null
let _gainNode    = null
let _bgRawBuf    = null   // fetched ArrayBuffer
let _bgBuffer    = null   // decoded AudioBuffer
let _bgSource    = null
let _bgStartedAt = 0
let _bgOffset    = 0
let _bgPlaying   = false
let _bgWantsPlay = false

function getBgCtx() {
  if (!_audioCtx) {
    const AudioCtx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext
    _audioCtx = new AudioCtx()
    _gainNode = _audioCtx.createGain()
    _gainNode.gain.value = 0.2
    _gainNode.connect(_audioCtx.destination)
  }
  return _audioCtx
}

async function decodeBgBuffer() {
  if (_bgBuffer) return
  const ctx = getBgCtx()
  if (!_bgRawBuf) {
    const res = await fetch(SRCS.background)
    _bgRawBuf = await res.arrayBuffer()
  }
  _bgBuffer = await ctx.decodeAudioData(_bgRawBuf.slice(0))
}

function startBgSource() {
  if (!_bgBuffer || !_audioCtx || _audioCtx.state !== 'running') return
  _bgSource?.stop?.()
  _bgSource = _audioCtx.createBufferSource()
  _bgSource.buffer = _bgBuffer
  _bgSource.loop = true
  _bgSource.connect(_gainNode)
  const offset = _bgOffset % _bgBuffer.duration
  _bgSource.start(0, offset)
  _bgStartedAt = _audioCtx.currentTime - offset
  _bgPlaying = true
}

async function tryStartBg() {
  if (!_bgWantsPlay || _muted) return
  const ctx = getBgCtx()
  if (ctx.state === 'suspended') return  // wait for gesture to resume
  if (!_bgBuffer) await decodeBgBuffer()
  if (_bgWantsPlay && !_bgPlaying) startBgSource()
}

// On user gesture: resume suspended context then try to start bg music
function onUserGesture() {
  if (!_bgWantsPlay) return
  const ctx = getBgCtx()
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => tryStartBg())
  } else {
    tryStartBg()
  }
}
window.addEventListener('touchend',   onUserGesture, { capture: true, passive: true })
window.addEventListener('pointerdown', onUserGesture, { capture: true, passive: true })

// Pause when tab/app is hidden (phone locked, switched app, left browser)
document.addEventListener('visibilitychange', () => {
  if (!_audioCtx) return
  if (document.hidden) {
    if (_bgPlaying && _bgBuffer) {
      _bgOffset = (_audioCtx.currentTime - _bgStartedAt) % _bgBuffer.duration
      _bgSource?.stop?.()
      _bgPlaying = false
    }
  } else if (_bgWantsPlay && !_muted) {
    tryStartBg()
  }
})

export function playBackground() {
  if (_muted) return
  _bgWantsPlay = true
  tryStartBg()
}

export function stopBackground() {
  _bgWantsPlay = false
  _bgSource?.stop?.()
  _bgSource = null
  _bgOffset = 0
  _bgPlaying = false
}

export function getMuted()  { return _muted }
export function setMuted(v) {
  _muted = v
  if (v) {
    _bgSource?.stop?.()
    _bgPlaying = false
  }
}

// ── Cosmic void — dedicated instance so it can be stopped on pointer-out ──────
export function playCosmicVoid() {
  if (_muted) return
  const audio = getPool(SRCS.cosmicVoid).instances[0]
  audio.volume = 0.8
  try { audio.currentTime = 0 } catch (_) {}
  audio.play().catch(() => {})
}

export function stopCosmicVoid() {
  const audio = getPool(SRCS.cosmicVoid).instances[0]
  audio.pause()
  try { audio.currentTime = 0 } catch (_) {}
}

// ── Black hole — dedicated instance so it can be stopped on well collapse ─────
export function playBlackHole() {
  if (_muted) return
  const audio = getPool(SRCS.blackHole).instances[0]
  audio.volume = 0.25
  try { audio.currentTime = 0 } catch (_) {}
  audio.play().catch(() => {})
}

export function stopBlackHole() {
  const audio = getPool(SRCS.blackHole).instances[0]
  audio.pause()
  try { audio.currentTime = 0 } catch (_) {}
}

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

// ── Derelict — proximity-based ambient, volume set per-frame by Derelict.jsx ──
export function playDerelict() {
  if (_muted) return
  const audio = getPool(SRCS.derelict).instances[0]
  audio.loop = true
  if (!audio.paused) return
  try { audio.currentTime = 0 } catch (_) {}
  audio.volume = 0
  audio.play().catch(() => {})
}

export function setDerelictVolume(vol) {
  if (_muted) return
  getPool(SRCS.derelict).instances[0].volume = Math.max(0, Math.min(1, vol))
}

export function stopDerelict() {
  const audio = getPool(SRCS.derelict).instances[0]
  audio.pause()
  try { audio.currentTime = 0 } catch (_) {}
}

// ── Menu click — dedicated instance with its own volume control ───────────────
export function playMenuClick() {
  if (_muted) return
  const audio = getPool(SRCS.menuClick).instances[0]
  audio.volume = 0.4  // ← adjust here
  try { audio.currentTime = 0 } catch (_) {}
  audio.play().catch(() => {})
}

export function playCaseStudyOpen()    { play(SRCS.caseStudyOpen,    0.45) }
export function playCaseStudyClose()   { play(SRCS.caseStudyClose,   0.45) }
export function playPlanetExplosion()  { play(SRCS.planetExplosion,  1.0) }
export function playPlanetCreation()   { play(SRCS.planetCreation,   1.0) }
export function playWarp()             { play(SRCS.warp,             1.0) }
export function playMenuHover()        { playMenuClick() }
