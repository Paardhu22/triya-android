import { RequestError, type Session } from '../data/client';

export type RestoreResult<T> =
  | { kind: 'authenticated'; data: T }
  | { kind: 'signed-out' }
  | { kind: 'unavailable' }
  | { kind: 'cancelled' };

/** Connectivity and storage failures must not erase a saved credential. */
export async function restoreSavedSession<T>(options: {
  read: () => Promise<Session | null>;
  activate: (session: Session) => void;
  validate: (signal: AbortSignal) => Promise<T>;
  signal: AbortSignal;
}): Promise<RestoreResult<T>> {
  try {
    const saved = await options.read();
    if (options.signal.aborted) return { kind: 'cancelled' };
    if (!saved || !Number.isFinite(Date.parse(saved.expires)) || Date.parse(saved.expires) <= Date.now()) return { kind: 'signed-out' };
    options.activate(saved);
    const data = await options.validate(options.signal);
    return options.signal.aborted ? { kind: 'cancelled' } : { kind: 'authenticated', data };
  } catch (error) {
    if (options.signal.aborted) return { kind: 'cancelled' };
    // A general 403 can be a permission/configuration problem, not invalid credentials.
    return { kind: error instanceof RequestError && error.status === 401 ? 'signed-out' : 'unavailable' };
  }
}
