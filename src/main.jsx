import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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
