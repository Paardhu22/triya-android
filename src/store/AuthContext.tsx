/**
 * Session state. Backed by the mock credential store today; the signIn body
 * is the single place that changes when the real auth endpoint (Auth.js
 * credentials flow) is wired in. Deliberately plain React context — no
 * external state library, per project constraints.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { authenticate, simulateLatency, type ActionResult } from '@/mocks';
import type { User } from '@/types';

interface AuthContextValue {
  /** The signed-in staff account, or null. */
  user: User | null;
  signIn: (email: string, password: string) => Promise<ActionResult<User>>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const signIn = useCallback(
    async (email: string, password: string): Promise<ActionResult<User>> => {
      await simulateLatency(600);
      const authenticated = authenticate(email.trim().toLowerCase(), password);
      if (!authenticated) {
        return { ok: false, error: 'Invalid email or password' };
      }
      setUser(authenticated);
      return { ok: true, data: authenticated };
    },
    [],
  );

  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
