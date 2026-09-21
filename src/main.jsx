import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import './index.css'
import App from './App.jsx'
import { getQualityTier, TIER } from './utils/qualityTier'

// Anisotropic filtering, applied before anything constructs a texture.
//
// Without it, a texture viewed at a grazing angle is minified along one axis
// only, and trilinear filtering has to pick a mip that is far too blurry for
// the other — which is why the ring bands shimmer and smear where they run away
// from the camera. three clamps this to whatever the GPU actually supports, so
// a value above the hardware maximum is harmless.
//
// Set as the global default rather than per texture: it only ever engages on
// mipmapped minification, so render targets and LUTs (LinearFilter, no mips)
// are unaffected and there is nothing to opt out.
//
// Tiered, because it is not free — a grazing pixel can cost up to this many
// texture samples. The tier resolves synchronously at module load, so this is
// decided before the first texture exists.
THREE.Texture.DEFAULT_ANISOTROPY =
  getQualityTier() >= TIER.HIGH ? 8 : getQualityTier() >= TIER.MED ? 4 : 1;

// Expose the actual visible viewport dimensions as CSS custom properties.
// window.visualViewport reflects the real visible area after browser chrome
// (Chrome address bar, Android bottom nav), unlike 100vh/dvh which can
// include areas behind those bars on Android.
function updateVisualViewport() {
  const vv = window.visualViewport
  const h  = vv ? vv.height  : window.innerHeight
  const t  = vv ? vv.offsetTop : 0
  document.documentElement.style.setProperty('--vvh', `${h}px`)
  document.documentElement.style.setProperty('--vvt', `${t}px`)
}
updateVisualViewport()
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateVisualViewport)
  window.visualViewport.addEventListener('scroll', updateVisualViewport)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
