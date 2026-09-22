/**
 * The payments ledger over the mock database — the web's src/lib/ledger.ts.
 *
 * A Payment row is one collection event; a billing month may hold several.
 * Every write path (Collect Rent, the check-in form, room rent changes) goes
 * through here so `Tenancy.paymentStatus` is always DERIVED from what was
 * actually collected instead of being set by hand.
 */

import type { PaymentMethod, Tenancy } from '@/types';
import {
  monthKey,
  monthlyDuePaise,
  resolvePaymentStatus,
  resolveSplitPaise,
  startOfMonth,
  toDate,
} from '@/utils';
import type { MockDatabase } from './db';

/** Total collected (status PAID) against one tenancy for one billing month. */
export function sumCollected(db: MockDatabase, tenancyId: string, forMonth: string | Date): number {
  const key = monthKey(forMonth);
  let total = 0;
  for (const p of db.payments) {
    if (p.tenancyId === tenancyId && p.status === 'PAID' && monthKey(p.forMonth) === key) {
      total += p.amount;
    }
  }
  return total;
}

/**
 * PAID collections per tenancy per billing month (`monthKey`), for every month
 * in `[from, to]` — one pass over the ledger for a whole property's arrears.
 */
export function loadCollectedByMonth(
  db: MockDatabase,
  tenancyIds: string[],
  from: string | Date,
  to: string | Date,
): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>();
  const fromTime = startOfMonth(from).getTime();
  const toTime = startOfMonth(to).getTime();
  if (tenancyIds.length === 0 || fromTime > toTime) return result;

  const wanted = new Set(tenancyIds);
  for (const p of db.payments) {
    if (p.status !== 'PAID' || !wanted.has(p.tenancyId)) continue;
    const t = startOfMonth(p.forMonth).getTime();
    if (t < fromTime || t > toTime) continue;
    const months = result.get(p.tenancyId) ?? new Map<string, number>();
    const key = monthKey(p.forMonth);
    months.set(key, (months.get(key) ?? 0) + p.amount);
    result.set(p.tenancyId, months);
  }
  return result;
}

/**
 * Re-derive and store the tenancy's current-cycle payment snapshot. Always
 * reads the CURRENT month, even when the write settled an older one.
 */
export function refreshPaymentStatus(db: MockDatabase, tenancy: Tenancy, now = new Date()): void {
  const month = startOfMonth(now);
  tenancy.paymentStatus = resolvePaymentStatus({
    duePaise: monthlyDuePaise(tenancy),
    collectedPaise: sumCollected(db, tenancy.id, month),
    paymentDueDay: tenancy.paymentDueDay,
    month,
    now,
  });
}

let paymentSeq = 0;

/** Append one collection to the ledger and return it. */
export function recordPayment(
  db: MockDatabase,
  args: {
    tenancy: Tenancy;
    amount: number;
    forMonth: string | Date;
    method: PaymentMethod;
    cashPaise?: number;
    onlinePaise?: number;
    at: string | Date;
    notes?: string | null;
    recordedByName: string | null;
  },
) {
  const split = resolveSplitPaise(args.amount, args.method, args.cashPaise, args.onlinePaise);
  const at = toDate(args.at).toISOString();
  paymentSeq += 1;
  const payment = {
    id: `payment-${String(paymentSeq).padStart(5, '0')}`,
    propertyId: args.tenancy.propertyId,
    tenancyId: args.tenancy.id,
    tenantId: args.tenancy.tenantId,
    amount: args.amount,
    forMonth: startOfMonth(args.forMonth).toISOString(),
    status: 'PAID' as const,
    method: args.method,
    cashAmount: split.cashAmount,
    onlineAmount: split.onlineAmount,
    paidAt: at,
    notes: args.notes ?? null,
    recordedByName: args.recordedByName,
    createdAt: at,
  };
  db.payments.push(payment);
  return payment;
}

/**
 * Settle a billing month by recording whatever is still outstanding as one
 * collection. A no-op when the month is already covered, so re-saving a form
 * that says "Paid" cannot double-count. Returns the new payment's id or null.
 */
export function settleMonth(
  db: MockDatabase,
  args: {
    tenancy: Tenancy;
    forMonth: string | Date;
    method: PaymentMethod;
    /** Split entered by the staff, in paise. Ignored unless SPLIT. */
    cashPaise?: number;
    onlinePaise?: number;
    recordedByName: string | null;
    at: string | Date;
  },
): string | null {
  const shortfall = monthlyDuePaise(args.tenancy) - sumCollected(db, args.tenancy.id, args.forMonth);
  if (shortfall <= 0) return null;

  // The entered split is validated against the full month's due. When part of
  // the month was already collected only the remainder is recorded, so
  // re-apportion it — cash first.
  let cash = args.cashPaise ?? 0;
  let online = args.onlinePaise ?? 0;
  if (args.method === 'SPLIT' && cash + online !== shortfall) {
    cash = Math.min(cash, shortfall);
    online = shortfall - cash;
  }
  return recordPayment(db, {
    tenancy: args.tenancy,
    amount: shortfall,
    forMonth: args.forMonth,
    method: args.method,
    cashPaise: cash,
    onlinePaise: online,
    at: args.at,
    recordedByName: args.recordedByName,
  }).id;
}
