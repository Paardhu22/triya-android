import { sessionStorage } from '@/services/sessionStorage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { clearData, setProperties } from '@/data/db';
import { request, setSession, setUploadPolicy, subscribeSessionExpired, setActiveProperty, type Session, type AccessibleProperty } from '@/data/client';
import type { UploadPolicy } from '@/utils/uploadPolicy';
import type { ActionResult } from '@/data';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isRestoring: boolean;
  signIn: (email: string, password: string) => Promise<ActionResult<User>>;
  signOut: () => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const clear = useCallback(() => {
    setSession(null); setActiveProperty(null); clearData(); setUser(null);
    void sessionStorage.write(null).catch(() => {});
  }, []);

  useEffect(() => subscribeSessionExpired(clear), [clear]);
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const saved = await sessionStorage.read();
        if (!saved || new Date(saved.expires).getTime() <= Date.now() || cancelled) return;
        setSession(saved);
        const current = await request<{ user: User; properties: AccessibleProperty[]; storage?: UploadPolicy }>('session');
        if (!cancelled) { setUploadPolicy(current.storage); setProperties(current.properties); setUser(current.user); }
      } catch { if (!cancelled) clear(); }
      finally { if (!cancelled) setIsRestoring(false); }
    }
    void restore();
    return () => { cancelled = true; };
  }, [clear]);

  const signIn = useCallback(async (email: string, password: string): Promise<ActionResult<User>> => {
    try {
      const next = await request<Session>('login', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), password }) });
      setSession(next);
      const current = await request<{ user: User; properties: AccessibleProperty[]; storage?: UploadPolicy }>('session');
      await sessionStorage.write(next);
      clearData(); setUploadPolicy(current.storage); setProperties(current.properties); setUser(current.user);
      return { ok: true, data: current.user };
    } catch (error) {
      clear();
      return { ok: false, error: error instanceof Error ? error.message : 'Could not sign in' };
    }
  }, [clear]);

  const signOut = useCallback(() => {
    // Capture and revoke the current token before removing it locally.
    void request('session', { method: 'DELETE' }).catch(() => {});
    clear();
  }, [clear]);
  const value = useMemo(() => ({ user, isRestoring, signIn, signOut }), [user, isRestoring, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
