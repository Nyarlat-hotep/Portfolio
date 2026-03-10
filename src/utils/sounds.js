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

// Kick off preloading all sounds immediately (skip background — loaded via Web Audio)
Object.values(SRCS).filter(s => s !== SRCS.background).forEach(getPool)

// ── Background — Web Audio API (bypasses system media session / phone controls) ─
let _audioCtx = null
let _gainNode = null
let _bgBuffer = null
let _bgSource = null
let _bgStartedAt = 0
let _bgOffset = 0
let _bgPlaying = false

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

async function loadBgBuffer() {
  if (_bgBuffer) return
  const ctx = getBgCtx()
  const res = await fetch(SRCS.background)
  const buf = await res.arrayBuffer()
  _bgBuffer = await ctx.decodeAudioData(buf)
}

function startBgSource() {
  if (!_bgBuffer || !_audioCtx) return
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

// Pause when tab/app is hidden (phone locked, switched app, left browser)
document.addEventListener('visibilitychange', () => {
  if (!_audioCtx) return
  if (document.hidden) {
    if (_bgPlaying) {
      _bgOffset = (_audioCtx.currentTime - _bgStartedAt) % (_bgBuffer?.duration || 1)
      _bgSource?.stop?.()
      _bgPlaying = false
    }
  } else if (!_muted && _bgBuffer) {
    startBgSource()
  }
})

export function playBackground() {
  if (_muted) return
  const ctx = getBgCtx()
  // Resume suspended context (required after user gesture on mobile)
  const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve()
  resume.then(() => {
    if (_bgBuffer) {
      startBgSource()
    } else {
      loadBgBuffer().then(startBgSource)
    }
  })
}

export function stopBackground() {
  if (_bgSource) {
    _bgSource.stop?.()
    _bgSource = null
  }
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
