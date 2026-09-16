/**
 * Render quality tier.
 *
 * A module singleton with subscribers rather than React state, so the decision
 * is made once per page load no matter how many components read it, and so
 * reading it never couples a component to a re-render.
 *
 * The tier is resolved synchronously at module load from device hints, which
 * means the common case compiles the right shader the first time. A runtime
 * probe (see PerfProbe.jsx) can then step it DOWN if the guess was optimistic.
 * It never steps up: each change costs a shader recompile, and oscillating
 * between tiers is far more visible than simply running one tier too low.
 */
import { useSyncExternalStore } from 'react';
import { isTouchDevice, isMobileScreen } from './isTouchDevice';
import { TIER } from '../components/Galaxy/blackHoleConstants';

export { TIER };

const TIER_NAMES = { [TIER.LOW]: 'low', [TIER.MED]: 'med', [TIER.HIGH]: 'high' };

/** Explicit override via ?q=low|med|high — always wins, and disables the probe. */
function readOverride() {
  if (typeof window === 'undefined') return null;
  try {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q === 'low')  return TIER.LOW;
    if (q === 'med')  return TIER.MED;
    if (q === 'high') return TIER.HIGH;
  } catch { /* malformed URL — fall through to auto-detect */ }
  return null;
}

function detectInitialTier() {
  if (typeof window === 'undefined') return TIER.HIGH;

  // Respect the accessibility preference before any performance consideration.
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return TIER.LOW;
  } catch { /* matchMedia unavailable */ }

  const cores = navigator.hardwareConcurrency ?? 8;
  const mem   = navigator.deviceMemory ?? 8;       // Chromium-only; assume roomy elsewhere
  if (cores < 4 || mem < 4) return TIER.LOW;

  if (isTouchDevice()) {
    // A high-DPI phone multiplies an already fragment-bound cost.
    if ((window.devicePixelRatio ?? 1) > 2) return TIER.LOW;
    if (isMobileScreen()) return TIER.MED;
  }

  return TIER.HIGH;
}

const _override = readOverride();
let _tier       = _override ?? detectInitialTier();
let _locked     = _override !== null;   // an explicit ?q= disables probe step-downs
let _stepDowns  = 0;

const MAX_STEP_DOWNS = 2;
const _subscribers   = new Set();

export function getQualityTier() {
  return _tier;
}

export function getQualityTierName() {
  return TIER_NAMES[_tier];
}

export function isQualityTierLocked() {
  return _locked;
}

/** Subscribe to tier changes. Returns an unsubscribe function. */
export function subscribeQualityTier(fn) {
  _subscribers.add(fn);
  return () => _subscribers.delete(fn);
}

function setTier(next) {
  if (next === _tier) return;
  _tier = next;
  _subscribers.forEach(fn => {
    try { fn(_tier); } catch (err) { console.error('[qualityTier] subscriber threw', err); }
  });
}

/**
 * Report a measured median frame time (ms). Steps down one tier if the frame
 * budget is being missed, up to MAX_STEP_DOWNS times total.
 * Returns true if the tier changed.
 */
export function reportProbeResult(medianFrameMs) {
  if (_locked || _stepDowns >= MAX_STEP_DOWNS || _tier === TIER.LOW) return false;
  if (medianFrameMs <= 22) return false;   // ~45fps; comfortably above a 60fps miss

  _stepDowns += 1;
  setTier(_tier - 1);
  return true;
}

/** Test seam — resets module state. Not used by the app. */
export function _resetQualityTierForTest(tier = TIER.HIGH, locked = false) {
  _tier = tier; _locked = locked; _stepDowns = 0; _subscribers.clear();
}

/**
 * React binding. useSyncExternalStore is the right primitive here: the tier
 * lives outside React, changes rarely, and must not tear across a render.
 */
export function useQualityTier() {
  return useSyncExternalStore(subscribeQualityTier, getQualityTier, () => TIER.HIGH);
}
