import { sessionStorage } from '@/services/sessionStorage';
import { restoreSavedSession } from '@/services/restoreSession';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { clearData, setProperties } from '@/data/db';
import { request, setSession, setUploadPolicy, subscribeSessionExpired, setActiveProperty, type Session, type AccessibleProperty } from '@/data/client';
import type { UploadPolicy } from '@/utils/uploadPolicy';
import type { ActionResult } from '@/data';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isRestoring: boolean;
  restoreError: string | null;
  retryRestore: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<ActionResult<User>>;
  signOut: () => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const restoreController = useRef<AbortController | null>(null);
  const clear = useCallback(() => {
    restoreController.current?.abort();
    setRestoreError(null); setIsRestoring(false);
    setSession(null); setActiveProperty(null); clearData(); setUser(null);
    void sessionStorage.write(null).catch(() => {});
  }, []);

  useEffect(() => subscribeSessionExpired(clear), [clear]);
  const retryRestore = useCallback(async () => {
    restoreController.current?.abort();
    const controller = new AbortController();
    restoreController.current = controller;
    setIsRestoring(true);
    const result = await restoreSavedSession({
      read: () => sessionStorage.read(), activate: setSession, signal: controller.signal,
      validate: signal => request<{ user: User; properties: AccessibleProperty[]; storage?: UploadPolicy }>('session', { signal, timeoutMs: 10_000 }),
    });
    if (controller.signal.aborted) return;
    if (result.kind === 'authenticated') {
      setUploadPolicy(result.data.storage); setProperties(result.data.properties); setUser(result.data.user);
      setRestoreError(null);
    } else if (result.kind === 'signed-out') {
      clear();
    } else if (result.kind === 'unavailable') {
      setRestoreError("We couldn't restore your session. Your saved sign-in hasn't been removed. Check your connection and try again.");
    }
    setIsRestoring(false);
  }, [clear]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void retryRestore(); });
    return () => { active = false; restoreController.current?.abort(); };
  }, [retryRestore]);

  const signIn = useCallback(async (email: string, password: string): Promise<ActionResult<User>> => {
    restoreController.current?.abort();
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
  const value = useMemo(() => ({ user, isRestoring, restoreError, retryRestore, signIn, signOut }), [user, isRestoring, restoreError, retryRestore, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
