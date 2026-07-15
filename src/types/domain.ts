/**
 * Triya Manager -- Domain Model
 *
 * Mirrors the backend Prisma schema (triya-manager/prisma/schema.prisma).
 * The mobile app is a frontend over the same backend, so these shapes are the
 * single source of truth for what the API will eventually return.
 *
 * Conventions preserved from the backend:
 * - All monetary amounts are integer PAISE (1 rupee = 100 paise).
 * - Dates are ISO-8601 strings (serialization-safe; parse with utils/date).
 * - Vacating a bed ENDs the tenancy rather than deleting it (history kept).
 */

// ---------------------------------------------------------------------------
// Enums (string unions matching the backend Prisma enums)
// ---------------------------------------------------------------------------

export type Role = 'ADMIN' | 'MANAGER' | 'STAFF';

export type BedStatus = 'AVAILABLE' | 'OCCUPIED';

export type TenancyStatus = 'ACTIVE' | 'ENDED';

export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE';

export type PaymentMethod = 'CASH' | 'ONLINE' | 'SPLIT';

export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type DepositStatus = 'PENDING' | 'REFUNDABLE' | 'FORFEITED' | 'ADJUSTED';

export type DocumentType =
  | 'AADHAAR_FRONT'
  | 'AADHAAR_BACK'
  | 'PAN'
  | 'PHOTO'
  | 'AGREEMENT'
  | 'OTHER';

export type InvoiceStatus = 'SENT' | 'FAILED';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  /** Non-admin accounts are scoped to a single property. ADMIN leaves this null. */
  propertyId: string | null;
}

// ---------------------------------------------------------------------------
// Property structure
// ---------------------------------------------------------------------------

export interface Property {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  /** Contact number shown on invoices. */
  phone: string | null;
  /** Free-text house rules, sent verbatim over WhatsApp from the tenants page. */
  rulesText: string | null;
  /** When true the property is organised into blocks (e.g. Frieden A / B). */
  hasBlocks: boolean;
  /**
   * When true the property rents self-contained flats/studios (no per-bed
   * sharing), so the UI shows "Flat 101" instead of "Room 101 · Bed A".
   */
  isFlat: boolean;
  isActive: boolean;
}

export interface Block {
  id: string;
  propertyId: string;
  name: string; // "A", "B"
  order: number;
}

export interface Floor {
  id: string;
  propertyId: string;
  blockId: string | null;
  number: number;
  name: string | null;
  order: number;
}

export interface Room {
  id: string;
  propertyId: string;
  floorId: string;
  number: string; // "301", "A101"
  label: string | null;
  /** Configured number of beds in the room. */
  sharingType: number;
  order: number;
}

export interface Bed {
  id: string;
  propertyId: string;
  roomId: string;
  label: string; // "A", "B" — bed identifier within the room
  status: BedStatus;
  order: number;
}

// ---------------------------------------------------------------------------
// People & occupancy
// ---------------------------------------------------------------------------

export interface Tenant {
  id: string;
  propertyId: string;
  fullName: string;
  phone: string;
  email: string | null;
  emergencyContact: string | null;
  fatherName: string | null;
  motherName: string | null;
  address: string | null;
  aadhaarNumber: string | null;
  panNumber: string | null;
  college: string | null;
  company: string | null;
  occupation: string | null;
  notes: string | null;
  /** Primary KYC photo storage key (served by the backend files route). */
  photoUrl: string | null;
  createdAt: string;
}

/**
 * A single occupancy of a bed by a tenant. Vacating ends the tenancy
 * (status ENDED + checkOutDate) rather than deleting it.
 */
export interface Tenancy {
  id: string;
  propertyId: string;
  tenantId: string;
  bedId: string;
  roomId: string;
  status: TenancyStatus;
  /** Paise. */
  monthlyRent: number;
  /** Paise. Extra monthly charge on top of rent. */
  maintenanceCharge: number;
  /** Paise. Net of the ₹1000 maintenance reserve deducted at move-in. */
  securityDeposit: number | null;
  depositStatus: DepositStatus;
  /** Current-cycle snapshot shown on the bed. */
  paymentStatus: PaymentStatus;
  /** Day of month rent is due (1-31). */
  paymentDueDay: number | null;
  checkInDate: string;
  /** When the tenant gave notice; vacate-by is +15 days. */
  noticeGivenDate: string | null;
  expectedLeavingDate: string | null;
  checkOutDate: string | null;
}

export interface Payment {
  id: string;
  propertyId: string;
  tenancyId: string;
  tenantId: string;
  /** Paise. */
  amount: number;
  /** First day of the month this payment covers (ISO). */
  forMonth: string;
  status: PaymentStatus;
  method: PaymentMethod;
  /** Paise. Only for SPLIT payments. */
  cashAmount: number | null;
  /** Paise. Only for SPLIT payments. */
  onlineAmount: number | null;
  paidAt: string | null;
  notes: string | null;
  /** Name of the staff member who recorded the payment. */
  recordedByName: string | null;
  createdAt: string;
}

export interface TenantDocument {
  id: string;
  tenantId: string;
  type: DocumentType;
  storageKey: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

/**
 * A generated rent invoice. The charge breakdown is snapshotted in paise at
 * send time so historical invoices stay accurate even if rent later changes.
 */
export interface Invoice {
  id: string;
  propertyId: string;
  tenancyId: string;
  tenantId: string;
  /** Human-facing, e.g. "INV-202607-0001"; unique per property. */
  number: string;
  /** First day of the billed month (ISO). */
  billingMonth: string;
  issueDate: string;
  dueDate: string | null;
  rentPaise: number;
  maintenancePaise: number;
  previousDuePaise: number;
  extraChargesPaise: number;
  extraChargesLabel: string | null;
  discountPaise: number;
  subtotalPaise: number;
  totalPaise: number;
  notes: string | null;
  /** PDF path within the backend storage driver. */
  storageKey: string;
  status: InvoiceStatus;
  sentAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export interface Complaint {
  id: string;
  propertyId: string;
  title: string;
  description: string | null;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assignedToId: string | null;
  tenantId: string | null;
  roomId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface Expense {
  id: string;
  propertyId: string;
  categoryId: string;
  subcategoryId: string | null;
  /** Paise. */
  amount: number;
  date: string;
  vendor: string | null;
  notes: string | null;
  /** Storage key for the receipt file (null when no receipt attached). */
  receiptKey: string | null;
  /** Name of the staff member who created the expense. */
  createdByName: string | null;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  propertyId: string;
  name: string;
}

export interface ExpenseSubcategory {
  id: string;
  propertyId: string;
  categoryId: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Notifications (mobile-side concept; backed by push notifications later)
// ---------------------------------------------------------------------------

export type NotificationKind =
  | 'PAYMENT'
  | 'COMPLAINT'
  | 'TENANT'
  | 'INVOICE'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  propertyId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}
