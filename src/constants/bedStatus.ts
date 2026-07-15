/**
 * Visual-only classification for the Floor Manager: Vacant / Paid / Pending /
 * Overdue. Distinct from the app-wide BED_STATUS_META / PAYMENT_STATUS_META
 * (those cover Bed.status and Tenancy.paymentStatus individually) — this
 * collapses both into the single accent a bed tile shows.
 *
 * Ported from the web app (src/components/floor/bed-status.ts).
 */

import { colors } from '@/theme';
import type { BedStatus, PaymentStatus } from '@/types';

export type BedVisualStatus = 'paid' | 'pending' | 'overdue' | 'vacant';

interface BedLike {
  status: BedStatus;
  tenancy: { paymentStatus: PaymentStatus } | null;
}

export function bedVisualStatus(bed: BedLike): BedVisualStatus {
  if (!bed.tenancy || bed.status !== 'OCCUPIED') return 'vacant';
  if (bed.tenancy.paymentStatus === 'PAID') return 'paid';
  if (bed.tenancy.paymentStatus === 'OVERDUE') return 'overdue';
  return 'pending';
}

export interface BedVisualStatusMeta {
  label: string;
  /** Dot / left-edge accent color. */
  color: string;
  /** Soft tint used behind the accent when highlighted. */
  softColor: string;
}

export const BED_VISUAL_STATUS_META: Record<BedVisualStatus, BedVisualStatusMeta> = {
  paid: { label: 'Paid', color: colors.success, softColor: colors.successLight },
  pending: { label: 'Pending', color: colors.warning, softColor: colors.warningLight },
  overdue: { label: 'Overdue', color: colors.error, softColor: colors.errorLight },
  vacant: { label: 'Vacant', color: colors.neutral, softColor: colors.neutralLight },
};

/** Ordered list for legends / filters. */
export const BED_VISUAL_STATUSES: BedVisualStatus[] = [
  'paid',
  'pending',
  'overdue',
  'vacant',
];
