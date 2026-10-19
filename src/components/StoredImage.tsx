import { useEffect, useState, type ReactNode } from 'react';
import { Image, type ImageProps } from 'expo-image';
import { storedFileUrl } from '@/data/client';
import { useAuth, useProperty } from '@/store';

/** Resolve private local/Supabase storage keys through the authenticated backend. */
export function StoredImage({ storageKey, logoPropertyId, fallback, ...props }: Omit<ImageProps, 'source'> & {
  storageKey?: string | null; logoPropertyId?: string; fallback?: ReactNode;
}) {
  const { user } = useAuth();
  const { property } = useProperty();
  const scopeKey = `${user?.id}:${logoPropertyId ?? property?.id}:${storageKey}`;
  const [resolved, setResolved] = useState<{ key: string; uri: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!storageKey) return;
    const direct = /^(https?:|file:|content:|data:)/.test(storageKey);
    void (direct ? Promise.resolve(storageKey) : storedFileUrl(storageKey, logoPropertyId))
      .then(uri => { if (!cancelled) setResolved({ key: scopeKey, uri }); })
      .catch(() => { if (!cancelled) setResolved(null); });
    return () => { cancelled = true; };
  }, [storageKey, logoPropertyId, scopeKey]);
  if (!storageKey || resolved?.key !== scopeKey) return <>{fallback}</>;
  return <Image {...props} source={{ uri: resolved.uri }} cachePolicy="memory" onError={() => setResolved(null)} />;
}
