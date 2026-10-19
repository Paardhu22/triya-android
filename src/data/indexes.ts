import type { Bed, Payment, Tenancy } from '@/types';
import { monthKey } from '@/utils/rent';
import type { Database } from './db';

/** Build once per server snapshot. Weak keys let old property data be collected. */
function buildIndexes(db: Database) {
  const activeByBed = new Map<string, Tenancy>();
  const activeByTenant = new Map<string, Tenancy>();
  for (const tenancy of db.tenancies) {
    if (tenancy.status !== 'ACTIVE') continue;
    if (!activeByBed.has(tenancy.bedId)) activeByBed.set(tenancy.bedId, tenancy);
    if (!activeByTenant.has(tenancy.tenantId)) activeByTenant.set(tenancy.tenantId, tenancy);
  }
  const bedsByRoom = new Map<string, Bed[]>();
  for (const bed of db.beds) {
    const beds = bedsByRoom.get(bed.roomId) ?? [];
    beds.push(bed); bedsByRoom.set(bed.roomId, beds);
  }
  for (const beds of bedsByRoom.values()) beds.sort((a, b) => a.order - b.order);
  const paidByTenancyMonth = new Map<string, Map<string, Payment[]>>();
  const collectedByTenancyMonth = new Map<string, Map<string, number>>();
  for (const payment of db.payments) {
    if (payment.status !== 'PAID') continue;
    const key = monthKey(payment.forMonth);
    const months = paidByTenancyMonth.get(payment.tenancyId) ?? new Map<string, Payment[]>();
    const payments = months.get(key) ?? [];
    payments.push(payment); months.set(key, payments); paidByTenancyMonth.set(payment.tenancyId, months);
    const totals = collectedByTenancyMonth.get(payment.tenancyId) ?? new Map<string, number>();
    totals.set(key, (totals.get(key) ?? 0) + payment.amount); collectedByTenancyMonth.set(payment.tenancyId, totals);
  }
  return {
    tenantById: new Map(db.tenants.map(t => [t.id, t])),
    roomById: new Map(db.rooms.map(r => [r.id, r])),
    bedById: new Map(db.beds.map(b => [b.id, b])),
    floorById: new Map(db.floors.map(f => [f.id, f])),
    blockById: new Map(db.blocks.map(b => [b.id, b])),
    activeByBed, activeByTenant, bedsByRoom, paidByTenancyMonth, collectedByTenancyMonth,
  };
}
const cache = new WeakMap<Database, ReturnType<typeof buildIndexes>>();
export function getIndexes(db: Database) {
  let indexes = cache.get(db);
  if (!indexes) { indexes = buildIndexes(db); cache.set(db, indexes); }
  return indexes;
}
