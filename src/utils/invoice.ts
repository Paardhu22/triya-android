/**
 * Pure invoice math shared by the send-invoice flow and previews, so the
 * client renders exactly the numbers the backend will store.
 *
 * Ported from the web app (src/lib/invoice-compute.ts).
 */

import { endOfMonth, setDayOfMonth, startOfMonth } from './date';

/** The five raw charge components, in paise. */
export interface InvoiceChargesPaise {
  rentPaise: number;
  maintenancePaise: number;
  previousDuePaise: number;
  extraChargesPaise: number;
  discountPaise: number;
}

/** Subtotal = rent + maintenance + previous due + extra; total = subtotal − discount. */
export function computeInvoiceTotals(c: InvoiceChargesPaise): {
  subtotalPaise: number;
  totalPaise: number;
} {
  const subtotalPaise =
    c.rentPaise + c.maintenancePaise + c.previousDuePaise + c.extraChargesPaise;
  const totalPaise = Math.max(0, subtotalPaise - c.discountPaise);
  return { subtotalPaise, totalPaise };
}

/** First day of the current month — the default billed month. */
export function defaultBillingMonth(now: Date = new Date()): Date {
  return startOfMonth(now);
}

/**
 * Default due date within the billed month: the tenancy's payment-due day when
 * set (clamped to the month length), otherwise the 5th.
 */
export function defaultDueDate(
  paymentDueDay: number | null,
  billingMonth: Date,
): Date {
  const wanted =
    paymentDueDay && paymentDueDay >= 1 && paymentDueDay <= 31 ? paymentDueDay : 5;
  const lastDay = endOfMonth(billingMonth).getDate();
  return setDayOfMonth(startOfMonth(billingMonth), Math.min(wanted, lastDay));
}
