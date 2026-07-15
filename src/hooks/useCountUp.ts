import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number toward `target` with an ease-out ramp — the dashboard
 * counter effect. Counts from 0 on mount and from the previous value on
 * updates (e.g. after pull-to-refresh), settling exactly on the target.
 */
export function useCountUp(target: number, durationMs = 450): number {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = displayRef.current;
    if (from === target) return;

    const startedAt = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (target - from) * eased);
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return display;
}
