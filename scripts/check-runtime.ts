/** Deterministic client regressions and a synthetic scaling benchmark. No live API or database. */
/// <reference types="node" />
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { request, setSession, setActiveProperty, storedFileUrl } from '../src/data/client';
import { clearData, clearSnapshot, getDb, loadSnapshot, markRead, notifyDbChanged, setProperties, subscribeToDb, type Database } from '../src/data/db';
import { getCollectionsData, getFloorLayout, getOccupancyDirectory, getTenantList } from '../src/data/queries';
import { monthKey } from '../src/utils/rent';

process.env.EXPO_PUBLIC_API_URL = 'http://127.0.0.1:3999';
const originalFetch = globalThis.fetch;
const now = new Date();
const stamp = now.toISOString();
const currentMonth = monthKey(now);
const property = { id: 'a', name: 'Test A', slug: 'a', address: null, city: null, phone: null,
  rulesText: null, hasBlocks: false, isFlat: false, isActive: true };
function fixture(count = 600): Database {
  const db: Database = { users: [], properties: [property], blocks: [], floors: [], rooms: [], beds: [], tenants: [],
    tenancies: [], payments: [], invoices: [], complaints: [], expenses: [], expenseCategories: [], expenseSubcategories: [], notifications: [], documents: [] };
  db.floors.push({ id: 'floor', propertyId: 'a', blockId: null, name: null, number: 1, order: 0 });
  for (let i = 0; i < count; i++) {
    const id = String(i);
    db.rooms.push({ id, propertyId: 'a', floorId: 'floor', number: id, label: null, sharingType: 1, defaultRent: null, defaultMaintenance: null, order: i });
    db.beds.push({ id, propertyId: 'a', roomId: id, label: 'A', status: 'OCCUPIED', order: 0 });
    db.tenants.push({ id, propertyId: 'a', fullName: `Tenant ${id.padStart(4, '0')}`, phone: '9000000000', email: null,
      emergencyContact: null, fatherName: null, motherName: null, address: null, aadhaarNumber: null, panNumber: null,
      college: null, company: null, occupation: null, notes: null, photoUrl: null, createdAt: stamp });
    const start = new Date(now.getFullYear(), now.getMonth() - 23, 1).toISOString();
    db.tenancies.push({ id, propertyId: 'a', tenantId: id, roomId: id, bedId: id, status: 'ACTIVE', monthlyRent: 800000,
      maintenanceCharge: 100000, securityDeposit: 900000, depositStatus: 'PENDING', paymentStatus: 'PENDING',
      paymentDueDay: 5, checkInDate: start, noticeGivenDate: null, expectedLeavingDate: null, checkOutDate: null, createdAt: start });
    for (let m = 0; m < 24; m++) {
      const date = new Date(now.getFullYear(), now.getMonth() - m, 1).toISOString();
      db.payments.push({ id: `${id}:${m}`, propertyId: 'a', tenancyId: id, tenantId: id, amount: 500001, forMonth: date,
        status: 'PAID', method: 'SPLIT', cashAmount: 250000, onlineAmount: 250001, paidAt: date, notes: null, recordedByName: null, createdAt: date });
    }
  }
  return db;
}
function reset() {
  setSession({ token: 'test-session', expires: new Date(Date.now() + 60000).toISOString(),
    user: { id: 'admin', name: 'Admin', email: 'admin@example.test', role: 'ADMIN', propertyId: null, isActive: true } });
  clearData();
  setProperties([{ ...property, stats: { totalRooms: 0, totalBeds: 0, occupiedBeds: 0 } }]);
  setActiveProperty('a');
}
const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};
async function benchmark() {
  reset();
  const db = fixture();
  globalThis.fetch = async () => json(db);
  await loadSnapshot();
  const timings: Record<string, number> = {};
  for (const [name, query] of Object.entries({ tenants: () => getTenantList('a'), floor: () => getFloorLayout('floor'),
    collections: () => getCollectionsData('a', currentMonth), directory: () => getOccupancyDirectory('a') })) {
    const start = performance.now();
    for (let i = 0; i < 3; i++) query();
    timings[name] = Math.round((performance.now() - start) / 3 * 100) / 100;
  }
  console.log(JSON.stringify({ benchmark: '600 tenants, 14,400 receipts; average ms per query', timings }));
  const tenant = getTenantList('a')[0];
  assert.equal(tenant.active?.collectedPaise, 500001);
  const due = getCollectionsData('a', currentMonth)[0];
  assert.equal(due.collectedPaise, 500001);
  assert.equal(due.cashPaise, 250000);
  assert.equal(due.onlinePaise, 250001);
  assert.equal(due.earlierDuePaise, 23 * 399999);
  assert.equal(getFloorLayout('floor')[0].beds[0].tenancy?.collectedPaise, 500001);
}
async function regressions() {
  reset();
  const db = fixture(2);
  let calls = 0;
  globalThis.fetch = async () => { calls++; return json(db); };
  await Promise.all([loadSnapshot(), loadSnapshot(), loadSnapshot(true)]);
  assert.equal(calls, 1, 'Parallel snapshot requests share one fetch');
  let updates = 0;
  const stop = subscribeToDb(() => { updates++; });
  markRead();
  stop();
  assert.equal(calls, 1, 'Read markers do not fetch the server');
  assert.equal(updates, 1);

  clearSnapshot();
  const oldResponse = deferred<Response>();
  let signal: AbortSignal | null | undefined;
  globalThis.fetch = async (_url, init) => { calls++; signal = init?.signal; return oldResponse.promise; };
  const oldLoad = loadSnapshot();
  setActiveProperty('b'); clearSnapshot();
  const next = fixture(0); next.properties = [{ ...property, id: 'b', name: 'Test B' }];
  globalThis.fetch = async () => json(next);
  const nextLoad = loadSnapshot();
  oldResponse.resolve(json(db));
  await Promise.allSettled([oldLoad, nextLoad]);
  assert.equal(signal?.aborted, true, 'Switching property cancels the old network request');
  assert.equal(getDb().tenants.length, 0, 'Old property rows never overwrite the new property');

  reset();
  const obsolete = deferred<Response>();
  globalThis.fetch = async () => obsolete.promise;
  const stale = loadSnapshot();
  notifyDbChanged();
  globalThis.fetch = async () => json(fixture(1));
  const fresh = loadSnapshot();
  obsolete.resolve(json(db));
  await Promise.allSettled([stale, fresh]);
  assert.equal(getDb().tenants.length, 1, 'Invalidated responses cannot overwrite newer data');
  assert.equal(getTenantList('a').length, 1, 'Indexes rebuild after snapshot replacement');

  reset(); calls = 0;
  const signed = deferred<Response>();
  globalThis.fetch = async () => { calls++; return signed.promise; };
  const images = [storedFileUrl('same-image'), storedFileUrl('same-image')];
  signed.resolve(json({ path: '/api/mobile/files/test' }));
  await Promise.all(images);
  assert.equal(calls, 1, 'Repeated images share one signing request');

  globalThis.fetch = async () => new Response('<html>Proxy unavailable</html>', { status: 200 });
  await assert.rejects(request('session'), /invalid|unexpected|JSON/i, 'Malformed success responses produce a useful error');
  const controller = new AbortController(); controller.abort();
  globalThis.fetch = async (_url, init) => {
    assert.equal(init?.signal?.aborted, true, 'Caller cancellation reaches fetch');
    throw new DOMException('Cancelled', 'AbortError');
  };
  await assert.rejects(request('session', { signal: controller.signal }), { name: 'AbortError' });
  console.log('Runtime regressions passed: coalescing, property scope, invalidation, read markers, image signing, malformed responses and cancellation.');
}
async function main() {
  try { await benchmark(); if (!process.argv.includes('--benchmark-only')) await regressions(); }
  finally { globalThis.fetch = originalFetch; setSession(null); setActiveProperty(null); clearData(); }
}
void main();
