/**
 * Centralized status -> label + color mappings so occupancy, payment,
 * complaint and invoice states look identical everywhere they appear.
 *
 * Ported from the web app (src/lib/status.ts). Status always carries a text
 * label — color is reinforcement, never the sole signal.
 */

import { colors } from '@/theme';
import type {
  BedStatus,
  ComplaintPriority,
  ComplaintStatus,
  DepositStatus,
  InvoiceStatus,
  PaymentStatus,
} from '@/types';

export interface StatusMeta {
  label: string;
  /** Solid dot / indicator color. */
  color: string;
  /** Soft background for badge fills. */
  softColor: string;
}

/** The four restrained status tones used across the whole app. */
const TONE = {
  green: { color: colors.success, softColor: colors.successLight },
  amber: { color: colors.warning, softColor: colors.warningLight },
  red: { color: colors.error, softColor: colors.errorLight },
  neutral: { color: colors.neutral, softColor: colors.neutralLight },
} as const;

export const BED_STATUS_META: Record<BedStatus, StatusMeta> = {
  AVAILABLE: { label: 'Available', ...TONE.green },
  OCCUPIED: { label: 'Occupied', ...TONE.red },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, StatusMeta> = {
  PAID: { label: 'Paid', ...TONE.green },
  PENDING: { label: 'Pending', ...TONE.amber },
  OVERDUE: { label: 'Overdue', ...TONE.red },
};

export const COMPLAINT_STATUS_META: Record<ComplaintStatus, StatusMeta> = {
  OPEN: { label: 'Open', ...TONE.red },
  IN_PROGRESS: { label: 'In Progress', ...TONE.amber },
  RESOLVED: { label: 'Resolved', ...TONE.green },
};

export const COMPLAINT_PRIORITY_META: Record<ComplaintPriority, StatusMeta> = {
  LOW: { label: 'Low', ...TONE.neutral },
  MEDIUM: { label: 'Medium', ...TONE.amber },
  HIGH: { label: 'High', ...TONE.red },
};

export const INVOICE_STATUS_META: Record<InvoiceStatus, StatusMeta> = {
  SENT: { label: 'Sent', ...TONE.green },
  FAILED: { label: 'Not sent', ...TONE.red },
};

export const DEPOSIT_STATUS_META: Record<DepositStatus, StatusMeta> = {
  PENDING: { label: 'Pending', ...TONE.amber },
  REFUNDABLE: { label: 'Refundable', ...TONE.green },
  FORFEITED: { label: 'Forfeited', ...TONE.red },
  ADJUSTED: { label: 'Adjusted', ...TONE.neutral },
};
