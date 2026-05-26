import { useState, useCallback, useEffect, useRef } from 'react';

// Drives a scripted step sequence for a prototype demo.
// steps: [{ id, narration, state, autoAdvanceMs? }, ...]
export function useScriptedFlow(steps) {
  const [index, setIndex] = useState(0);
  const total = steps.length;
  const step = steps[index];

  const indexRef = useRef(index);
  useEffect(() => { indexRef.current = index; }, [index]);

  const next = useCallback(() => {
    if (indexRef.current < total - 1) {
      setIndex(i => i + 1);
      return true;
    }
    return false;
  }, [total]);

  const prev = useCallback(() => {
    if (indexRef.current > 0) {
      setIndex(i => i - 1);
      return true;
    }
    return false;
  }, []);

  const restart = useCallback(() => setIndex(0), []);
  const goTo = useCallback((i) => {
    if (i >= 0 && i < total) setIndex(i);
  }, [total]);

  useEffect(() => {
    if (step?.autoAdvanceMs && index < total - 1) {
      const t = setTimeout(() => setIndex(i => i + 1), step.autoAdvanceMs);
      return () => clearTimeout(t);
    }
  }, [index, step, total]);

  return {
    step,
    index,
    total,
    next,
    prev,
    restart,
    goTo,
    isFirst: index === 0,
    isLast: index === total - 1,
  };
}
