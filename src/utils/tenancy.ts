/**
 * Tenancy business rules. Pure functions only.
 *
 * Ported from the web app (src/lib/tenancy.ts) plus the rent-due copy used on
 * the tenant profile — the rules must stay identical to the backend.
 */

import type { DepositStatus } from '@/types';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  startOfDay,
  startOfMonth,
  toDate,
} from './date';
import { rentDueDate, type CollectionState } from './rent';

/** Fixed system-wide notice period. There is intentionally no per-tenancy override. */
export const NOTICE_PERIOD_DAYS = 15;

/**
 * Maintenance reserve deducted from a tenant's security deposit at move-in.
 * Fixed at ₹1000, stored — like all money — in integer paise.
 */
export const MAINTENANCE_RESERVE_PAISE = 100_000; // ₹1000

/** Date the tenant must vacate by once notice is given (notice date + 15 days). */
export function vacateByDate(noticeGivenDate: string | Date): Date {
  return addDays(noticeGivenDate, NOTICE_PERIOD_DAYS);
}

/**
 * Deposit outcome when a tenancy ends. Refundable only when proper notice was
 * served and the tenant stayed through the full notice period; otherwise forfeited.
 */
export function resolveDepositStatusOnVacate(
  noticeGivenDate: string | Date | null,
  checkOutDate: string | Date,
): DepositStatus {
  if (!noticeGivenDate) return 'FORFEITED';
  return toDate(checkOutDate) >= vacateByDate(noticeGivenDate)
    ? 'REFUNDABLE'
    : 'FORFEITED';
}

/**
 * Human copy for when rent is next due: this month's due date (web
 * `rentDueDate`), rolling to next month's once this month is fully paid.
 */
export function rentDueText(
  state: CollectionState,
  paymentDueDay: number | null,
  now: Date = new Date(),
): string {
  const today = startOfDay(now);
  const month = startOfMonth(today);
  const dueDate = rentDueDate(paymentDueDay, state === 'PAID' ? addMonths(month, 1) : month);
  const daysLeft = differenceInCalendarDays(dueDate, today);

  if (daysLeft === 0) return 'Due today';
  if (daysLeft < 0) {
    const n = Math.abs(daysLeft);
    return `Overdue by ${n} day${n === 1 ? '' : 's'}`;
  }
  return `Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
}
