import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  reportProbeResult,
  isQualityTierLocked,
  getQualityTierName,
} from '../../utils/qualityTier';

// Skip the opening camera animation and any first-frame shader compiles before
// trusting a frame time. Measuring during those reads as a slow device.
const WARMUP_S  = 1.5;
const WINDOW_S  = 1.5;   // length of one measurement window
const MAX_RUNS  = 2;     // one step-down per window, two windows total

/**
 * Measures median frame time in a couple of short windows after mount and steps
 * the quality tier down if the device is missing the frame budget.
 *
 * Median rather than mean: a single GC pause or a texture upload would drag a
 * mean far enough to trigger a spurious downgrade.
 *
 * Renders nothing, holds no state — a tier change propagates through the
 * qualityTier store's subscribers, not through React state here.
 */
export default function PerfProbe({ onResolved }) {
  const elapsed = useRef(0);
  const samples = useRef([]);
  const runs    = useRef(0);
  const done    = useRef(false);



  useFrame((_state, delta) => {
    if (done.current) return;

    // An explicit ?q= override means the user is testing a specific tier —
    // never second-guess it.
    if (isQualityTierLocked()) {
      done.current = true;
      if (import.meta.env.DEV) console.info(`[PerfProbe] tier locked by ?q= at "${getQualityTierName()}" — probe disabled`);
      onResolved?.(getQualityTierName(), null);
      return;
    }

    elapsed.current += delta;
    if (elapsed.current < WARMUP_S) return;

    samples.current.push(delta * 1000);

    if (elapsed.current < WARMUP_S + WINDOW_S * (runs.current + 1)) return;

    // Window complete — evaluate.
    const sorted = samples.current.slice().sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    samples.current.length = 0;
    runs.current += 1;

    const changed = reportProbeResult(median);

    if (import.meta.env.DEV) {
      console.info(
        `[PerfProbe] window ${runs.current}: median ${median.toFixed(1)}ms ` +
        `(~${(1000 / Math.max(median, 0.001)).toFixed(0)}fps) → tier "${getQualityTierName()}"` +
        (changed ? ' (stepped down)' : '')
      );
    }

    if (runs.current >= MAX_RUNS || !changed) {
      done.current = true;
      onResolved?.(getQualityTierName(), median);
    }
  });

  return null;
}
