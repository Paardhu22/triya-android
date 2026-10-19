import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { accessibleProperties, clearSnapshot, subscribeToDb } from '@/data/db';
import { activePropertyId, setActiveProperty } from '@/data/client';
import type { Property } from '@/types';
import { useAuth } from './AuthContext';

interface PropertyContextValue {
  property: Property | null;
  properties: Property[];
  selectProperty: (property: Property) => void;
  clearProperty: () => void;
}
const PropertyContext = createContext<PropertyContextValue | null>(null);
export function PropertyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selection, setSelection] = useState<{ userId: string; propertyId: string } | null>(null);
  const [, setVersion] = useState(0);
  useEffect(() => subscribeToDb(() => setVersion(v => v + 1)), []);
  const properties = accessibleProperties();
  const selectedId = selection?.userId === user?.id ? selection?.propertyId : null;
  const property = properties.find(p => p.id === selectedId) ?? (properties.length === 1 ? properties[0] : null);
  // Update the request scope before children start fetching in their effects.
  useLayoutEffect(() => {
    const id = property?.id ?? null;
    if (activePropertyId() !== id) { setActiveProperty(id); clearSnapshot(); }
  }, [property?.id, user?.id]);
  const selectProperty = useCallback((next: Property) => {
    if (!user || !accessibleProperties().some(p => p.id === next.id)) return;
    if (activePropertyId() === next.id) return;
    setActiveProperty(next.id); clearSnapshot();
    setSelection({ userId: user.id, propertyId: next.id });
  }, [user]);
  const clearProperty = useCallback(() => { setActiveProperty(null); clearSnapshot(); setSelection(null); }, []);
  const value = useMemo(() => ({ property, properties, selectProperty, clearProperty }), [property, properties, selectProperty, clearProperty]);
  return <PropertyContext.Provider value={value}>{children}</PropertyContext.Provider>;
}
export function useProperty() {
  const context = useContext(PropertyContext);
  if (!context) throw new Error('useProperty must be used within PropertyProvider');
  return context;
}
export function useActiveProperty(): Property {
  const { property } = useProperty();
  if (!property) throw new Error('No active property');
  return property;
}
