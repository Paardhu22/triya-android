import type { ComplaintPriority, ComplaintStatus, PaymentMethod, PaymentStatus } from '@/types';

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface IssuedInvoice {
  number: string | null;
  delivered: boolean;
  error: string | null;
}

export interface CollectRentInput {
  tenancyId: string;
  /** Billing month this collection settles, YYYY-MM. */
  forMonth: string;
  /** Paise. */
  amount: number;
  method: PaymentMethod;
  /** Paise, SPLIT only. */
  cashAmount?: number;
  /** Paise, SPLIT only. */
  onlineAmount?: number;
  /** When the money changed hands (ISO). */
  collectedAt: string;
  notes?: string | null;
  /** Issue the invoice for this collection and send it on WhatsApp. */
  sendInvoice: boolean;
  recordedByName?: string | null;
}

export interface CollectRentResult {
  paymentId: string;
  balancePaise: number;
  fullyPaid: boolean;
  /** The invoice issued for this collection; null when the staff opted out. */
  invoice: IssuedInvoice | null;
}

export interface ReminderBatchResult {
  sent: number;
  failed: number;
  skipped: number;
  /** Rows the batch targeted. */
  eligible: number;
}

export interface SendInvoiceInput {
  tenancyId: string;
  /** Billing month, YYYY-MM. Defaults to the current month. */
  billingMonth?: string;
  /** Paise. */
  previousDuePaise?: number;
  /** Paise. */
  extraChargesPaise?: number;
  extraChargesLabel?: string | null;
  /** Paise. */
  discountPaise?: number;
  notes?: string | null;
}

export interface SetRoomRentInput {
  roomId: string;
  /** Paise; null clears the room default. */
  rent: number | null;
  /** Paise; null clears the room default. */
  maintenance: number | null;
  /** Also push the new amounts onto every ACTIVE tenancy in the room. */
  applyToOccupants: boolean;
}

export interface CreateComplaintInput {
  propertyId: string;
  title: string;
  description?: string | null;
  priority: ComplaintPriority;
  roomId?: string | null;
  tenantId?: string | null;
  assignedToId?: string | null;
}

export interface UpdateComplaintInput {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  assignedToId?: string | null;
}

export interface CreateExpenseInput {
  propertyId: string;
  /** Paise. */
  amount: number;
  categoryId: string;
  subcategoryId?: string | null;
  date: string;
  vendor?: string | null;
  notes?: string | null;
  createdByName?: string | null;
}

export interface AssignTenantInput {
  bedId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  /** Paise. */
  monthlyRent: number;
  /** Paise. */
  maintenanceCharge?: number;
  /** Paise. Entered net of the ₹1000 maintenance reserve. */
  securityDeposit?: number | null;
  checkInDate: string;
  paymentStatus: Extract<PaymentStatus, 'PAID' | 'PENDING'>;
  /** How the first cycle was received, when paymentStatus is PAID. */
  paymentMethod?: PaymentMethod;
  /** Paise. Required when paymentMethod is SPLIT. */
  cashAmount?: number;
  /** Paise. Required when paymentMethod is SPLIT. */
  onlineAmount?: number;
  recordedByName?: string;
}

export interface UpdatePropertySettingsInput {
  name: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  rulesText?: string | null;
}
