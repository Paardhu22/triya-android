/**
 * Read API over the mock database.
 *
 * Function names, scoping and returned shapes mirror the web app's
 * src/lib/queries layer so backend integration is a drop-in replacement:
 * every function here corresponds to a real server query.
 */

import type {
  AppNotification,
  Bed,
  BedStatus,
  Complaint,
  Expense,
  Invoice,
  Payment,
  PaymentStatus,
  Property,
  Room,
  Tenancy,
  Tenant,
  User,
} from '@/types';
import { isSameMonth, startOfMonth, toDate } from '@/utils';
import { getDb } from './db';

// ---------------------------------------------------------------------------
// Auth & properties
// ---------------------------------------------------------------------------

export interface LoginUser {
  name: string;
  email: string;
  role: User['role'];
}

/** The accounts offered in the login screen's user dropdown (as on the web). */
export function listLoginUsers(): LoginUser[] {
  return getDb()
    .users.filter((u) => u.isActive)
    .map(({ name, email, role }) => ({ name, email, role }));
}

/** Credentials check. Returns the user on success, null on bad credentials. */
export function authenticate(email: string, password: string): User | null {
  const db = getDb();
  const user = db.users.find((u) => u.email === email && u.isActive);
  if (!user) return null;
  return db.credentials[email] === password ? { ...user } : null;
}

/**
 * Properties the signed-in user can manage: ADMIN sees every active property,
 * property-scoped staff see only their own.
 */
export function listPropertiesFor(user: User): Property[] {
  const db = getDb();
  const properties = db.properties.filter((p) => p.isActive);
  if (user.role === 'ADMIN') return properties.map((p) => ({ ...p }));
  return properties.filter((p) => p.id === user.propertyId).map((p) => ({ ...p }));
}

export function getProperty(propertyId: string): Property | null {
  const found = getDb().properties.find((p) => p.id === propertyId);
  return found ? { ...found } : null;
}

/** Occupancy stats used by the property picker cards. */
export interface PropertyStats {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
}

export function getPropertyStats(propertyId: string): PropertyStats {
  const db = getDb();
  const beds = db.beds.filter((b) => b.propertyId === propertyId);
  return {
    totalRooms: db.rooms.filter((r) => r.propertyId === propertyId).length,
    totalBeds: beds.length,
    occupiedBeds: beds.filter((b) => b.status === 'OCCUPIED').length,
  };
}

// ---------------------------------------------------------------------------
// Dashboard (mirrors lib/queries/dashboard.ts)
// ---------------------------------------------------------------------------

export interface RecentPayment {
  id: string;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  tenantName: string;
}

export interface RecentComplaint {
  id: string;
  title: string;
  status: Complaint['status'];
  priority: Complaint['priority'];
  createdAt: string;
  tenantName: string | null;
}

export interface SharingBreakdownRow {
  sharingType: number;
  rooms: number;
  beds: number;
  occupied: number;
  available: number;
}

export interface BlockBreakdownRow {
  name: string;
  rooms: number;
  beds: number;
  occupied: number;
  available: number;
}

export interface DashboardData {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  paidCount: number;
  pendingCount: number;
  /** Paise. Sum of PAID payments recorded this month. */
  monthlyCollections: number;
  /** Paise. Sum of expenses dated this month. */
  monthlyExpenses: number;
  recentPayments: RecentPayment[];
  recentComplaints: RecentComplaint[];
  sharingBreakdown: SharingBreakdownRow[];
  blockBreakdown: BlockBreakdownRow[];
}

export function getDashboardData(propertyId: string): DashboardData {
  const db = getDb();
  const now = new Date();

  const rooms = db.rooms.filter((r) => r.propertyId === propertyId);
  const beds = db.beds.filter((b) => b.propertyId === propertyId);
  const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED').length;

  const activeTenancies = db.tenancies.filter(
    (t) => t.propertyId === propertyId && t.status === 'ACTIVE',
  );
  const paidCount = activeTenancies.filter((t) => t.paymentStatus === 'PAID').length;
  const pendingCount = activeTenancies.filter(
    (t) => t.paymentStatus === 'PENDING' || t.paymentStatus === 'OVERDUE',
  ).length;

  const monthlyCollections = db.payments
    .filter(
      (p) =>
        p.propertyId === propertyId &&
        p.status === 'PAID' &&
        isSameMonth(p.createdAt, now),
    )
    .reduce((sum, p) => sum + p.amount, 0);

  const monthlyExpenses = db.expenses
    .filter((e) => e.propertyId === propertyId && isSameMonth(e.date, now))
    .reduce((sum, e) => sum + e.amount, 0);

  const tenantById = new Map(db.tenants.map((t) => [t.id, t]));

  const recentPayments: RecentPayment[] = db.payments
    .filter((p) => p.propertyId === propertyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      createdAt: p.createdAt,
      tenantName: tenantById.get(p.tenantId)?.fullName ?? 'Unknown',
    }));

  const recentComplaints: RecentComplaint[] = db.complaints
    .filter((c) => c.propertyId === propertyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      priority: c.priority,
      createdAt: c.createdAt,
      tenantName: c.tenantId ? tenantById.get(c.tenantId)?.fullName ?? null : null,
    }));

  // Sharing + block breakdowns (grouped in memory, as on the web).
  const floorById = new Map(db.floors.map((f) => [f.id, f]));
  const blockById = new Map(db.blocks.map((b) => [b.id, b]));
  const bedsByRoom = new Map<string, Bed[]>();
  for (const bed of beds) {
    const list = bedsByRoom.get(bed.roomId) ?? [];
    list.push(bed);
    bedsByRoom.set(bed.roomId, list);
  }

  const sharingMap = new Map<number, SharingBreakdownRow>();
  const blockMap = new Map<string, BlockBreakdownRow>();

  for (const room of rooms) {
    const roomBeds = bedsByRoom.get(room.id) ?? [];
    const occupied = roomBeds.filter((b) => b.status === 'OCCUPIED').length;
    const available = roomBeds.length - occupied;

    const sharing =
      sharingMap.get(room.sharingType) ??
      { sharingType: room.sharingType, rooms: 0, beds: 0, occupied: 0, available: 0 };
    sharing.rooms += 1;
    sharing.beds += roomBeds.length;
    sharing.occupied += occupied;
    sharing.available += available;
    sharingMap.set(room.sharingType, sharing);

    const floor = floorById.get(room.floorId);
    const block = floor?.blockId ? blockById.get(floor.blockId) : null;
    if (block) {
      const row =
        blockMap.get(block.id) ??
        { name: block.name, rooms: 0, beds: 0, occupied: 0, available: 0 };
      row.rooms += 1;
      row.beds += roomBeds.length;
      row.occupied += occupied;
      row.available += available;
      blockMap.set(block.id, row);
    }
  }

  return {
    totalRooms: rooms.length,
    totalBeds: beds.length,
    occupiedBeds,
    availableBeds: beds.length - occupiedBeds,
    paidCount,
    pendingCount,
    monthlyCollections,
    monthlyExpenses,
    recentPayments,
    recentComplaints,
    sharingBreakdown: [...sharingMap.values()].sort((a, b) => a.sharingType - b.sharingType),
    blockBreakdown: [...blockMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

// ---------------------------------------------------------------------------
// Floor manager (mirrors lib/queries/floor.ts)
// ---------------------------------------------------------------------------

export interface FloorOption {
  id: string;
  number: number;
  name: string | null;
}

export interface FloorNavigation {
  hasBlocks: boolean;
  blocks: { id: string; name: string; floors: FloorOption[] }[];
  floors: FloorOption[];
}

export function getFloorNavigation(propertyId: string): FloorNavigation {
  const db = getDb();
  const property = db.properties.find((p) => p.id === propertyId);
  const toOption = ({ id, number, name }: { id: string; number: number; name: string | null }) =>
    ({ id, number, name });

  const blocks = db.blocks
    .filter((b) => b.propertyId === propertyId)
    .sort((a, b) => a.order - b.order)
    .map((block) => ({
      id: block.id,
      name: block.name,
      floors: db.floors
        .filter((f) => f.blockId === block.id)
        .sort((a, b) => a.number - b.number)
        .map(toOption),
    }));

  const floors = db.floors
    .filter((f) => f.propertyId === propertyId && f.blockId === null)
    .sort((a, b) => a.number - b.number)
    .map(toOption);

  return { hasBlocks: property?.hasBlocks ?? false, blocks, floors };
}

export interface FloorBedTenant {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
}

export interface FloorBed {
  id: string;
  label: string;
  status: BedStatus;
  tenancy:
    | {
        id: string;
        paymentStatus: PaymentStatus;
        monthlyRent: number;
        maintenanceCharge: number;
        securityDeposit: number | null;
        noticeGivenDate: string | null;
        expectedLeavingDate: string | null;
        paymentDueDay: number | null;
        checkInDate: string;
        tenant: FloorBedTenant;
      }
    | null;
}

export interface FloorRoom {
  id: string;
  number: string;
  label: string | null;
  sharingType: number;
  beds: FloorBed[];
}

function toFloorBed(db: ReturnType<typeof getDb>, bed: Bed): FloorBed {
  const tenancy = db.tenancies.find((t) => t.bedId === bed.id && t.status === 'ACTIVE');
  const tenant = tenancy ? db.tenants.find((t) => t.id === tenancy.tenantId) : null;
  return {
    id: bed.id,
    label: bed.label,
    status: bed.status,
    tenancy:
      tenancy && tenant
        ? {
            id: tenancy.id,
            paymentStatus: tenancy.paymentStatus,
            monthlyRent: tenancy.monthlyRent,
            maintenanceCharge: tenancy.maintenanceCharge,
            securityDeposit: tenancy.securityDeposit,
            noticeGivenDate: tenancy.noticeGivenDate,
            expectedLeavingDate: tenancy.expectedLeavingDate,
            paymentDueDay: tenancy.paymentDueDay,
            checkInDate: tenancy.checkInDate,
            tenant: {
              id: tenant.id,
              fullName: tenant.fullName,
              phone: tenant.phone,
              email: tenant.email,
              photoUrl: tenant.photoUrl,
            },
          }
        : null,
  };
}

/** Full room/bed layout for a floor, including the active tenant on each bed. */
export function getFloorLayout(floorId: string): FloorRoom[] {
  const db = getDb();
  return db.rooms
    .filter((r) => r.floorId === floorId)
    .sort((a, b) => a.order - b.order)
    .map((room) => ({
      id: room.id,
      number: room.number,
      label: room.label,
      sharingType: room.sharingType,
      beds: db.beds
        .filter((b) => b.roomId === room.id)
        .sort((a, b) => a.order - b.order)
        .map((bed) => toFloorBed(db, bed)),
    }));
}

export interface RoomDetail extends FloorRoom {
  floorNumber: number;
  floorName: string | null;
  blockName: string | null;
  propertyId: string;
}

export function getRoomDetail(roomId: string): RoomDetail | null {
  const db = getDb();
  const room = db.rooms.find((r) => r.id === roomId);
  if (!room) return null;
  const floor = db.floors.find((f) => f.id === room.floorId);
  const block = floor?.blockId ? db.blocks.find((b) => b.id === floor.blockId) : null;
  return {
    id: room.id,
    number: room.number,
    label: room.label,
    sharingType: room.sharingType,
    floorNumber: floor?.number ?? 0,
    floorName: floor?.name ?? null,
    blockName: block?.name ?? null,
    propertyId: room.propertyId,
    beds: db.beds
      .filter((b) => b.roomId === room.id)
      .sort((a, b) => a.order - b.order)
      .map((bed) => toFloorBed(db, bed)),
  };
}

// ---------------------------------------------------------------------------
// Tenants (mirrors lib/queries/tenants.ts)
// ---------------------------------------------------------------------------

export interface TenantListItem {
  id: string;
  fullName: string;
  phone: string;
  occupation: string | null;
  photoUrl: string | null;
  createdAt: string;
  /** Present when the tenant currently occupies a bed. */
  active: {
    roomNumber: string;
    bedLabel: string;
    monthlyRent: number;
    paymentStatus: PaymentStatus;
  } | null;
}

export function getTenantList(propertyId: string): TenantListItem[] {
  const db = getDb();
  const roomById = new Map(db.rooms.map((r) => [r.id, r]));
  const bedById = new Map(db.beds.map((b) => [b.id, b]));

  return db.tenants
    .filter((t) => t.propertyId === propertyId)
    .map((tenant) => {
      const active = db.tenancies.find(
        (t) => t.tenantId === tenant.id && t.status === 'ACTIVE',
      );
      const bed = active ? bedById.get(active.bedId) : null;
      const room = active ? roomById.get(active.roomId) : null;
      return {
        id: tenant.id,
        fullName: tenant.fullName,
        phone: tenant.phone,
        occupation: tenant.occupation,
        photoUrl: tenant.photoUrl,
        createdAt: tenant.createdAt,
        active:
          active && bed && room
            ? {
                roomNumber: room.number,
                bedLabel: bed.label,
                monthlyRent: active.monthlyRent,
                paymentStatus: active.paymentStatus,
              }
            : null,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export interface TenantStay {
  id: string;
  roomNumber: string;
  bedLabel: string;
  status: Tenancy['status'];
  monthlyRent: number;
  maintenanceCharge: number;
  securityDeposit: number | null;
  depositStatus: Tenancy['depositStatus'];
  paymentStatus: PaymentStatus;
  paymentDueDay: number | null;
  checkInDate: string;
  checkOutDate: string | null;
  noticeGivenDate: string | null;
  expectedLeavingDate: string | null;
}

export interface TenantProfile {
  tenant: Tenant;
  stays: TenantStay[];
  payments: Payment[];
  /** The ACTIVE stay, when the tenant is current. */
  active: TenantStay | null;
}

export function getTenantProfile(tenantId: string): TenantProfile | null {
  const db = getDb();
  const tenant = db.tenants.find((t) => t.id === tenantId);
  if (!tenant) return null;

  const roomById = new Map(db.rooms.map((r) => [r.id, r]));
  const bedById = new Map(db.beds.map((b) => [b.id, b]));

  const stays: TenantStay[] = db.tenancies
    .filter((t) => t.tenantId === tenantId)
    .sort((a, b) => b.checkInDate.localeCompare(a.checkInDate))
    .map((t) => ({
      id: t.id,
      roomNumber: roomById.get(t.roomId)?.number ?? '?',
      bedLabel: bedById.get(t.bedId)?.label ?? '?',
      status: t.status,
      monthlyRent: t.monthlyRent,
      maintenanceCharge: t.maintenanceCharge,
      securityDeposit: t.securityDeposit,
      depositStatus: t.depositStatus,
      paymentStatus: t.paymentStatus,
      paymentDueDay: t.paymentDueDay,
      checkInDate: t.checkInDate,
      checkOutDate: t.checkOutDate,
      noticeGivenDate: t.noticeGivenDate,
      expectedLeavingDate: t.expectedLeavingDate,
    }));

  const payments = db.payments
    .filter((p) => p.tenantId === tenantId)
    .sort((a, b) => b.forMonth.localeCompare(a.forMonth))
    .map((p) => ({ ...p }));

  return {
    tenant: { ...tenant },
    stays,
    payments,
    active: stays.find((s) => s.status === 'ACTIVE') ?? null,
  };
}

// ---------------------------------------------------------------------------
// Collections (mirrors lib/queries/collections.ts + invoices.ts)
// ---------------------------------------------------------------------------

export interface CollectionRow {
  /** Tenancy id. */
  id: string;
  monthlyRent: number;
  maintenanceCharge: number;
  paymentStatus: PaymentStatus;
  securityDeposit: number | null;
  depositStatus: Tenancy['depositStatus'];
  noticeGivenDate: string | null;
  paymentDueDay: number | null;
  tenant: { id: string; fullName: string; phone: string; email: string | null };
  roomNumber: string;
  bedLabel: string;
  floorNumber: number;
  blockName: string | null;
  /** When the most recent invoice for this tenancy was created (null = never). */
  lastInvoiceAt: string | null;
}

export function getCollections(propertyId: string): CollectionRow[] {
  const db = getDb();
  const tenantById = new Map(db.tenants.map((t) => [t.id, t]));
  const roomById = new Map(db.rooms.map((r) => [r.id, r]));
  const bedById = new Map(db.beds.map((b) => [b.id, b]));
  const floorById = new Map(db.floors.map((f) => [f.id, f]));
  const blockById = new Map(db.blocks.map((b) => [b.id, b]));

  return db.tenancies
    .filter((t) => t.propertyId === propertyId && t.status === 'ACTIVE')
    .map((tenancy) => {
      const tenant = tenantById.get(tenancy.tenantId);
      const room = roomById.get(tenancy.roomId);
      const bed = bedById.get(tenancy.bedId);
      const floor = room ? floorById.get(room.floorId) : null;
      const block = floor?.blockId ? blockById.get(floor.blockId) : null;
      const lastInvoice = db.invoices
        .filter((i) => i.tenancyId === tenancy.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

      return {
        id: tenancy.id,
        monthlyRent: tenancy.monthlyRent,
        maintenanceCharge: tenancy.maintenanceCharge,
        paymentStatus: tenancy.paymentStatus,
        securityDeposit: tenancy.securityDeposit,
        depositStatus: tenancy.depositStatus,
        noticeGivenDate: tenancy.noticeGivenDate,
        paymentDueDay: tenancy.paymentDueDay,
        tenant: {
          id: tenant?.id ?? '',
          fullName: tenant?.fullName ?? 'Unknown',
          phone: tenant?.phone ?? '',
          email: tenant?.email ?? null,
        },
        roomNumber: room?.number ?? '?',
        bedLabel: bed?.label ?? '?',
        floorNumber: floor?.number ?? 0,
        blockName: block?.name ?? null,
        lastInvoiceAt: lastInvoice?.createdAt ?? null,
      };
    })
    .sort((a, b) => a.tenant.fullName.localeCompare(b.tenant.fullName));
}

export interface InvoiceHistoryRow extends Invoice {
  tenantName: string;
  roomNumber: string;
  bedLabel: string;
}

export function getInvoiceHistory(propertyId: string): InvoiceHistoryRow[] {
  const db = getDb();
  const tenantById = new Map(db.tenants.map((t) => [t.id, t]));
  const tenancyById = new Map(db.tenancies.map((t) => [t.id, t]));
  const roomById = new Map(db.rooms.map((r) => [r.id, r]));
  const bedById = new Map(db.beds.map((b) => [b.id, b]));

  return db.invoices
    .filter((i) => i.propertyId === propertyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((invoice) => {
      const tenancy = tenancyById.get(invoice.tenancyId);
      return {
        ...invoice,
        tenantName: tenantById.get(invoice.tenantId)?.fullName ?? 'Unknown',
        roomNumber: tenancy ? roomById.get(tenancy.roomId)?.number ?? '?' : '?',
        bedLabel: tenancy ? bedById.get(tenancy.bedId)?.label ?? '?' : '?',
      };
    });
}

/** Data needed to preview + send an invoice for a tenancy (send-invoice flow). */
export interface InvoiceDraftContext {
  tenancyId: string;
  tenantName: string;
  roomNumber: string;
  bedLabel: string;
  rentPaise: number;
  maintenancePaise: number;
  paymentDueDay: number | null;
  paymentStatus: PaymentStatus;
}

export function getInvoiceDraftContext(tenancyId: string): InvoiceDraftContext | null {
  const db = getDb();
  const tenancy = db.tenancies.find((t) => t.id === tenancyId);
  if (!tenancy) return null;
  const tenant = db.tenants.find((t) => t.id === tenancy.tenantId);
  const room = db.rooms.find((r) => r.id === tenancy.roomId);
  const bed = db.beds.find((b) => b.id === tenancy.bedId);
  return {
    tenancyId,
    tenantName: tenant?.fullName ?? 'Unknown',
    roomNumber: room?.number ?? '?',
    bedLabel: bed?.label ?? '?',
    rentPaise: tenancy.monthlyRent,
    maintenancePaise: tenancy.maintenanceCharge,
    paymentDueDay: tenancy.paymentDueDay,
    paymentStatus: tenancy.paymentStatus,
  };
}

// ---------------------------------------------------------------------------
// Complaints (mirrors lib/queries/complaints.ts)
// ---------------------------------------------------------------------------

export interface ComplaintListItem extends Complaint {
  assignedToName: string | null;
  tenantName: string | null;
  roomNumber: string | null;
}

export function getComplaints(propertyId: string): ComplaintListItem[] {
  const db = getDb();
  const userById = new Map(db.users.map((u) => [u.id, u]));
  const tenantById = new Map(db.tenants.map((t) => [t.id, t]));
  const roomById = new Map(db.rooms.map((r) => [r.id, r]));

  return db.complaints
    .filter((c) => c.propertyId === propertyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c) => ({
      ...c,
      assignedToName: c.assignedToId ? userById.get(c.assignedToId)?.name ?? null : null,
      tenantName: c.tenantId ? tenantById.get(c.tenantId)?.fullName ?? null : null,
      roomNumber: c.roomId ? roomById.get(c.roomId)?.number ?? null : null,
    }));
}

export function getComplaint(complaintId: string): ComplaintListItem | null {
  const db = getDb();
  const complaint = db.complaints.find((c) => c.id === complaintId);
  if (!complaint) return null;
  return (
    getComplaints(complaint.propertyId).find((c) => c.id === complaintId) ?? null
  );
}

export interface AssignableUser {
  id: string;
  name: string;
  role: User['role'];
}

/** Staff who can be assigned complaints: the property's staff plus admins. */
export function getAssignableUsers(propertyId: string): AssignableUser[] {
  return getDb()
    .users.filter(
      (u) => u.isActive && (u.propertyId === propertyId || u.role === 'ADMIN'),
    )
    .map(({ id, name, role }) => ({ id, name, role }));
}

// ---------------------------------------------------------------------------
// Expenses (mirrors lib/queries/expenses.ts + expense-categories.ts)
// ---------------------------------------------------------------------------

export interface ExpenseListItem extends Expense {
  categoryName: string;
  subcategoryName: string | null;
}

export function getExpenses(propertyId: string): ExpenseListItem[] {
  const db = getDb();
  const categoryById = new Map(db.expenseCategories.map((c) => [c.id, c]));
  const subById = new Map(db.expenseSubcategories.map((s) => [s.id, s]));

  return db.expenses
    .filter((e) => e.propertyId === propertyId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => ({
      ...e,
      categoryName: categoryById.get(e.categoryId)?.name ?? 'Unknown',
      subcategoryName: e.subcategoryId
        ? subById.get(e.subcategoryId)?.name ?? null
        : null,
    }));
}

export function getExpense(expenseId: string): ExpenseListItem | null {
  const db = getDb();
  const expense = db.expenses.find((e) => e.id === expenseId);
  if (!expense) return null;
  return getExpenses(expense.propertyId).find((e) => e.id === expenseId) ?? null;
}

export interface CategoryWithSubs {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

export function getExpenseCategories(propertyId: string): CategoryWithSubs[] {
  const db = getDb();
  return db.expenseCategories
    .filter((c) => c.propertyId === propertyId)
    .map((c) => ({
      id: c.id,
      name: c.name,
      subcategories: db.expenseSubcategories
        .filter((s) => s.categoryId === c.id)
        .map(({ id, name }) => ({ id, name })),
    }));
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function getNotifications(propertyId: string): AppNotification[] {
  return getDb()
    .notifications.filter((n) => n.propertyId === propertyId)
    .map((n) => ({ ...n }));
}

export function getUnreadNotificationCount(propertyId: string): number {
  return getDb().notifications.filter((n) => n.propertyId === propertyId && !n.read)
    .length;
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/** Rooms of a property (for pickers, e.g. linking a complaint to a room). */
export interface RoomOption {
  id: string;
  number: string;
}

export function getRoomOptions(propertyId: string): RoomOption[] {
  const db = getDb();
  return db.rooms
    .filter((r) => r.propertyId === propertyId)
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
    .map(({ id, number }) => ({ id, number }));
}

/** Current-month payments summary used by the collections header. */
export interface CollectionsSummary {
  /** Paise collected this month (PAID payments). */
  collectedPaise: number;
  /** Paise still due from active tenancies this cycle. */
  outstandingPaise: number;
  paidCount: number;
  unpaidCount: number;
}

export function getCollectionsSummary(propertyId: string): CollectionsSummary {
  const db = getDb();
  const now = new Date();
  const active = db.tenancies.filter(
    (t) => t.propertyId === propertyId && t.status === 'ACTIVE',
  );
  const collectedPaise = db.payments
    .filter(
      (p) =>
        p.propertyId === propertyId &&
        p.status === 'PAID' &&
        toDate(p.forMonth).getTime() === startOfMonth(now).getTime(),
    )
    .reduce((sum, p) => sum + p.amount, 0);
  const unpaid = active.filter((t) => t.paymentStatus !== 'PAID');

  return {
    collectedPaise,
    outstandingPaise: unpaid.reduce(
      (sum, t) => sum + t.monthlyRent + t.maintenanceCharge,
      0,
    ),
    paidCount: active.length - unpaid.length,
    unpaidCount: unpaid.length,
  };
}
