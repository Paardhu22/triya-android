/**
 * Theme preference context — the dark-mode seam.
 *
 * The palette is light-only today; this context establishes the API screens
 * use so dark mode is a palette + resolution change, not a refactor:
 *
 * 1. Add a dark palette alongside `colors` in colors.ts.
 * 2. Resolve `resolvedScheme` from the preference + Appearance.getColorScheme().
 * 3. Swap direct `colors` imports for `useTheme().colors` (mechanical).
 *
 * The preference is persisted through the offlineCache service.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { CacheKeys, offlineCache } from '@/services';
import { colors } from './colors';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  /** What the user chose in App Settings. */
  preference: ThemePreference;
  /** The scheme actually rendered. Light-only until the dark palette ships. */
  resolvedScheme: 'light';
  /** The active palette (always the light tokens today). */
  colors: typeof colors;
  /** True once a dark palette exists; drives the settings toggle copy. */
  isDarkModeSupported: boolean;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    offlineCache.get<ThemePreference>(CacheKeys.themePreference).then((stored) => {
      if (stored) setPreferenceState(stored);
    });
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void offlineCache.set(CacheKeys.themePreference, next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedScheme: 'light',
      colors,
      isDarkModeSupported: false,
      setPreference,
    }),
    [preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
