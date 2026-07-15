/**
 * Write API over the mock database.
 *
 * Mirrors the web app's src/lib/actions server actions — same names, same
 * business rules, same ActionResult envelope — so each function maps 1:1 to a
 * backend call at integration time. Every mutation ends with notifyDbChanged()
 * so data hooks refetch.
 */

import type {
  ComplaintPriority,
  ComplaintStatus,
  PaymentMethod,
  PaymentStatus,
  Tenancy,
} from '@/types';
import {
  formatINR,
  formatMonthYear,
  resolveDepositStatusOnVacate,
  startOfMonth,
  toDate,
  vacateByDate,
} from '@/utils';
import { createInvoiceRecord, getDb, newId, notifyDbChanged } from './db';

/** Same success/error envelope as the web's src/lib/action-result.ts. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const ok = <T,>(data: T): ActionResult<T> => ({ ok: true, data });
const err = <T,>(error: string): ActionResult<T> => ({ ok: false, error });

/**
 * Simulated network latency so flows exercise their loading states exactly as
 * they will against the real backend.
 */
export function simulateLatency(ms = 450): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pushNotification(
  propertyId: string,
  kind: 'PAYMENT' | 'COMPLAINT' | 'TENANT' | 'INVOICE' | 'SYSTEM',
  title: string,
  body: string,
): void {
  getDb().notifications.unshift({
    id: newId('notification'),
    propertyId,
    kind,
    title,
    body,
    createdAt: new Date().toISOString(),
    read: false,
  });
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export interface MarkRentPaidInput {
  tenancyId: string;
  method?: PaymentMethod;
  /** Paise. Required when method is SPLIT. */
  cashAmount?: number;
  /** Paise. Required when method is SPLIT. */
  onlineAmount?: number;
  recordedByName?: string;
}

/**
 * Record the current cycle's rent as received: creates a PAID payment for
 * rent + maintenance and flips the tenancy's cycle snapshot to PAID.
 */
export function markRentPaid(input: MarkRentPaidInput): ActionResult {
  const db = getDb();
  const tenancy = db.tenancies.find((t) => t.id === input.tenancyId);
  if (!tenancy || tenancy.status !== 'ACTIVE') return err('Tenancy not found.');
  if (tenancy.paymentStatus === 'PAID') return err('This cycle is already paid.');

  const amount = tenancy.monthlyRent + tenancy.maintenanceCharge;
  const method = input.method ?? 'CASH';
  if (method === 'SPLIT') {
    const cash = input.cashAmount ?? 0;
    const online = input.onlineAmount ?? 0;
    if (cash + online !== amount) {
      return err('Split amounts must add up to the total due.');
    }
  }

  const now = new Date();
  db.payments.push({
    id: newId('payment'),
    propertyId: tenancy.propertyId,
    tenancyId: tenancy.id,
    tenantId: tenancy.tenantId,
    amount,
    forMonth: startOfMonth(now).toISOString(),
    status: 'PAID',
    method,
    cashAmount: method === 'SPLIT' ? input.cashAmount ?? null : null,
    onlineAmount: method === 'SPLIT' ? input.onlineAmount ?? null : null,
    paidAt: now.toISOString(),
    notes: null,
    recordedByName: input.recordedByName ?? null,
    createdAt: now.toISOString(),
  });
  tenancy.paymentStatus = 'PAID';

  const tenant = db.tenants.find((t) => t.id === tenancy.tenantId);
  pushNotification(
    tenancy.propertyId,
    'PAYMENT',
    'Rent received',
    `${tenant?.fullName ?? 'Tenant'} paid ${formatINR(amount)} for ${formatMonthYear(now)}.`,
  );

  notifyDbChanged();
  return ok(undefined);
}

/**
 * Flip a tenancy's cycle status from the tenant profile. Marking unpaid
 * removes the current month's payment row (undo path); marking paid goes
 * through markRentPaid.
 */
export function togglePaymentStatus(
  tenancyId: string,
  recordedByName?: string,
): ActionResult {
  const db = getDb();
  const tenancy = db.tenancies.find((t) => t.id === tenancyId);
  if (!tenancy || tenancy.status !== 'ACTIVE') return err('Tenancy not found.');

  if (tenancy.paymentStatus !== 'PAID') {
    return markRentPaid({ tenancyId, recordedByName });
  }

  const currentMonth = startOfMonth(new Date()).getTime();
  const index = db.payments.findIndex(
    (p) => p.tenancyId === tenancyId && toDate(p.forMonth).getTime() === currentMonth,
  );
  if (index >= 0) db.payments.splice(index, 1);
  tenancy.paymentStatus = 'PENDING';

  notifyDbChanged();
  return ok(undefined);
}

/** WhatsApp rent reminder for one tenancy (delivery mocked). */
export function sendRentReminder(tenancyId: string): ActionResult<{ tenantName: string }> {
  const db = getDb();
  const tenancy = db.tenancies.find((t) => t.id === tenancyId);
  if (!tenancy) return err('Tenancy not found.');
  if (tenancy.paymentStatus === 'PAID') return err('This tenant has already paid.');
  const tenant = db.tenants.find((t) => t.id === tenancy.tenantId);
  return ok({ tenantName: tenant?.fullName ?? 'Tenant' });
}

/** WhatsApp reminder to every unpaid active tenancy (delivery mocked). */
export function remindEveryone(propertyId: string): ActionResult<{ count: number }> {
  const count = getDb().tenancies.filter(
    (t) =>
      t.propertyId === propertyId &&
      t.status === 'ACTIVE' &&
      t.paymentStatus !== 'PAID',
  ).length;
  if (count === 0) return err('Everyone has paid — nothing to remind.');
  return ok({ count });
}

export interface SendInvoiceInput {
  tenancyId: string;
  /** Paise. */
  previousDuePaise?: number;
  /** Paise. */
  extraChargesPaise?: number;
  extraChargesLabel?: string | null;
  /** Paise. */
  discountPaise?: number;
  notes?: string | null;
}

/** Generate this month's invoice for a tenancy and send it (mocked SENT). */
export function sendInvoice(input: SendInvoiceInput): ActionResult<{ number: string }> {
  const db = getDb();
  const tenancy = db.tenancies.find((t) => t.id === input.tenancyId);
  if (!tenancy || tenancy.status !== 'ACTIVE') return err('Tenancy not found.');
  const property = db.properties.find((p) => p.id === tenancy.propertyId);
  if (!property) return err('Property not found.');

  const now = new Date();
  const invoice = createInvoiceRecord(db, {
    tenancy,
    propertySlug: property.slug,
    billingMonth: startOfMonth(now),
    issueDate: now,
    previousDuePaise: input.previousDuePaise ?? 0,
    extraChargesPaise: input.extraChargesPaise ?? 0,
    extraChargesLabel: input.extraChargesLabel ?? null,
    discountPaise: input.discountPaise ?? 0,
    notes: input.notes ?? null,
  });

  const tenant = db.tenants.find((t) => t.id === tenancy.tenantId);
  pushNotification(
    tenancy.propertyId,
    'INVOICE',
    'Invoice sent',
    `${invoice.number} (${formatINR(invoice.totalPaise)}) sent to ${tenant?.fullName ?? 'tenant'} on WhatsApp.`,
  );

  notifyDbChanged();
  return ok({ number: invoice.number });
}

/** Re-send an existing invoice PDF on WhatsApp (mocked). */
export function resendInvoice(invoiceId: string): ActionResult {
  const db = getDb();
  const invoice = db.invoices.find((i) => i.id === invoiceId);
  if (!invoice) return err('Invoice not found.');
  invoice.status = 'SENT';
  invoice.sentAt = new Date().toISOString();
  notifyDbChanged();
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Complaints
// ---------------------------------------------------------------------------

export interface CreateComplaintInput {
  propertyId: string;
  title: string;
  description?: string | null;
  priority: ComplaintPriority;
  roomId?: string | null;
  tenantId?: string | null;
  assignedToId?: string | null;
}

export function createComplaint(input: CreateComplaintInput): ActionResult<{ id: string }> {
  const title = input.title.trim();
  if (!title) return err('Title is required.');

  const db = getDb();
  const now = new Date().toISOString();
  const id = newId('complaint');
  db.complaints.push({
    id,
    propertyId: input.propertyId,
    title,
    description: input.description?.trim() || null,
    status: 'OPEN',
    priority: input.priority,
    assignedToId: input.assignedToId ?? null,
    tenantId: input.tenantId ?? null,
    roomId: input.roomId ?? null,
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
  });

  notifyDbChanged();
  return ok({ id });
}

export interface UpdateComplaintInput {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  assignedToId?: string | null;
}

export function updateComplaint(
  complaintId: string,
  patch: UpdateComplaintInput,
): ActionResult {
  const db = getDb();
  const complaint = db.complaints.find((c) => c.id === complaintId);
  if (!complaint) return err('Complaint not found.');

  if (patch.status !== undefined) {
    complaint.status = patch.status;
    complaint.resolvedAt = patch.status === 'RESOLVED' ? new Date().toISOString() : null;
  }
  if (patch.priority !== undefined) complaint.priority = patch.priority;
  if (patch.assignedToId !== undefined) complaint.assignedToId = patch.assignedToId;
  complaint.updatedAt = new Date().toISOString();

  notifyDbChanged();
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

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

export function createExpense(input: CreateExpenseInput): ActionResult<{ id: string }> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return err('Amount must be greater than zero.');
  }
  const db = getDb();
  if (!db.expenseCategories.some((c) => c.id === input.categoryId)) {
    return err('Category not found.');
  }

  const id = newId('expense');
  db.expenses.push({
    id,
    propertyId: input.propertyId,
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId ?? null,
    amount: input.amount,
    date: input.date,
    vendor: input.vendor?.trim() || null,
    notes: input.notes?.trim() || null,
    receiptKey: null,
    createdByName: input.createdByName ?? null,
    createdAt: new Date().toISOString(),
  });

  notifyDbChanged();
  return ok({ id });
}

export function deleteExpense(expenseId: string): ActionResult {
  const db = getDb();
  const index = db.expenses.findIndex((e) => e.id === expenseId);
  if (index < 0) return err('Expense not found.');
  db.expenses.splice(index, 1);
  notifyDbChanged();
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Floor manager: occupy / notice / vacate
// ---------------------------------------------------------------------------

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
  recordedByName?: string;
}

/** The primary floor-manager workflow: put a tenant on an empty bed. */
export function assignTenantToBed(input: AssignTenantInput): ActionResult<{ tenantId: string }> {
  const db = getDb();
  const bed = db.beds.find((b) => b.id === input.bedId);
  if (!bed) return err('Bed not found.');
  if (bed.status === 'OCCUPIED') return err('This bed is already occupied.');
  if (!input.fullName.trim()) return err('Tenant name is required.');
  if (!/^\d{10}$/.test(input.phone.replace(/\s/g, ''))) {
    return err('Enter a valid 10-digit phone number.');
  }
  if (!Number.isInteger(input.monthlyRent) || input.monthlyRent <= 0) {
    return err('Monthly rent must be greater than zero.');
  }

  const now = new Date().toISOString();
  const tenant = {
    id: newId('tenant'),
    propertyId: bed.propertyId,
    fullName: input.fullName.trim(),
    phone: input.phone.replace(/\s/g, ''),
    email: input.email?.trim() || null,
    emergencyContact: null,
    fatherName: null,
    motherName: null,
    address: null,
    aadhaarNumber: null,
    panNumber: null,
    college: null,
    company: null,
    occupation: null,
    notes: null,
    photoUrl: null,
    createdAt: now,
  };
  db.tenants.push(tenant);

  const tenancy: Tenancy = {
    id: newId('tenancy'),
    propertyId: bed.propertyId,
    tenantId: tenant.id,
    bedId: bed.id,
    roomId: bed.roomId,
    status: 'ACTIVE',
    monthlyRent: input.monthlyRent,
    maintenanceCharge: input.maintenanceCharge ?? 0,
    securityDeposit: input.securityDeposit ?? null,
    depositStatus: 'PENDING',
    paymentStatus: input.paymentStatus,
    paymentDueDay: toDate(input.checkInDate).getDate() <= 28 ? toDate(input.checkInDate).getDate() : 5,
    checkInDate: input.checkInDate,
    noticeGivenDate: null,
    expectedLeavingDate: null,
    checkOutDate: null,
  };
  db.tenancies.push(tenancy);
  bed.status = 'OCCUPIED';

  if (input.paymentStatus === 'PAID') {
    tenancy.paymentStatus = 'PENDING';
    markRentPaid({ tenancyId: tenancy.id, recordedByName: input.recordedByName });
  }

  const room = db.rooms.find((r) => r.id === bed.roomId);
  pushNotification(
    bed.propertyId,
    'TENANT',
    'Tenant checked in',
    `${tenant.fullName} moved into ${room ? `Room ${room.number} · Bed ${bed.label}` : 'a bed'}.`,
  );

  notifyDbChanged();
  return ok({ tenantId: tenant.id });
}

/** Record that the tenant served notice today; vacate-by is +15 days. */
export function giveNotice(tenancyId: string): ActionResult<{ vacateBy: string }> {
  const db = getDb();
  const tenancy = db.tenancies.find((t) => t.id === tenancyId);
  if (!tenancy || tenancy.status !== 'ACTIVE') return err('Tenancy not found.');
  if (tenancy.noticeGivenDate) return err('Notice has already been given.');

  const now = new Date();
  tenancy.noticeGivenDate = now.toISOString();
  tenancy.expectedLeavingDate = vacateByDate(now).toISOString();

  notifyDbChanged();
  return ok({ vacateBy: tenancy.expectedLeavingDate });
}

/**
 * End the tenancy and free the bed. The deposit outcome follows the notice
 * rule: refundable only when notice was served and the full 15-day period ran.
 */
export function vacateBed(tenancyId: string): ActionResult<{ depositStatus: string }> {
  const db = getDb();
  const tenancy = db.tenancies.find((t) => t.id === tenancyId);
  if (!tenancy || tenancy.status !== 'ACTIVE') return err('Tenancy not found.');

  const now = new Date();
  tenancy.status = 'ENDED';
  tenancy.checkOutDate = now.toISOString();
  tenancy.depositStatus = resolveDepositStatusOnVacate(tenancy.noticeGivenDate, now);

  const bed = db.beds.find((b) => b.id === tenancy.bedId);
  if (bed) bed.status = 'AVAILABLE';

  const tenant = db.tenants.find((t) => t.id === tenancy.tenantId);
  pushNotification(
    tenancy.propertyId,
    'TENANT',
    'Bed vacated',
    `${tenant?.fullName ?? 'Tenant'} checked out. Deposit: ${tenancy.depositStatus.toLowerCase()}.`,
  );

  notifyDbChanged();
  return ok({ depositStatus: tenancy.depositStatus });
}

// ---------------------------------------------------------------------------
// Tenants
// ---------------------------------------------------------------------------

/** Hard-delete a tenant and their history; frees any active bed. */
export function deleteTenant(tenantId: string): ActionResult {
  const db = getDb();
  const index = db.tenants.findIndex((t) => t.id === tenantId);
  if (index < 0) return err('Tenant not found.');

  for (const tenancy of db.tenancies.filter((t) => t.tenantId === tenantId)) {
    if (tenancy.status === 'ACTIVE') {
      const bed = db.beds.find((b) => b.id === tenancy.bedId);
      if (bed) bed.status = 'AVAILABLE';
    }
  }
  db.tenancies = db.tenancies.filter((t) => t.tenantId !== tenantId);
  db.payments = db.payments.filter((p) => p.tenantId !== tenantId);
  db.invoices = db.invoices.filter((i) => i.tenantId !== tenantId);
  db.tenants.splice(index, 1);

  notifyDbChanged();
  return ok(undefined);
}

/**
 * Send the property's house rules to a tenant on WhatsApp (mocked).
 * Mirrors the web rule: unavailable until an admin sets rulesText in Settings.
 */
export function sendRules(tenantId: string): ActionResult<{ tenantName: string }> {
  const db = getDb();
  const tenant = db.tenants.find((t) => t.id === tenantId);
  if (!tenant) return err('Tenant not found.');
  const property = db.properties.find((p) => p.id === tenant.propertyId);
  if (!property?.rulesText) {
    return err('No house rules set. Add them in Settings first.');
  }
  return ok({ tenantName: tenant.fullName });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface UpdatePropertySettingsInput {
  name: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  rulesText?: string | null;
}

export function updatePropertySettings(
  propertyId: string,
  input: UpdatePropertySettingsInput,
): ActionResult {
  const db = getDb();
  const property = db.properties.find((p) => p.id === propertyId);
  if (!property) return err('Property not found.');
  if (!input.name.trim()) return err('Property name is required.');

  property.name = input.name.trim();
  property.address = input.address?.trim() || null;
  property.city = input.city?.trim() || null;
  property.phone = input.phone?.trim() || null;
  property.rulesText = input.rulesText?.trim() || null;

  notifyDbChanged();
  return ok(undefined);
}

export function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): ActionResult {
  const db = getDb();
  if (db.credentials[email] !== currentPassword) {
    return err('Current password is incorrect.');
  }
  if (newPassword.length < 8) {
    return err('New password must be at least 8 characters.');
  }
  db.credentials[email] = newPassword;
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function markNotificationRead(notificationId: string): ActionResult {
  const db = getDb();
  const notification = db.notifications.find((n) => n.id === notificationId);
  if (!notification) return err('Notification not found.');
  notification.read = true;
  notifyDbChanged();
  return ok(undefined);
}

export function markAllNotificationsRead(propertyId: string): ActionResult {
  const db = getDb();
  for (const notification of db.notifications) {
    if (notification.propertyId === propertyId) notification.read = true;
  }
  notifyDbChanged();
  return ok(undefined);
}
