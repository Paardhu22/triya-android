/**
 * Minimal async-data hook over the (synchronous) mock query layer.
 *
 * Deliberately shaped like a React Query result — data/isLoading/error/
 * refetch + pull-to-refresh — so screens keep their exact code when the
 * mock layer is replaced by react-query over the real API.
 *
 * Every hook instance re-runs its fetcher whenever a mock action mutates the
 * database (subscribeToDb), giving the same "invalidate on mutation" feel.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { simulateLatency, subscribeToDb } from '@/mocks';

export interface AsyncData<T> {
  data: T | null;
  /** True during the first load only. */
  isLoading: boolean;
  error: string | null;
  /** Pull-to-refresh state (spinner in RefreshControl). */
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  refetch: () => void;
}

export function useAsyncData<T>(
  fetcher: () => T,
  deps: readonly unknown[],
): AsyncData<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const runSync = useCallback(() => {
    try {
      setData(fetcherRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    }
  }, []);

  // Initial (and dependency-driven) load with simulated latency, so loading
  // and skeleton states behave as they will against the network.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    simulateLatency(350).then(() => {
      if (cancelled) return;
      runSync();
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Silent refresh on any mock mutation (no loading flicker).
  useEffect(() => {
    return subscribeToDb(() => {
      runSync();
    });
  }, [runSync]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await simulateLatency(500);
    runSync();
    setIsRefreshing(false);
  }, [runSync]);

  return { data, isLoading, error, isRefreshing, refresh, refetch: runSync };
}
