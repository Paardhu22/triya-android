import assert from 'node:assert/strict';
import { restoreSavedSession } from '../src/services/restoreSession';
import { request, RequestError, setDevelopmentApiUrl, setSession, type Session } from '../src/data/client';

const originalFetch = globalThis.fetch;
setDevelopmentApiUrl('https://session-test.invalid');
const saved = { token: 'test-token', expires: new Date(Date.now() + 60_000).toISOString(), user: { id: 'staff' } } as Session;
const payload = { user: saved.user, properties: [] };
const run = (read = async () => saved) => restoreSavedSession({ read, activate: setSession,
  validate: signal => request<typeof payload>('session', { signal, timeoutMs: 20 }), signal: new AbortController().signal });
async function main() {
try {
  globalThis.fetch = async () => { throw new TypeError('Network unavailable'); };
  assert.equal((await run()).kind, 'unavailable', 'Offline restore offers recovery instead of invalidating credentials');
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Unavailable' }), { status: 503 });
  assert.equal((await run()).kind, 'unavailable', 'Server failures remain recoverable');
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  assert.equal((await run()).kind, 'unavailable', 'A general permission failure does not imply an expired session');
  await assert.rejects(request('session'), (e: unknown) => e instanceof RequestError && e.status === 403);
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Expired' }), { status: 401 });
  assert.equal((await run()).kind, 'signed-out', 'Definitively rejected credentials require sign-in');
  globalThis.fetch = async () => new Response('<html>Proxy unavailable</html>');
  assert.equal((await run()).kind, 'unavailable', 'Malformed responses preserve recovery');
  globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });
  assert.equal((await run()).kind, 'unavailable', 'Bounded session timeout is recoverable');
  globalThis.fetch = async () => new Response(JSON.stringify(payload));
  assert.deepEqual(await run(), { kind: 'authenticated', data: payload }, 'Retry succeeds using the saved session');
  assert.equal((await run(async () => { throw new Error('SecureStore temporarily unavailable'); })).kind, 'unavailable');
  assert.equal((await run(async () => ({ ...saved, expires: 'invalid' }))).kind, 'signed-out');
  assert.equal((await run(async () => ({ ...saved, expires: '2000-01-01T00:00:00Z' }))).kind, 'signed-out');
  const controller = new AbortController(); let activates = 0;
  const result = await restoreSavedSession({ read: async () => { controller.abort(); return saved; },
    activate: () => { activates++; }, validate: async () => payload, signal: controller.signal });
  assert.equal(result.kind, 'cancelled'); assert.equal(activates, 0, 'Obsolete restore cannot reinstall credentials');
  console.log('Session recovery passed: offline, 503, 403, 401, malformed response, timeout, retry, storage failure, invalid/expired dates, cancellation.');
} finally { globalThis.fetch = originalFetch; setSession(null); }

}
void main();
