/**
 * Offline cache abstraction.
 *
 * Today: an in-memory Map, so the interface is real but nothing persists.
 * Implementation plan: react-native-mmkv (or AsyncStorage) behind this same
 * interface, then persist the session, selected property, and last-known
 * query snapshots for offline reads.
 */

export interface OfflineCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

/** Well-known cache keys, centralised to avoid stringly-typed drift. */
export const CacheKeys = {
  session: 'session',
  activePropertyId: 'active-property-id',
  themePreference: 'theme-preference',
} as const;

const memory = new Map<string, unknown>();

export const offlineCache: OfflineCache = {
  async get<T>(key: string) {
    return (memory.get(key) as T | undefined) ?? null;
  },
  async set(key, value) {
    memory.set(key, value);
  },
  async remove(key) {
    memory.delete(key);
  },
  async clear() {
    memory.clear();
  },
};
