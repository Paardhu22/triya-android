/**
 * Busy-state wrapper for mock mutations. Mirrors the web's useTransition +
 * server-action pattern: run(action) simulates latency, executes the
 * synchronous mock action, and hands back its ActionResult.
 */

import { useCallback, useRef, useState } from 'react';

import { simulateLatency, type ActionResult } from '@/mocks';

export interface UseActionResult {
  /** True while any action started by this hook is in flight. */
  busy: boolean;
  run: <T>(action: () => ActionResult<T>) => Promise<ActionResult<T>>;
}

export function useAction(): UseActionResult {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(0);

  const run = useCallback(async <T,>(action: () => ActionResult<T>) => {
    inFlight.current += 1;
    setBusy(true);
    try {
      await simulateLatency();
      return action();
    } finally {
      inFlight.current -= 1;
      if (inFlight.current === 0) setBusy(false);
    }
  }, []);

  return { busy, run };
}
