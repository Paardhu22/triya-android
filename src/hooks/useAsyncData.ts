import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { loadSnapshot, subscribeToDb } from '@/data/db';

export interface AsyncData<T> {
  data: T | null; isLoading: boolean; isFetching: boolean; error: string | null;
  isRefreshing: boolean; refresh: () => Promise<void>; refetch: () => void;
}

/** Only focused screens and visible sheets subscribe, compute and refresh. */
export function useAsyncData<T>(fetcher: () => T, deps: readonly unknown[], { enabled = true } = {}): AsyncData<T> {
  // Callers declare the inputs to their selector, just as for an effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const key = useMemo(() => ({}), deps);
  const [result, setResult] = useState<{ key: object; data: T | null; error: string | null; fetching: boolean; settled: boolean }>(
    { key, data: null, error: null, fetching: false, settled: false },
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  useLayoutEffect(() => { fetcherRef.current = fetcher; });
  const sequence = useRef(0);
  const focused = useRef(false);
  const fetching = useRef(false);
  const run = useCallback(async (force = false) => {
    if (!enabled || !focused.current) return;
    const current = ++sequence.current;
    const select = fetcherRef.current;
    fetching.current = true;
    setResult(previous => ({ key, data: previous.key === key ? previous.data : null, error: null, fetching: true,
      settled: previous.key === key && previous.settled }));
    try {
      await loadSnapshot(force);
      if (focused.current && current === sequence.current) {
        setResult({ key, data: select(), error: null, fetching: false, settled: true });
      }
    } catch (error) {
      if (focused.current && current === sequence.current) {
        setResult(previous => ({ key, data: previous.key === key ? previous.data : null,
          error: error instanceof Error ? error.message : 'Failed to load data', fetching: false, settled: true }));
      }
    } finally { if (current === sequence.current) fetching.current = false; }
  }, [enabled, key]);

  useFocusEffect(useCallback(() => {
    if (!enabled) return;
    focused.current = true;
    let cancelled = false;
    // Avoid updating a screen while React is committing its navigation tree.
    void Promise.resolve().then(() => { if (!cancelled) void run(); });
    const unsubscribe = subscribeToDb(event => {
      if (event === 'invalidate') { void run(true); return; }
      if (!fetching.current) {
        try { setResult({ key, data: fetcherRef.current(), error: null, fetching: false, settled: true }); }
        catch (error) { setResult(previous => ({ ...previous, error: error instanceof Error ? error.message : 'Failed to load data' })); }
      }
    });
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void run(true);
    });
    return () => {
      cancelled = true; focused.current = false; fetching.current = false; sequence.current++;
      unsubscribe(); subscription.remove();
    };
  }, [enabled, key, run]));

  const refresh = useCallback(async () => {
    if (!enabled || !focused.current) return;
    setIsRefreshing(true);
    try { await run(true); } finally { setIsRefreshing(false); }
  }, [enabled, run]);
  const refetch = useCallback(() => { void run(true); }, [run]);
  const current = result.key === key ? result : null;
  return { data: enabled ? current?.data ?? null : null,
    isLoading: enabled && !current?.settled,
    isFetching: enabled && (current?.fetching ?? true), error: enabled ? current?.error ?? null : null,
    isRefreshing: enabled && isRefreshing, refresh, refetch };
}
