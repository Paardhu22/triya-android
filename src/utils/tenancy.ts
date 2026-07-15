/**
 * Tenancy business rules. Pure functions only.
 *
 * Ported from the web app (src/lib/tenancy.ts) plus the rent-due copy used on
 * the tenant profile — the rules must stay identical to the backend.
 */

import type { DepositStatus, PaymentStatus } from '@/types';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  setDayOfMonth,
  startOfDay,
  startOfMonth,
  toDate,
} from './date';

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
 * Human copy for when the current rent cycle is due: the tenancy's due day
 * (default 5th); once PAID the next due date rolls to next month.
 */
export function rentDueText(
  paymentStatus: PaymentStatus,
  paymentDueDay: number | null,
  now: Date = new Date(),
): string {
  const today = startOfDay(now);
  const dueDay = paymentDueDay || 5;

  let dueMonth = startOfMonth(today);
  if (paymentStatus === 'PAID') {
    dueMonth = addMonths(dueMonth, 1);
  }

  const dueDate = setDayOfMonth(dueMonth, dueDay);
  const daysLeft = differenceInCalendarDays(dueDate, today);

  if (daysLeft === 0) return 'Due today';
  if (daysLeft < 0) {
    const n = Math.abs(daysLeft);
    return `Overdue by ${n} day${n === 1 ? '' : 's'}`;
  }
  return `Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
}

/**
 * The amount an unpaid tenancy owes for the current cycle: rent + maintenance.
 * Once PAID the tenant owes nothing for the cycle. (Collections page rule.)
 */
export function currentCycleDuePaise(tenancy: {
  paymentStatus: PaymentStatus;
  monthlyRent: number;
  maintenanceCharge: number;
}): number {
  if (tenancy.paymentStatus === 'PAID') return 0;
  return tenancy.monthlyRent + tenancy.maintenanceCharge;
}
