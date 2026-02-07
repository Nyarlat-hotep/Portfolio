// Detect if the device supports touch input
export function isTouchDevice() {
  if (typeof window === 'undefined') return false;

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

// Check if device is mobile based on screen width
export function isMobileScreen() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
}
