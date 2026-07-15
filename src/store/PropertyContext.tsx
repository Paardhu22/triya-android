/**
 * Active-property state — the mobile counterpart of the web's property store
 * + select-property flow. Every data screen is scoped to the selected
 * property; ADMIN accounts can switch between all properties, managers are
 * pinned to their own.
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

import { getProperty, listPropertiesFor, subscribeToDb } from '@/mocks';
import type { Property } from '@/types';
import { useAuth } from './AuthContext';

interface PropertyContextValue {
  /** The property all data screens are scoped to (null until selected). */
  property: Property | null;
  /** Every property the signed-in user can manage. */
  properties: Property[];
  selectProperty: (property: Property) => void;
  clearProperty: () => void;
}

const PropertyContext = createContext<PropertyContextValue | null>(null);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [version, setVersion] = useState(0);

  // Refresh property snapshots when mock data mutates (e.g. Settings rename).
  useEffect(() => subscribeToDb(() => setVersion((v) => v + 1)), []);

  const properties = useMemo(
    () => (user ? listPropertiesFor(user) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, version],
  );

  // Session changes invalidate the selection; a lone property auto-selects
  // (mirrors the web's AutoSelectProperty behaviour for scoped managers).
  useEffect(() => {
    if (!user) {
      setProperty(null);
      return;
    }
    setProperty(properties.length === 1 ? properties[0] : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Keep the selected property object fresh after mutations.
  useEffect(() => {
    if (!property) return;
    const fresh = getProperty(property.id);
    if (fresh && JSON.stringify(fresh) !== JSON.stringify(property)) {
      setProperty(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const selectProperty = useCallback((next: Property) => setProperty(next), []);
  const clearProperty = useCallback(() => setProperty(null), []);

  const value = useMemo(
    () => ({ property, properties, selectProperty, clearProperty }),
    [property, properties, selectProperty, clearProperty],
  );

  return <PropertyContext.Provider value={value}>{children}</PropertyContext.Provider>;
}

export function useProperty(): PropertyContextValue {
  const context = useContext(PropertyContext);
  if (!context) throw new Error('useProperty must be used within PropertyProvider');
  return context;
}

/**
 * The selected property, asserted present. Use inside the (main) group only,
 * where the layout guard guarantees a selection exists.
 */
export function useActiveProperty(): Property {
  const { property } = useProperty();
  if (!property) throw new Error('No active property — screen rendered outside the guard');
  return property;
}
