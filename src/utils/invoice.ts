/**
 * Pure invoice math shared by the send-invoice flow and previews, so the
 * client renders exactly the numbers the backend will store.
 *
 * Ported from the web app (src/lib/invoice-compute.ts).
 */

import { startOfMonth } from './date';
import { rentDueDate } from './rent';

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

/** What is still owed on an invoice after the month's collections so far. */
export function invoiceBalancePaise(totalPaise: number, paidPaise: number): number {
  return Math.max(0, totalPaise - paidPaise);
}

/**
 * The status printed on an invoice, derived from its own numbers so it can
 * never say "Pending" next to a zero balance.
 */
export function invoiceStatusLabel(args: {
  totalPaise: number;
  paidPaise: number;
  dueLabel: string;
}): string {
  if (invoiceBalancePaise(args.totalPaise, args.paidPaise) === 0) return 'Paid';
  return args.paidPaise > 0 ? 'Partially paid' : args.dueLabel;
}

/** First day of the current month — the default billed month. */
export function defaultBillingMonth(now: Date = new Date()): Date {
  return startOfMonth(now);
}

/** Default due date within the billed month — the day the status turns Overdue. */
export function defaultDueDate(paymentDueDay: number | null, billingMonth: Date): Date {
  return rentDueDate(paymentDueDay, billingMonth);
}
