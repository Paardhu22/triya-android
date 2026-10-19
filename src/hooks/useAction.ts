import { useCallback, useRef, useState } from 'react';
import type { ActionResult } from '@/data';

export function useAction() {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(0);
  const run = useCallback(async <T,>(action: () => ActionResult<T> | Promise<ActionResult<T>>): Promise<ActionResult<T>> => {
    if (inFlight.current) return { ok: false, error: 'An action is already in progress' };
    inFlight.current++;
    setBusy(true);
    try { return await action(); }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Could not complete the action' }; }
    finally { if (--inFlight.current === 0) setBusy(false); }
  }, []);
  return { busy, run };
}

export type UseActionResult = ReturnType<typeof useAction>;
