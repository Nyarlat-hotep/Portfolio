let _muted = false

function play(src, volume = 1) {
  if (_muted) return
  const audio = new Audio(src)
  audio.volume = volume
  audio.play().catch(() => {})
}

export function playBackground()    { play('/sounds/background.mp3', 0.4) }
export function playBlackHole()     { play('/sounds/black-hole.mp3', 1.0) }
export function playCaseStudyOpen() { play('/sounds/case-study-open.mp3', 0.9) }
export function playMenuClick()     { play('/sounds/menu-click.mp3', 0.8) }
export function playMenuHover()     { play('/sounds/menu-hover.mp3', 0.5) }
