/** Volatile cache of real server rows. No seeds, credentials, or local business writes. */
import type { AppNotification, Bed, Block, Complaint, Expense, ExpenseCategory, ExpenseSubcategory,
  Floor, Invoice, Payment, Property, Room, Tenancy, Tenant, TenantDocument, User } from '@/types';
import { activePropertyId, request, type AccessibleProperty } from './client';

export interface Database {
  users: User[]; properties: Property[]; blocks: Block[]; floors: Floor[]; rooms: Room[]; beds: Bed[];
  tenants: Tenant[]; tenancies: Tenancy[]; payments: Payment[]; invoices: Invoice[];
  complaints: Complaint[]; expenses: Expense[]; expenseCategories: ExpenseCategory[];
  expenseSubcategories: ExpenseSubcategory[]; notifications: AppNotification[]; documents: TenantDocument[];
}
const empty = (): Database => ({ users: [], properties: [], blocks: [], floors: [], rooms: [], beds: [],
  tenants: [], tenancies: [], payments: [], invoices: [], complaints: [], expenses: [],
  expenseCategories: [], expenseSubcategories: [], notifications: [], documents: [] });
let database = empty();
let properties: AccessibleProperty[] = [];
let loadedAt = 0;
let generation = 0;
let pending: Promise<void> | null = null;
let pendingController: AbortController | null = null;
type DbEvent = 'invalidate' | 'update';
const listeners = new Set<(event: DbEvent) => void>();
const readIds = new Set<string>();
export const getDb = () => database;
export const accessibleProperties = () => properties;
export function setProperties(value: AccessibleProperty[]) { properties = value; database = { ...database, properties: value }; }
export function subscribeToDb(fn: (event: DbEvent) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
function invalidate() {
  generation++; pendingController?.abort(); pendingController = null; pending = null; loadedAt = 0;
}
export function notifyDbChanged() { invalidate(); listeners.forEach(fn => fn('invalidate')); }
export function clearSnapshot() { invalidate(); database = empty(); database.properties = properties; }
export function clearData() { properties = []; readIds.clear(); clearSnapshot(); }

export async function loadSnapshot(force = false) {
  if (!activePropertyId()) throw new Error('Select a property to continue');
  if (!force && loadedAt && Date.now() - loadedAt < 5000) return;
  if (pending) return pending;
  const version = generation;
  const controller = new AbortController();
  pendingController = controller;
  const task = request<Omit<Database, 'notifications'>>('snapshot', { signal: controller.signal }).then(rows => {
    if (version !== generation) return;
    const tenantNames = new Map(rows.tenants.map(t => [t.id, t.fullName]));
    const notifications: AppNotification[] = [
      ...rows.payments.filter(p => p.status === 'PAID').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100).map(p => ({ id: `payment:${p.id}`, propertyId: p.propertyId, kind: 'PAYMENT' as const,
        title: 'Rent received', body: `${tenantNames.get(p.tenantId) ?? 'Tenant'} · ₹${(p.amount / 100).toLocaleString('en-IN')}`,
        createdAt: p.createdAt, read: readIds.has(`payment:${p.id}`) })),
      ...[...rows.complaints].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 100).map(c => ({ id: `complaint:${c.id}`, propertyId: c.propertyId, kind: 'COMPLAINT' as const,
        title: c.title, body: c.status.replace(/_/g, ' '), createdAt: c.updatedAt, read: readIds.has(`complaint:${c.id}`) })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
    properties = properties.map(p => rows.properties.find(fresh => fresh.id === p.id) ? { ...p, ...rows.properties.find(fresh => fresh.id === p.id) } : p);
    database = { ...rows, properties, notifications };
    loadedAt = Date.now();
    listeners.forEach(fn => fn('update'));
  });
  pending = task;
  try { await task; } finally { if (pending === task) { pending = null; pendingController = null; } }
}
export function markRead(id?: string) {
  database.notifications.forEach(n => { if (!id || n.id === id) { n.read = true; readIds.add(n.id); } });
  listeners.forEach(fn => fn('update'));
}
