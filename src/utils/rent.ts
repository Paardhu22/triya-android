/**
 * Rent collection rules shared by the mock queries/actions and the UI. Pure
 * functions only.
 *
 * Ported from the web app (src/lib/rent.ts). The ledger model: a Payment row
 * is ONE collection event (a receipt), grouped into a billing month by
 * `forMonth`. A month can therefore hold several rows (part cash now, part
 * online later). `Tenancy.paymentStatus` is a snapshot derived from the
 * month's collected total via `resolvePaymentStatus` — never set by hand.
 */

import type { PaymentMethod, PaymentStatus } from '@/types';
import { addMonths, startOfMonth, toDate } from './date';

export const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string }> = {
  CASH: { label: 'Cash' },
  ONLINE: { label: 'Online' },
  SPLIT: { label: 'Cash + Online' },
};

/** Total a tenancy owes for one month: rent plus the recurring maintenance charge. */
export function monthlyDuePaise(t: { monthlyRent: number; maintenanceCharge: number }): number {
  return t.monthlyRent + t.maintenanceCharge;
}

/**
 * The cash / online split of one collection. Older rows predate the split
 * columns — fall back to the method so historical payments still add up.
 */
export function paymentSplit(p: {
  amount: number;
  method: PaymentMethod;
  cashAmount: number | null;
  onlineAmount: number | null;
}): { cash: number; online: number } {
  if (p.cashAmount !== null || p.onlineAmount !== null) {
    return { cash: p.cashAmount ?? 0, online: p.onlineAmount ?? 0 };
  }
  if (p.method === 'ONLINE') return { cash: 0, online: p.amount };
  if (p.method === 'CASH') return { cash: p.amount, online: 0 };
  return { cash: 0, online: 0 };
}

/**
 * Normalize a collection into the pair actually stored. CASH and ONLINE put
 * the whole amount on one side; SPLIT keeps what was entered. Guarantees
 * `cashAmount + onlineAmount === amount`.
 */
export function resolveSplitPaise(
  amountPaise: number,
  method: PaymentMethod,
  cashPaise = 0,
  onlinePaise = 0,
): { cashAmount: number; onlineAmount: number } {
  if (method === 'CASH') return { cashAmount: amountPaise, onlineAmount: 0 };
  if (method === 'ONLINE') return { cashAmount: 0, onlineAmount: amountPaise };
  return { cashAmount: cashPaise, onlineAmount: onlinePaise };
}

/** Day of the month rent falls due when a tenancy has no `paymentDueDay` of its own. */
export const DEFAULT_DUE_DAY = 5;

/**
 * The day a billing month's rent falls due: the tenancy's `paymentDueDay`
 * (clamped to the month's length), else the 5th. The single definition shared
 * by the status, invoices, reminders and the tenant profile.
 */
export function rentDueDate(paymentDueDay: number | null, month: string | Date): Date {
  const m = toDate(month);
  const wanted =
    paymentDueDay && paymentDueDay >= 1 && paymentDueDay <= 31 ? paymentDueDay : DEFAULT_DUE_DAY;
  const lastDay = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  return new Date(m.getFullYear(), m.getMonth(), Math.min(wanted, lastDay));
}

/**
 * The current-cycle snapshot derived from what was actually collected:
 * PAID once covered (or nothing is due), OVERDUE once the due date has
 * passed, PENDING otherwise.
 */
export function resolvePaymentStatus(args: {
  duePaise: number;
  collectedPaise: number;
  paymentDueDay: number | null;
  /** First day of the billed month. */
  month: string | Date;
  now?: Date;
}): PaymentStatus {
  const { duePaise, collectedPaise, paymentDueDay, month } = args;
  if (duePaise <= 0 || collectedPaise >= duePaise) return 'PAID';

  const now = args.now ?? new Date();
  const deadline = rentDueDate(paymentDueDay, month);
  deadline.setHours(23, 59, 59, 999);
  return now > deadline ? 'OVERDUE' : 'PENDING';
}

/**
 * How much of a month has been collected, independent of the due date.
 * Orthogonal to `resolvePaymentStatus`: a PARTIAL month can still be OVERDUE.
 */
export type CollectionState = 'PAID' | 'PARTIAL' | 'UNPAID';

export function resolveCollectionState(duePaise: number, collectedPaise: number): CollectionState {
  if (duePaise <= 0 || collectedPaise >= duePaise) return 'PAID';
  return collectedPaise > 0 ? 'PARTIAL' : 'UNPAID';
}

/** The payment filters offered on list screens (Collections, Tenants, Reports). */
export const PAYMENT_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All payments' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIAL', label: 'Partially paid' },
  { value: 'PAID', label: 'Fully paid' },
  { value: 'OVERDUE', label: 'Overdue' },
] as const;

export type PaymentFilter = (typeof PAYMENT_FILTER_OPTIONS)[number]['value'];

export function matchesPaymentFilter(
  filter: PaymentFilter,
  row: { state: CollectionState; status: PaymentStatus },
): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'OVERDUE') return row.status === 'OVERDUE';
  return row.state === filter;
}

/** Billing-month key (`YYYY-MM`). */
export function monthKey(value: string | Date): string {
  const d = toDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** `YYYY-MM` → first day of that month (local time). */
export function monthFromKey(key: string): Date {
  const [year, m] = key.split('-').map(Number);
  return new Date(year, m - 1, 1);
}

/**
 * The first billing month a tenancy can be held to account for: the later of
 * its check-in month and the month it was entered into the app.
 */
export function ledgerStartMonth(t: { checkInDate: string | Date; createdAt: string | Date }): Date {
  const checkIn = startOfMonth(t.checkInDate);
  const created = startOfMonth(t.createdAt);
  return checkIn > created ? checkIn : created;
}

/**
 * Unpaid balance carried from months before `beforeMonth`: every month from
 * the ledger start up to (not including) `beforeMonth` whose collections fall
 * short of the monthly due. Uses the CURRENT rent for every month.
 */
export function earlierDues(args: {
  duePaise: number;
  startMonth: string | Date;
  beforeMonth: string | Date;
  /** PAID collections per `monthKey`. */
  collectedByMonth: Map<string, number>;
}): { paise: number; months: string[] } {
  const { duePaise, collectedByMonth } = args;
  const before = startOfMonth(args.beforeMonth);
  let paise = 0;
  const months: string[] = [];
  if (duePaise <= 0) return { paise, months };
  for (let m = startOfMonth(args.startMonth); m < before; m = addMonths(m, 1)) {
    const key = monthKey(m);
    const short = duePaise - (collectedByMonth.get(key) ?? 0);
    if (short > 0) {
      paise += short;
      months.push(key);
    }
  }
  return { paise, months };
}

/** Balance still owed for a month (never negative — an overpayment is an advance). */
export function balancePaise(duePaise: number, collectedPaise: number): number {
  return Math.max(0, duePaise - collectedPaise);
}

/** Amount collected beyond the month's due, i.e. paid in advance. */
export function advancePaise(duePaise: number, collectedPaise: number): number {
  return Math.max(0, collectedPaise - duePaise);
}

/** One recorded collection, as shown in the Collect Rent sheet. */
export interface RentCollectionEntry {
  id: string;
  amountPaise: number;
  cashPaise: number;
  onlinePaise: number;
  method: PaymentMethod;
  collectedAt: string;
  notes: string | null;
  recordedBy: string | null;
}

/** One tenancy's rent position for a single billing month. */
export interface RentCollectionView {
  tenancyId: string;
  tenantName: string;
  room: string;
  /** Billing month as YYYY-MM. */
  month: string;
  rentPaise: number;
  maintenancePaise: number;
  duePaise: number;
  collectedPaise: number;
  cashPaise: number;
  onlinePaise: number;
  balancePaise: number;
  advancePaise: number;
  paymentDueDay: number | null;
  status: PaymentStatus;
  state: CollectionState;
  /** Unpaid balance from months before this one, and which months (YYYY-MM). */
  earlierDuePaise: number;
  earlierDueMonths: string[];
  /** First billing month that can be collected for (YYYY-MM). */
  firstMonth: string;
  collections: RentCollectionEntry[];
}
