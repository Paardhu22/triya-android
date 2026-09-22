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
  Invoice,
  PaymentMethod,
  PaymentStatus,
  Role,
  Tenancy,
} from '@/types';
import {
  balancePaise,
  bedLocationLabel,
  formatDayMonth,
  formatFullDate,
  formatINR,
  formatMonthYear,
  monthFromKey,
  monthlyDuePaise,
  ordinal,
  resolveDepositStatusOnVacate,
  startOfMonth,
  toDate,
  vacateByDate,
} from '@/utils';
import { createInvoiceRecord, getDb, newId, notifyDbChanged } from './db';
import { recordPayment, refreshPaymentStatus, settleMonth, sumCollected } from './ledger';
import { getCollectionsData, type CollectionRow } from './queries';

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
// Collections (mirrors lib/actions/collections.ts)
// ---------------------------------------------------------------------------

/** Mocked WhatsApp delivery outcome for an invoice (web `deliverInvoice`). */
function deliver(invoice: Invoice, tenantPhone: string | null): boolean {
  if (!tenantPhone) {
    invoice.status = 'FAILED';
    invoice.sentAt = null;
    invoice.lastError = 'Tenant has no phone number on file';
    return false;
  }
  invoice.status = 'SENT';
  invoice.sentAt = new Date().toISOString();
  invoice.lastError = null;
  return true;
}

/** Outcome of the invoice auto-issued for a collection. */
export interface IssuedInvoice {
  number: string | null;
  delivered: boolean;
  error: string | null;
}

/**
 * Issue + send the invoice for one recorded collection (web
 * `issueInvoiceForPayment`): links it to the payment and snapshots what this
 * collection brought in and the month's total so far.
 */
function issueInvoiceForPayment(paymentId: string): IssuedInvoice {
  const db = getDb();
  const payment = db.payments.find((p) => p.id === paymentId);
  const tenancy = payment ? db.tenancies.find((t) => t.id === payment.tenancyId) : null;
  const property = tenancy ? db.properties.find((p) => p.id === tenancy.propertyId) : null;
  if (!payment || !tenancy || !property) {
    return { number: null, delivered: false, error: 'Collection not found' };
  }
  const tenant = db.tenants.find((t) => t.id === tenancy.tenantId);
  const invoice = createInvoiceRecord(db, {
    tenancy,
    propertySlug: property.slug,
    billingMonth: toDate(payment.forMonth),
    issueDate: new Date(),
    paymentId: payment.id,
    receivedPaise: payment.amount,
  });
  const delivered = deliver(invoice, tenant?.phone ?? null);
  return { number: invoice.number, delivered, error: invoice.lastError };
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

/**
 * Record one rent collection — the money actually received, how (cash /
 * online / both) and when. A month can take several collections, so each is
 * its own Payment row and the tenancy snapshot is re-derived from the ledger.
 * The collection is committed FIRST: an invoice failure never loses it.
 */
export function collectRent(input: CollectRentInput): ActionResult<CollectRentResult> {
  const db = getDb();
  const tenancy = db.tenancies.find((t) => t.id === input.tenancyId && t.status === 'ACTIVE');
  if (!tenancy) return err('Active tenancy not found for this property');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.forMonth)) return err('Select a billing month');
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return err('Enter the amount collected');
  }
  if (input.amount > 1_000_000_000) return err('Amount is too large');
  if (input.method === 'SPLIT') {
    const cash = input.cashAmount ?? 0;
    const online = input.onlineAmount ?? 0;
    // Guard the invariant the reports rely on: the split reconstructs the total.
    if (cash + online !== input.amount) {
      return err(`Cash + online must add up to ${formatINR(input.amount)}`);
    }
  }
  const at = toDate(input.collectedAt);
  if (Number.isNaN(at.getTime())) return err('Select when the payment was collected');
  if (at.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    return err('The collection date cannot be in the future');
  }

  const forMonth = monthFromKey(input.forMonth);
  // Rent cannot be owed for a month before the tenant moved in.
  if (forMonth < startOfMonth(tenancy.checkInDate)) {
    return err(
      `The tenant moved in on ${formatFullDate(tenancy.checkInDate)} — pick ${formatMonthYear(tenancy.checkInDate)} or later.`,
    );
  }

  const payment = recordPayment(db, {
    tenancy,
    amount: input.amount,
    forMonth,
    method: input.method,
    cashPaise: input.cashAmount,
    onlinePaise: input.onlineAmount,
    at,
    notes: input.notes?.trim() || null,
    recordedByName: input.recordedByName ?? null,
  });
  refreshPaymentStatus(db, tenancy);

  const invoice = input.sendInvoice ? issueInvoiceForPayment(payment.id) : null;

  const tenant = db.tenants.find((t) => t.id === tenancy.tenantId);
  pushNotification(
    tenancy.propertyId,
    'PAYMENT',
    'Rent received',
    `${tenant?.fullName ?? 'Tenant'} paid ${formatINR(input.amount)} for ${formatMonthYear(forMonth)}.`,
  );

  notifyDbChanged();
  const remaining = balancePaise(monthlyDuePaise(tenancy), sumCollected(db, tenancy.id, forMonth));
  return ok({ paymentId: payment.id, balancePaise: remaining, fullyPaid: remaining === 0, invoice });
}

/**
 * Delete a wrongly entered collection and re-derive the tenancy snapshot.
 * ADMIN/MANAGER only. An invoice already issued for it is kept (its link to
 * the payment is cleared) so the record of what was sent survives.
 */
export function deleteRentCollection(paymentId: string, role: Role | undefined): ActionResult {
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return err('Only an admin or manager can delete a collection');
  }
  const db = getDb();
  const index = db.payments.findIndex((p) => p.id === paymentId);
  if (index < 0) return err('Collection not found');
  const [payment] = db.payments.splice(index, 1);
  for (const invoice of db.invoices) {
    if (invoice.paymentId === payment.id) invoice.paymentId = null;
  }
  const tenancy = db.tenancies.find((t) => t.id === payment.tenancyId);
  if (tenancy) refreshPaymentStatus(db, tenancy);
  notifyDbChanged();
  return ok(undefined);
}

/** Reminder copy for one row — states that tenant's own balance (web `buildReminderBody`). */
export function buildReminderBody(row: CollectionRow, propertyName: string, isFlat: boolean): string {
  const room = bedLocationLabel(row.roomNumber, row.bedLabel, isFlat);
  const month = formatMonthYear(monthFromKey(row.month));
  const lines = [`Hi ${row.tenant.fullName},`, ''];
  if (row.outstandingPaise > 0) {
    lines.push(
      `This is a friendly reminder that ${formatINR(row.outstandingPaise)} of your rent for ${room} is pending.`,
      '',
    );
    if (row.balancePaise > 0) {
      lines.push(
        row.collectedPaise > 0
          ? `${month}: ${formatINR(row.collectedPaise)} of ${formatINR(row.duePaise)} paid — ${formatINR(row.balancePaise)} due by ${formatDayMonth(row.dueDate)}.`
          : `${month}: ${formatINR(row.duePaise)} due by ${formatDayMonth(row.dueDate)}.`,
      );
    }
    if (row.earlierDuePaise > 0) {
      lines.push(`Earlier months: ${formatINR(row.earlierDuePaise)} unpaid.`);
    }
    lines.push(
      '',
      'Kindly make the payment at your earliest convenience. Please ignore this message if you have already paid.',
    );
  } else {
    lines.push(
      `This is a reminder that your monthly rent for ${room} is ${formatINR(row.duePaise)}, due by the ${ordinal(toDate(row.dueDate).getDate())} of each month.`,
      '',
      `Your rent for ${month} has already been received in full — thank you!`,
    );
  }
  lines.push('', 'Thank you,', propertyName);
  return lines.join('\n');
}

/** WhatsApp rent reminder for one tenancy. Refused when nothing is outstanding. */
export function sendRentReminder(tenancyId: string): ActionResult<{ tenantName: string }> {
  const db = getDb();
  const tenancy = db.tenancies.find((t) => t.id === tenancyId && t.status === 'ACTIVE');
  if (!tenancy) return err('Active tenancy not found for this property');
  const row = getCollectionsData(tenancy.propertyId).find((r) => r.id === tenancyId);
  if (!row) return err('Active tenancy not found for this property');
  if (row.outstandingPaise === 0) return err('This tenant has no rent outstanding');
  if (!row.tenant.phone) return err('Tenant has no phone number on file');
  return ok({ tenantName: row.tenant.fullName });
}

export interface ReminderBatchResult {
  sent: number;
  failed: number;
  skipped: number;
  /** Rows the batch targeted. */
  eligible: number;
}

function sendReminders(rows: CollectionRow[]): ReminderBatchResult {
  let sent = 0;
  let skipped = 0;
  for (const row of rows) {
    if (!row.tenant.phone) skipped++;
    else sent++;
  }
  return { sent, failed: 0, skipped, eligible: rows.length };
}

/** Remind every active tenant; each message states that tenant's own position. */
export function remindAllTenants(propertyId: string): ActionResult<ReminderBatchResult> {
  return ok(sendReminders(getCollectionsData(propertyId)));
}

/**
 * Remind ONLY tenants with rent outstanding — an unpaid or part-paid current
 * month, or an unpaid earlier month. Fully paid tenants are left alone.
 */
export function remindPendingTenants(propertyId: string): ActionResult<ReminderBatchResult> {
  return ok(sendReminders(getCollectionsData(propertyId).filter((r) => r.outstandingPaise > 0)));
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

/**
 * Send a bill BEFORE payment (the manual Send Invoice). Recording a collection
 * already issues its own invoice. The row is kept as FAILED when delivery
 * fails, so it can be resent from Invoice History.
 */
export function sendInvoice(input: SendInvoiceInput): ActionResult<{ number: string }> {
  const db = getDb();
  const tenancy = db.tenancies.find((t) => t.id === input.tenancyId && t.status === 'ACTIVE');
  if (!tenancy) return err('Active tenancy not found for this property');
  const property = db.properties.find((p) => p.id === tenancy.propertyId);
  if (!property) return err('Property not found.');
  const tenant = db.tenants.find((t) => t.id === tenancy.tenantId);
  if (!tenant?.phone) return err('Tenant has no phone number on file');

  const billingMonth = input.billingMonth ? monthFromKey(input.billingMonth) : startOfMonth(new Date());
  const invoice = createInvoiceRecord(db, {
    tenancy,
    propertySlug: property.slug,
    billingMonth,
    issueDate: new Date(),
    previousDuePaise: input.previousDuePaise ?? 0,
    extraChargesPaise: input.extraChargesPaise ?? 0,
    extraChargesLabel: input.extraChargesLabel ?? null,
    discountPaise: input.discountPaise ?? 0,
    notes: input.notes ?? null,
  });
  deliver(invoice, tenant.phone);

  pushNotification(
    tenancy.propertyId,
    'INVOICE',
    'Invoice sent',
    `${invoice.number} (${formatINR(invoice.totalPaise)}) sent to ${tenant.fullName} on WhatsApp.`,
  );

  notifyDbChanged();
  return ok({ number: invoice.number });
}

/** Re-send an existing invoice PDF on WhatsApp (mocked). */
export function resendInvoice(invoiceId: string): ActionResult {
  const db = getDb();
  const invoice = db.invoices.find((i) => i.id === invoiceId);
  if (!invoice) return err('Invoice not found');
  const tenant = db.tenants.find((t) => t.id === invoice.tenantId);
  const delivered = deliver(invoice, tenant?.phone ?? null);
  notifyDbChanged();
  return delivered ? ok(undefined) : err(invoice.lastError ?? 'Failed to resend the invoice');
}

// ---------------------------------------------------------------------------
// Rooms (mirrors lib/actions/rooms.ts)
// ---------------------------------------------------------------------------

export interface SetRoomRentInput {
  roomId: string;
  /** Paise; null clears the room default. */
  rent: number | null;
  /** Paise; null clears the room default. */
  maintenance: number | null;
  /** Also push the new amounts onto every ACTIVE tenancy in the room. */
  applyToOccupants: boolean;
}

/**
 * Set a room's rent once instead of typing it into every bed. Stored as room
 * defaults that pre-fill a new move-in, optionally pushed onto the current
 * occupants. ADMIN/MANAGER only.
 */
export function setRoomRent(
  input: SetRoomRentInput,
  role: Role | undefined,
): ActionResult<{ updatedTenancies: number }> {
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return err('Administrator or manager access required');
  }
  for (const value of [input.rent, input.maintenance]) {
    if (value !== null && (!Number.isInteger(value) || value < 0)) {
      return err('Enter a valid amount');
    }
  }
  if (input.applyToOccupants && input.rent === null) {
    return err('Enter a rent amount before applying it to the current occupants');
  }
  const db = getDb();
  const room = db.rooms.find((r) => r.id === input.roomId);
  if (!room) return err('Room not found');

  room.defaultRent = input.rent;
  room.defaultMaintenance = input.maintenance;

  let updatedTenancies = 0;
  if (input.applyToOccupants && input.rent !== null) {
    for (const tenancy of db.tenancies) {
      if (tenancy.roomId !== room.id || tenancy.status !== 'ACTIVE') continue;
      tenancy.monthlyRent = input.rent;
      tenancy.maintenanceCharge = input.maintenance ?? 0;
      // Changing what is owed changes whether the month is settled.
      refreshPaymentStatus(db, tenancy);
      updatedTenancies++;
    }
  }

  notifyDbChanged();
  return ok({ updatedTenancies });
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
  /** How the first cycle was received, when paymentStatus is PAID. */
  paymentMethod?: PaymentMethod;
  /** Paise. Required when paymentMethod is SPLIT. */
  cashAmount?: number;
  /** Paise. Required when paymentMethod is SPLIT. */
  onlineAmount?: number;
  recordedByName?: string;
}

/** The primary floor-manager workflow: put a tenant on an empty bed. */
export function assignTenantToBed(
  input: AssignTenantInput,
): ActionResult<{ tenantId: string; invoice: IssuedInvoice | null }> {
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
  if (Number.isNaN(toDate(input.checkInDate).getTime())) {
    return err('Enter a valid check-in date.');
  }
  if (input.paymentStatus === 'PAID' && input.paymentMethod === 'SPLIT') {
    const total = input.monthlyRent + (input.maintenanceCharge ?? 0);
    if ((input.cashAmount ?? 0) + (input.onlineAmount ?? 0) !== total) {
      return err('Split amounts must add up to the total due.');
    }
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
    createdAt: now,
  };
  db.tenancies.push(tenancy);
  bed.status = 'OCCUPIED';

  // Marking the first cycle Paid records whatever is outstanding for the month
  // as a collection (web `settleMonth`), then issues its invoice; the snapshot
  // is always re-derived from the ledger.
  let invoice: IssuedInvoice | null = null;
  if (input.paymentStatus === 'PAID') {
    const paymentId = settleMonth(db, {
      tenancy,
      forMonth: startOfMonth(new Date()),
      method: input.paymentMethod ?? 'CASH',
      cashPaise: input.cashAmount,
      onlinePaise: input.onlineAmount,
      recordedByName: input.recordedByName ?? null,
      at: new Date(),
    });
    if (paymentId) invoice = issueInvoiceForPayment(paymentId);
  }
  refreshPaymentStatus(db, tenancy);

  const room = db.rooms.find((r) => r.id === bed.roomId);
  const isFlat = db.properties.find((p) => p.id === bed.propertyId)?.isFlat ?? false;
  pushNotification(
    bed.propertyId,
    'TENANT',
    'Tenant checked in',
    `${tenant.fullName} moved into ${room ? bedLocationLabel(room.number, bed.label, isFlat) : 'a bed'}.`,
  );

  notifyDbChanged();
  return ok({ tenantId: tenant.id, invoice });
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
