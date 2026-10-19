/** Read-only view models derived from the authenticated server snapshot. */
import type {
  AppNotification,
  Bed,
  BedStatus,
  Complaint,
  Expense,
  Floor,
  Invoice,
  Payment,
  PaymentStatus,
  Property,
  Room,
  Tenancy,
  Tenant,
  User,
} from '@/types';
import {
  addMonths,
  advancePaise,
  balancePaise,
  bedLocationLabel,
  earlierDues,
  endOfMonth,
  formatMonthYear,
  formatShortMonthYear,
  isSameMonth,
  ledgerStartMonth,
  monthFromKey,
  monthKey,
  monthlyDuePaise,
  paymentSplit,
  rentDueDate,
  resolveCollectionState,
  resolvePaymentStatus,
  startOfMonth,
  toDate,
  type CollectionState,
  type RentCollectionView,
} from '@/utils';
import { getDb } from './db';
import { getIndexes } from './indexes';
import { loadCollectedByMonth, sumCollected } from './ledger';

// ---------------------------------------------------------------------------
// Auth & properties
// ---------------------------------------------------------------------------

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
// Shared lookups
// ---------------------------------------------------------------------------

type Db = ReturnType<typeof getDb>;

function lookups(db: Db) {
  return getIndexes(db);
}

/** Current-month position for an active tenancy, derived from the ledger. */
function currentMonthPosition(db: Db, t: Tenancy, month: Date = startOfMonth(new Date())) {
  const duePaise = monthlyDuePaise(t);
  const collectedPaise = sumCollected(db, t.id, month);
  return {
    duePaise,
    collectedPaise,
    state: resolveCollectionState(duePaise, collectedPaise),
    // Derived rather than the stored snapshot, which only refreshes on writes.
    paymentStatus: resolvePaymentStatus({
      duePaise,
      collectedPaise,
      paymentDueDay: t.paymentDueDay,
      month,
    }),
  };
}

/** "Floor 2" / "Block A · Floor 2" — the web's report/dashboard floor label. */
function floorLabel(db: Db, floor: Floor | undefined): string {
  if (!floor) return 'Floor';
  const base = floor.name ?? `Floor ${floor.number}`;
  const block = floor.blockId ? db.blocks.find((b) => b.id === floor.blockId) : null;
  return block ? `Block ${block.name} · ${base}` : base;
}

function floorSortKey(db: Db, floor: Floor | undefined): string {
  if (!floor) return '9999';
  const block = floor.blockId ? db.blocks.find((b) => b.id === floor.blockId) : null;
  return [block?.order ?? 0, floor.order, floor.number]
    .map((n) => String(n + 1000).padStart(5, '0'))
    .join('-');
}

// ---------------------------------------------------------------------------
// Dashboard (mirrors lib/queries/dashboard.ts)
// ---------------------------------------------------------------------------

/** Months of history in the dashboard trend chart, including the current one. */
const TREND_MONTHS = 6;

interface Fill {
  rooms: number;
  beds: number;
  occupied: number;
  available: number;
}

const emptyFill = (): Fill => ({ rooms: 0, beds: 0, occupied: 0, available: 0 });

export interface SharingBreakdownRow extends Fill {
  sharingType: number;
  /** Expected monthly rent (rent + maintenance) of the active tenancies. */
  expectedPaise: number;
}

export interface BlockBreakdownRow extends Fill {
  id: string;
  name: string;
  floors: number;
}

export interface FloorBreakdownRow extends Fill {
  id: string;
  number: number;
  name: string | null;
  blockName: string | null;
}

export interface TrendPoint {
  label: string;
  collectedPaise: number;
  expensesPaise: number;
}

export interface NoticeTenancy {
  id: string;
  tenantId: string;
  name: string;
  roomNumber: string;
  bedLabel: string;
  noticeGivenDate: string;
}

export interface RecentPayment {
  id: string;
  amount: number;
  status: PaymentStatus;
  method: Payment['method'];
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

export interface DashboardData {
  monthStart: string;
  // Capacity
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  fullRooms: number;
  partialRooms: number;
  emptyRooms: number;
  // Breakdowns
  sharingBreakdown: SharingBreakdownRow[];
  blockBreakdown: BlockBreakdownRow[];
  floorBreakdown: FloorBreakdownRow[];
  // Rent
  activeTenancies: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  overdueCount: number;
  expectedPaise: number;
  collectedPaise: number;
  outstandingPaise: number;
  expensesPaise: number;
  netPaise: number;
  // Movement
  moveInsThisMonth: number;
  moveOutsThisMonth: number;
  noticeTenancies: NoticeTenancy[];
  // Activity
  trend: TrendPoint[];
  recentPayments: RecentPayment[];
  recentComplaints: RecentComplaint[];
  openComplaints: number;
}

/**
 * Occupancy, rent, expense and activity figures for the dashboard. Occupancy
 * is rolled up from one room/bed pass so every breakdown reconciles with the
 * totals; collections are grouped by the month they BILL (forMonth).
 */
export function getDashboardData(propertyId: string): DashboardData {
  const db = getDb();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthKeyNow = monthKey(monthStart);
  const trendFrom = addMonths(monthStart, -(TREND_MONTHS - 1));
  const { tenantById, roomById, bedById, floorById, blockById } = lookups(db);

  const rooms = db.rooms.filter((r) => r.propertyId === propertyId);
  const bedsByRoom = new Map<string, Bed[]>();
  for (const bed of db.beds) {
    if (bed.propertyId !== propertyId) continue;
    const list = bedsByRoom.get(bed.roomId) ?? [];
    list.push(bed);
    bedsByRoom.set(bed.roomId, list);
  }

  // --- Occupancy roll-up ---------------------------------------------------
  const sharingMap = new Map<number, Fill>();
  const blockMap = new Map<string, Fill & { name: string; order: number; floors: Set<string> }>();
  const floorMap = new Map<string, Fill & { floor: Floor }>();
  let totalBeds = 0;
  let occupiedBeds = 0;
  let fullRooms = 0;
  let partialRooms = 0;
  let emptyRooms = 0;

  const add = (target: Fill, beds: number, occupied: number) => {
    target.rooms += 1;
    target.beds += beds;
    target.occupied += occupied;
    target.available += beds - occupied;
  };

  for (const room of rooms) {
    const roomBeds = bedsByRoom.get(room.id) ?? [];
    const beds = roomBeds.length;
    const occupied = roomBeds.filter((b) => b.status === 'OCCUPIED').length;
    totalBeds += beds;
    occupiedBeds += occupied;
    if (beds > 0 && occupied === beds) fullRooms += 1;
    else if (occupied > 0) partialRooms += 1;
    else emptyRooms += 1;

    const sharing = sharingMap.get(room.sharingType) ?? emptyFill();
    add(sharing, beds, occupied);
    sharingMap.set(room.sharingType, sharing);

    const floor = floorById.get(room.floorId);
    if (!floor) continue;
    const block = floor.blockId ? blockById.get(floor.blockId) : null;
    if (block) {
      const entry =
        blockMap.get(block.id) ??
        { ...emptyFill(), name: block.name, order: block.order, floors: new Set<string>() };
      add(entry, beds, occupied);
      entry.floors.add(floor.id);
      blockMap.set(block.id, entry);
    }
    const floorEntry = floorMap.get(floor.id) ?? { ...emptyFill(), floor };
    add(floorEntry, beds, occupied);
    floorMap.set(floor.id, floorEntry);
  }

  // --- Rent roll-up ----------------------------------------------------------
  const active = db.tenancies.filter((t) => t.propertyId === propertyId && t.status === 'ACTIVE');
  let expectedPaise = 0;
  let paidCount = 0;
  let partialCount = 0;
  let unpaidCount = 0;
  let overdueCount = 0;
  const revenueBySharing = new Map<number, number>();

  for (const t of active) {
    const pos = currentMonthPosition(db, t, monthStart);
    expectedPaise += pos.duePaise;
    if (pos.state === 'PAID') paidCount += 1;
    else if (pos.state === 'PARTIAL') partialCount += 1;
    else unpaidCount += 1;
    if (pos.paymentStatus === 'OVERDUE') overdueCount += 1;
    const sharing = roomById.get(t.roomId)?.sharingType ?? 0;
    revenueBySharing.set(sharing, (revenueBySharing.get(sharing) ?? 0) + pos.duePaise);
  }

  const payments = db.payments.filter((p) => p.propertyId === propertyId && p.status === 'PAID');
  const collectedPaise = payments
    .filter((p) => monthKey(p.forMonth) === monthKeyNow)
    .reduce((sum, p) => sum + p.amount, 0);

  // --- Trend -------------------------------------------------------------------
  const collectedByMonth = new Map<string, number>();
  for (const p of payments) {
    if (toDate(p.forMonth) < trendFrom) continue;
    const key = monthKey(p.forMonth);
    collectedByMonth.set(key, (collectedByMonth.get(key) ?? 0) + p.amount);
  }
  const expensesByMonth = new Map<string, number>();
  for (const e of db.expenses) {
    if (e.propertyId !== propertyId || toDate(e.date) < trendFrom) continue;
    const key = monthKey(e.date);
    expensesByMonth.set(key, (expensesByMonth.get(key) ?? 0) + e.amount);
  }
  const trend: TrendPoint[] = Array.from({ length: TREND_MONTHS }, (_, i) => {
    const month = addMonths(monthStart, -(TREND_MONTHS - 1 - i));
    const key = monthKey(month);
    return {
      label: formatShortMonth(month),
      collectedPaise: collectedByMonth.get(key) ?? 0,
      expensesPaise: expensesByMonth.get(key) ?? 0,
    };
  });
  const expensesPaise = expensesByMonth.get(monthKeyNow) ?? 0;

  // --- Movement & activity ----------------------------------------------------
  const inMonth = (iso: string | null) => Boolean(iso) && isSameMonth(iso as string, now);
  const propertyTenancies = db.tenancies.filter((t) => t.propertyId === propertyId);

  const noticeTenancies: NoticeTenancy[] = active
    .filter((t) => t.noticeGivenDate !== null)
    .map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      name: tenantById.get(t.tenantId)?.fullName ?? 'Unknown',
      roomNumber: roomById.get(t.roomId)?.number ?? '?',
      bedLabel: bedById.get(t.bedId)?.label ?? '?',
      noticeGivenDate: t.noticeGivenDate as string,
    }))
    .sort((a, b) => a.noticeGivenDate.localeCompare(b.noticeGivenDate));

  const recentPayments: RecentPayment[] = db.payments
    .filter((p) => p.propertyId === propertyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      method: p.method,
      createdAt: p.createdAt,
      tenantName: tenantById.get(p.tenantId)?.fullName ?? 'Unknown',
    }));

  const propertyComplaints = db.complaints.filter((c) => c.propertyId === propertyId);
  const recentComplaints: RecentComplaint[] = [...propertyComplaints]
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

  return {
    monthStart: monthStart.toISOString(),
    totalRooms: rooms.length,
    totalBeds,
    occupiedBeds,
    availableBeds: totalBeds - occupiedBeds,
    fullRooms,
    partialRooms,
    emptyRooms,
    sharingBreakdown: [...sharingMap.entries()]
      .map(([sharingType, fill]) => ({
        sharingType,
        ...fill,
        expectedPaise: revenueBySharing.get(sharingType) ?? 0,
      }))
      .sort((a, b) => a.sharingType - b.sharingType),
    blockBreakdown: [...blockMap.entries()]
      .map(([id, { floors, order, ...fill }]) => ({ id, floors: floors.size, order, ...fill }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map(({ order: _order, ...row }) => row),
    floorBreakdown: [...floorMap.entries()]
      .sort(([, a], [, b]) => floorSortKey(db, a.floor).localeCompare(floorSortKey(db, b.floor)))
      .map(([id, { floor, ...fill }]) => ({
        id,
        number: floor.number,
        name: floor.name,
        blockName: floor.blockId ? blockById.get(floor.blockId)?.name ?? null : null,
        ...fill,
      })),
    activeTenancies: active.length,
    paidCount,
    partialCount,
    unpaidCount,
    overdueCount,
    expectedPaise,
    collectedPaise,
    outstandingPaise: Math.max(0, expectedPaise - collectedPaise),
    expensesPaise,
    netPaise: collectedPaise - expensesPaise,
    moveInsThisMonth: propertyTenancies.filter((t) => inMonth(t.checkInDate)).length,
    moveOutsThisMonth: propertyTenancies.filter((t) => inMonth(t.checkOutDate)).length,
    noticeTenancies,
    trend,
    recentPayments,
    recentComplaints,
    openComplaints: propertyComplaints.filter((c) => c.status !== 'RESOLVED').length,
  };
}

/** "Jan" — trend-axis label. */
function formatShortMonth(d: Date): string {
  return formatShortMonthYear(d).split(' ')[0];
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
        state: CollectionState;
        duePaise: number;
        collectedPaise: number;
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
  /** Room-level rent defaults (paise) — pre-fill a new move-in. */
  defaultRent: number | null;
  defaultMaintenance: number | null;
  beds: FloorBed[];
}

function toFloorBed(db: Db, bed: Bed): FloorBed {
  const { activeByBed, tenantById } = lookups(db);
  const tenancy = activeByBed.get(bed.id);
  const tenant = tenancy ? tenantById.get(tenancy.tenantId) : null;
  return {
    id: bed.id,
    label: bed.label,
    status: bed.status,
    tenancy:
      tenancy && tenant
        ? {
            id: tenancy.id,
            ...currentMonthPosition(db, tenancy),
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

function toFloorRoom(db: Db, room: Room): FloorRoom {
  return {
    id: room.id,
    number: room.number,
    label: room.label,
    sharingType: room.sharingType,
    defaultRent: room.defaultRent,
    defaultMaintenance: room.defaultMaintenance,
    beds: (lookups(db).bedsByRoom.get(room.id) ?? []).map((bed) => toFloorBed(db, bed)),
  };
}

/** Full room/bed layout for a floor, including the active tenant on each bed. */
export function getFloorLayout(floorId: string): FloorRoom[] {
  const db = getDb();
  return db.rooms
    .filter((r) => r.floorId === floorId)
    .sort((a, b) => a.order - b.order)
    .map((room) => toFloorRoom(db, room));
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
    ...toFloorRoom(db, room),
    floorNumber: floor?.number ?? 0,
    floorName: floor?.name ?? null,
    blockName: block?.name ?? null,
    propertyId: room.propertyId,
  };
}

/** Room rent defaults, for pre-filling a new move-in on a bed. */
export function getBedRoomDefaults(
  bedId: string,
): { defaultRent: number | null; defaultMaintenance: number | null } {
  const db = getDb();
  const bed = db.beds.find((b) => b.id === bedId);
  const room = bed ? db.rooms.find((r) => r.id === bed.roomId) : null;
  return {
    defaultRent: room?.defaultRent ?? null,
    defaultMaintenance: room?.defaultMaintenance ?? null,
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
    duePaise: number;
    collectedPaise: number;
    state: CollectionState;
    paymentStatus: PaymentStatus;
  } | null;
}

export function getTenantList(propertyId: string): TenantListItem[] {
  const db = getDb();
  const { roomById, bedById, activeByTenant } = lookups(db);

  return db.tenants
    .filter((t) => t.propertyId === propertyId)
    .map((tenant) => {
      const active = activeByTenant.get(tenant.id);
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
                ...currentMonthPosition(db, active),
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
  paymentDueDay: number | null;
  checkInDate: string;
  checkOutDate: string | null;
  noticeGivenDate: string | null;
  expectedLeavingDate: string | null;
  /** This month's position (meaningful for the ACTIVE stay). */
  duePaise: number;
  collectedPaise: number;
  state: CollectionState;
  paymentStatus: PaymentStatus;
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
  const { roomById, bedById } = lookups(db);

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
      paymentDueDay: t.paymentDueDay,
      checkInDate: t.checkInDate,
      checkOutDate: t.checkOutDate,
      noticeGivenDate: t.noticeGivenDate,
      expectedLeavingDate: t.expectedLeavingDate ?? (t.noticeGivenDate ? new Date(new Date(t.noticeGivenDate).getTime() + 15 * 86400000).toISOString() : null),
      ...currentMonthPosition(db, t),
    }));

  // Newest billing month first, then newest receipt within it (web order).
  const payments = db.payments
    .filter((p) => p.tenantId === tenantId)
    .sort(
      (a, b) =>
        b.forMonth.localeCompare(a.forMonth) || (b.paidAt ?? '').localeCompare(a.paidAt ?? ''),
    )
    .slice(0, 24)
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
  paymentDueDay: number | null;
  securityDeposit: number | null;
  depositStatus: Tenancy['depositStatus'];
  noticeGivenDate: string | null;
  checkInDate: string;
  tenant: { id: string; fullName: string; phone: string; email: string | null };
  roomNumber: string;
  bedLabel: string;
  floorNumber: number;
  blockName: string | null;
  /** Billing month as YYYY-MM. */
  month: string;
  status: PaymentStatus;
  state: CollectionState;
  dueDate: string;
  duePaise: number;
  collectedPaise: number;
  balancePaise: number;
  earlierDuePaise: number;
  earlierDueMonths: string[];
  /** Everything owed up to and including this month. */
  outstandingPaise: number;
  cashPaise: number;
  onlinePaise: number;
  lastCollectedAt: string | null;
  collectionCount: number;
}

/**
 * Every ACTIVE tenancy with what is needed to chase rent for one billing
 * month (the current one by default). A tenancy is only listed for months it
 * can owe — from its ledger start month on.
 */
export function getCollectionsData(propertyId: string, month?: string): CollectionRow[] {
  const db = getDb();
  const monthStart = month ? monthFromKey(month) : startOfMonth(new Date());
  const key = monthKey(monthStart);
  const { tenantById, roomById, bedById, floorById, blockById } = lookups(db);

  const billable = db.tenancies.filter(
    (t) =>
      t.propertyId === propertyId &&
      t.status === 'ACTIVE' &&
      ledgerStartMonth(t).getTime() <= monthStart.getTime(),
  );
  const earliest = billable.reduce<Date | null>((min, t) => {
    const start = ledgerStartMonth(t);
    return !min || start < min ? start : min;
  }, null);
  const history = earliest
    ? loadCollectedByMonth(db, billable.map((t) => t.id), earliest, addMonths(monthStart, -1))
    : new Map<string, Map<string, number>>();

  return billable
    .map((t) => {
      const tenant = tenantById.get(t.tenantId);
      const room = roomById.get(t.roomId);
      const bed = bedById.get(t.bedId);
      const floor = room ? floorById.get(room.floorId) : null;
      const block = floor?.blockId ? blockById.get(floor.blockId) : null;
      const payments = [...(lookups(db).paidByTenancyMonth.get(t.id)?.get(key) ?? [])]
        .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''));

      const collected = payments.reduce((sum, p) => sum + p.amount, 0);
      const due = monthlyDuePaise(t);
      const balance = balancePaise(due, collected);
      const earlier = earlierDues({
        duePaise: due,
        startMonth: ledgerStartMonth(t),
        beforeMonth: monthStart,
        collectedByMonth: history.get(t.id) ?? new Map(),
      });

      return {
        id: t.id,
        monthlyRent: t.monthlyRent,
        maintenanceCharge: t.maintenanceCharge,
        paymentDueDay: t.paymentDueDay,
        securityDeposit: t.securityDeposit,
        depositStatus: t.depositStatus,
        noticeGivenDate: t.noticeGivenDate,
        checkInDate: t.checkInDate,
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
        month: key,
        status: resolvePaymentStatus({
          duePaise: due,
          collectedPaise: collected,
          paymentDueDay: t.paymentDueDay,
          month: monthStart,
        }),
        state: resolveCollectionState(due, collected),
        dueDate: rentDueDate(t.paymentDueDay, monthStart).toISOString(),
        duePaise: due,
        collectedPaise: collected,
        balancePaise: balance,
        earlierDuePaise: earlier.paise,
        earlierDueMonths: earlier.months,
        outstandingPaise: balance + earlier.paise,
        cashPaise: payments.reduce((sum, p) => sum + paymentSplit(p).cash, 0),
        onlinePaise: payments.reduce((sum, p) => sum + paymentSplit(p).online, 0),
        lastCollectedAt: payments[0]?.paidAt ?? null,
        collectionCount: payments.length,
      };
    })
    .sort((a, b) => a.tenant.fullName.localeCompare(b.tenant.fullName));
}

/** Billing months offered in the Collections month picker, newest first. */
export function getCollectionMonthOptions(count = 24): { value: string; label: string }[] {
  const current = startOfMonth(new Date());
  return Array.from({ length: count }, (_, i) => {
    const m = addMonths(current, -i);
    return { value: monthKey(m), label: formatMonthYear(m) };
  });
}

/** Unpaid balance a tenancy carries from months before `month`. */
function earlierDuesFor(db: Db, tenancy: Tenancy, month: Date) {
  const start = ledgerStartMonth(tenancy);
  const collected = loadCollectedByMonth(db, [tenancy.id], start, addMonths(month, -1));
  return earlierDues({
    duePaise: monthlyDuePaise(tenancy),
    startMonth: start,
    beforeMonth: month,
    collectedByMonth: collected.get(tenancy.id) ?? new Map(),
  });
}

/**
 * Everything the Collect Rent sheet needs for one active tenancy and one
 * billing month (web `getRentCollection`). Read-only.
 */
export function getRentCollection(tenancyId: string, month?: string): RentCollectionView | null {
  const db = getDb();
  const tenancy = db.tenancies.find((t) => t.id === tenancyId && t.status === 'ACTIVE');
  if (!tenancy) return null;
  const property = db.properties.find((p) => p.id === tenancy.propertyId);
  const forMonth = month ? monthFromKey(month) : startOfMonth(new Date());
  const key = monthKey(forMonth);
  const tenant = db.tenants.find((t) => t.id === tenancy.tenantId);
  const room = db.rooms.find((r) => r.id === tenancy.roomId);
  const bed = db.beds.find((b) => b.id === tenancy.bedId);

  const collections = db.payments
    .filter((p) => p.tenancyId === tenancy.id && p.status === 'PAID' && monthKey(p.forMonth) === key)
    .sort((a, b) => (b.paidAt ?? b.createdAt).localeCompare(a.paidAt ?? a.createdAt))
    .map((p) => {
      const { cash, online } = paymentSplit(p);
      return {
        id: p.id,
        amountPaise: p.amount,
        cashPaise: cash,
        onlinePaise: online,
        method: p.method,
        collectedAt: p.paidAt ?? p.createdAt,
        notes: p.notes,
        recordedBy: p.recordedByName,
      };
    });

  const duePaise = monthlyDuePaise(tenancy);
  const collectedPaise = collections.reduce((sum, c) => sum + c.amountPaise, 0);
  const earlier = earlierDuesFor(db, tenancy, forMonth);

  return {
    tenancyId: tenancy.id,
    tenantName: tenant?.fullName ?? 'Unknown',
    room: bedLocationLabel(room?.number ?? '?', bed?.label ?? '?', property?.isFlat ?? false),
    month: key,
    rentPaise: tenancy.monthlyRent,
    maintenancePaise: tenancy.maintenanceCharge,
    duePaise,
    collectedPaise,
    cashPaise: collections.reduce((sum, c) => sum + c.cashPaise, 0),
    onlinePaise: collections.reduce((sum, c) => sum + c.onlinePaise, 0),
    balancePaise: balancePaise(duePaise, collectedPaise),
    advancePaise: advancePaise(duePaise, collectedPaise),
    paymentDueDay: tenancy.paymentDueDay,
    status: resolvePaymentStatus({
      duePaise,
      collectedPaise,
      paymentDueDay: tenancy.paymentDueDay,
      month: forMonth,
    }),
    state: resolveCollectionState(duePaise, collectedPaise),
    earlierDuePaise: earlier.paise,
    earlierDueMonths: earlier.months,
    firstMonth: monthKey(startOfMonth(tenancy.checkInDate)),
    collections,
  };
}

export interface InvoiceHistoryRow extends Invoice {
  tenantName: string;
  roomNumber: string;
  bedLabel: string;
}

/** Recent invoices for the property, newest first (capped like the web). */
export function getInvoiceHistory(propertyId: string): InvoiceHistoryRow[] {
  const db = getDb();
  const { tenantById, roomById, bedById } = lookups(db);
  const tenancyById = new Map(db.tenancies.map((t) => [t.id, t]));

  return db.invoices
    .filter((i) => i.propertyId === propertyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 200)
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

/** Data needed to preview + send a bill for a tenancy (web `prepareInvoice`). */
export interface InvoiceDraftContext {
  tenancyId: string;
  tenantName: string;
  roomNumber: string;
  bedLabel: string;
  /** Billing month, YYYY-MM. */
  month: string;
  rentPaise: number;
  maintenancePaise: number;
  paymentDueDay: number | null;
  /** Default previous due: the unpaid balance from earlier months. */
  previousDuePaise: number;
  /** Collected against the billing month so far. */
  paidPaise: number;
}

export function getInvoiceDraftContext(
  tenancyId: string,
  month?: string,
): InvoiceDraftContext | null {
  const db = getDb();
  const tenancy = db.tenancies.find((t) => t.id === tenancyId && t.status === 'ACTIVE');
  if (!tenancy) return null;
  const billingMonth = month ? monthFromKey(month) : startOfMonth(new Date());
  const tenant = db.tenants.find((t) => t.id === tenancy.tenantId);
  const room = db.rooms.find((r) => r.id === tenancy.roomId);
  const bed = db.beds.find((b) => b.id === tenancy.bedId);
  return {
    tenancyId,
    tenantName: tenant?.fullName ?? 'Unknown',
    roomNumber: room?.number ?? '?',
    bedLabel: bed?.label ?? '?',
    month: monthKey(billingMonth),
    rentPaise: tenancy.monthlyRent,
    maintenancePaise: tenancy.maintenanceCharge,
    paymentDueDay: tenancy.paymentDueDay,
    previousDuePaise: earlierDuesFor(db, tenancy, billingMonth).paise,
    paidPaise: sumCollected(db, tenancy.id, billingMonth),
  };
}

// ---------------------------------------------------------------------------
// Reports (mirrors lib/queries/reports.ts)
// ---------------------------------------------------------------------------

interface ReportBucket {
  expectedPaise: number;
  collectedPaise: number;
  cashPaise: number;
  onlinePaise: number;
  tenancies: number;
  outstandingPaise: number;
}

export interface ReportFloorRow extends ReportBucket {
  id: string;
  label: string;
}

export interface ReportRoomRow extends ReportBucket {
  id: string;
  number: string;
  floorLabel: string;
  sharingType: number;
}

export interface ReportTenantRow {
  tenancyId: string;
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  bedLabel: string;
  floorLabel: string;
  expectedPaise: number;
  collectedPaise: number;
  cashPaise: number;
  onlinePaise: number;
  balancePaise: number;
  collectionCount: number;
  lastPaidAt: string | null;
  status: PaymentStatus;
  state: CollectionState;
  isActive: boolean;
}

export interface RentReport {
  month: string;
  monthLabel: string;
  availableMonths: { value: string; label: string }[];
  summary: {
    expectedPaise: number;
    collectedPaise: number;
    outstandingPaise: number;
    cashPaise: number;
    onlinePaise: number;
    collectionRate: number;
    tenancies: number;
    fullyPaid: number;
    partiallyPaid: number;
    unpaid: number;
  };
  byFloor: ReportFloorRow[];
  byRoom: ReportRoomRow[];
  byTenant: ReportTenantRow[];
  trend: { month: string; label: string; collectedPaise: number }[];
}

/**
 * Rent expected against rent collected for one billing month, rolled up per
 * floor, room and tenant. A tenancy counts in full for any month it overlaps
 * (no pro-rating, matching the invoices); collections are grouped by the
 * payment's own room so money from a since-ended tenancy is never dropped.
 */
export function getRentReport(propertyId: string, month?: string): RentReport {
  const db = getDb();
  const now = new Date();
  const monthStart = month ? monthFromKey(month) : startOfMonth(now);
  const monthEnd = endOfMonth(monthStart);
  const key = monthKey(monthStart);
  const { tenantById, roomById, bedById, floorById } = lookups(db);
  const tenancyById = new Map(db.tenancies.map((t) => [t.id, t]));

  const emptyBucket = (): ReportBucket => ({
    expectedPaise: 0,
    collectedPaise: 0,
    cashPaise: 0,
    onlinePaise: 0,
    tenancies: 0,
    outstandingPaise: 0,
  });
  const floors = new Map<string, ReportFloorRow & { sort: string }>();
  const rooms = new Map<string, ReportRoomRow & { sort: string }>();

  const bucketsFor = (roomId: string) => {
    const room = roomById.get(roomId);
    const floor = room ? floorById.get(room.floorId) : undefined;
    const fKey = floor?.id ?? 'none';
    let f = floors.get(fKey);
    if (!f) {
      f = { ...emptyBucket(), id: fKey, label: floorLabel(db, floor), sort: floorSortKey(db, floor) };
      floors.set(fKey, f);
    }
    let r = rooms.get(roomId);
    if (!r) {
      r = {
        ...emptyBucket(),
        id: roomId,
        number: room?.number ?? '?',
        floorLabel: floorLabel(db, floor),
        sharingType: room?.sharingType ?? 0,
        sort: `${floorSortKey(db, floor)}-${room?.number ?? ''}`,
      };
      rooms.set(roomId, r);
    }
    return [f, r];
  };

  // Collections first, so a per-tenancy total is ready for the tenant rows.
  const payments = db.payments.filter(
    (p) => p.propertyId === propertyId && p.status === 'PAID' && monthKey(p.forMonth) === key,
  );
  const byTenancy = new Map<
    string,
    { collected: number; cash: number; online: number; count: number; lastPaidAt: string | null }
  >();
  for (const p of payments) {
    const { cash, online } = paymentSplit(p);
    const at = p.paidAt ?? p.createdAt;
    const cur = byTenancy.get(p.tenancyId) ?? {
      collected: 0,
      cash: 0,
      online: 0,
      count: 0,
      lastPaidAt: null,
    };
    cur.collected += p.amount;
    cur.cash += cash;
    cur.online += online;
    cur.count += 1;
    if (!cur.lastPaidAt || at > cur.lastPaidAt) cur.lastPaidAt = at;
    byTenancy.set(p.tenancyId, cur);

    const tenancy = tenancyById.get(p.tenancyId);
    if (!tenancy) continue;
    for (const bucket of bucketsFor(tenancy.roomId)) {
      bucket.collectedPaise += p.amount;
      bucket.cashPaise += cash;
      bucket.onlinePaise += online;
    }
  }

  const overlapping = db.tenancies.filter(
    (t) =>
      t.propertyId === propertyId &&
      toDate(t.checkInDate) <= monthEnd &&
      (!t.checkOutDate || toDate(t.checkOutDate) >= monthStart),
  );

  const byTenant: ReportTenantRow[] = overlapping
    .map((t) => {
      const expected = monthlyDuePaise(t);
      const c = byTenancy.get(t.id);
      const collectedPaise = c?.collected ?? 0;
      for (const bucket of bucketsFor(t.roomId)) {
        bucket.expectedPaise += expected;
        bucket.tenancies += 1;
      }
      const room = roomById.get(t.roomId);
      return {
        tenancyId: t.id,
        tenantId: t.tenantId,
        tenantName: tenantById.get(t.tenantId)?.fullName ?? 'Unknown',
        roomNumber: room?.number ?? '?',
        bedLabel: bedById.get(t.bedId)?.label ?? '?',
        floorLabel: floorLabel(db, room ? floorById.get(room.floorId) : undefined),
        expectedPaise: expected,
        collectedPaise,
        cashPaise: c?.cash ?? 0,
        onlinePaise: c?.online ?? 0,
        balancePaise: balancePaise(expected, collectedPaise),
        collectionCount: c?.count ?? 0,
        lastPaidAt: c?.lastPaidAt ?? null,
        status: resolvePaymentStatus({
          duePaise: expected,
          collectedPaise,
          paymentDueDay: t.paymentDueDay,
          month: monthStart,
        }),
        state: resolveCollectionState(expected, collectedPaise),
        isActive: t.status === 'ACTIVE',
      };
    })
    .sort((a, b) => a.tenantName.localeCompare(b.tenantName));

  const finish = <T extends ReportBucket & { sort: string }>(rows: T[]) =>
    rows
      .sort((a, b) => a.sort.localeCompare(b.sort))
      .map(({ sort: _sort, ...rest }) => ({
        ...rest,
        outstandingPaise: balancePaise(rest.expectedPaise, rest.collectedPaise),
      }));

  const expectedPaise = byTenant.reduce((sum, t) => sum + t.expectedPaise, 0);
  const collectedPaise = payments.reduce((sum, p) => sum + p.amount, 0);

  // Trend: collections per month, oldest first, gaps filled with zero.
  const trendFrom = addMonths(monthStart, -11);
  const trendMap = new Map<string, number>();
  for (const p of db.payments) {
    if (p.propertyId !== propertyId || p.status !== 'PAID') continue;
    const t = toDate(p.forMonth);
    if (t < trendFrom || t > monthStart) continue;
    const k = monthKey(t);
    trendMap.set(k, (trendMap.get(k) ?? 0) + p.amount);
  }
  const trend = Array.from({ length: 12 }, (_, i) => {
    const m = addMonths(monthStart, -(11 - i));
    const k = monthKey(m);
    return { month: k, label: formatShortMonth(m), collectedPaise: trendMap.get(k) ?? 0 };
  });

  // Every month from the property's first activity, capped at three years.
  const firstActivity = db.tenancies
    .filter((t) => t.propertyId === propertyId)
    .reduce<Date | null>((min, t) => {
      const d = startOfMonth(t.checkInDate);
      return !min || d < min ? d : min;
    }, null);
  const current = startOfMonth(now);
  const floorMonth = addMonths(current, -35);
  const from = firstActivity && firstActivity > floorMonth ? firstActivity : floorMonth;
  const availableMonths: { value: string; label: string }[] = [];
  for (let m = current; m >= from; m = addMonths(m, -1)) {
    availableMonths.push({ value: monthKey(m), label: formatMonthYear(m) });
  }

  return {
    month: key,
    monthLabel: formatMonthYear(monthStart),
    availableMonths,
    summary: {
      expectedPaise,
      collectedPaise,
      outstandingPaise: balancePaise(expectedPaise, collectedPaise),
      cashPaise: byTenant.reduce((sum, t) => sum + t.cashPaise, 0),
      onlinePaise: byTenant.reduce((sum, t) => sum + t.onlinePaise, 0),
      collectionRate: expectedPaise > 0 ? collectedPaise / expectedPaise : 0,
      tenancies: byTenant.length,
      fullyPaid: byTenant.filter((t) => t.balancePaise === 0).length,
      partiallyPaid: byTenant.filter((t) => t.balancePaise > 0 && t.collectedPaise > 0).length,
      unpaid: byTenant.filter((t) => t.collectedPaise === 0).length,
    },
    byFloor: finish([...floors.values()]),
    byRoom: finish([...rooms.values()]),
    byTenant,
    trend,
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

/** The web dashboard's searchable occupied/available directory. */
export interface OccupancyEntry {
  id: string; status: BedStatus; roomId: string; roomNumber: string; bedLabel: string;
  floorId: string; floorName: string; blockId: string | null; blockName: string | null;
  tenant: { id: string; fullName: string } | null;
}
export function getOccupancyDirectory(propertyId: string): OccupancyEntry[] {
  const db = getDb();
  const { floorById, blockById, bedsByRoom, activeByBed, tenantById } = lookups(db);
  const floorKeys = new Map(db.floors.map(f => [f.id, floorSortKey(db, f)]));
  return db.rooms.filter(r => r.propertyId === propertyId)
    .sort((a, b) => (floorKeys.get(a.floorId) ?? '9999').localeCompare(floorKeys.get(b.floorId) ?? '9999') || a.order - b.order)
    .flatMap(room => {
      const floor = floorById.get(room.floorId);
      const block = floor?.blockId ? blockById.get(floor.blockId) : null;
      return (bedsByRoom.get(room.id) ?? []).map(bed => {
        const tenancy = activeByBed.get(bed.id);
        const tenant = tenancy ? tenantById.get(tenancy.tenantId) : null;
        return { id: bed.id, status: bed.status, roomId: room.id, roomNumber: room.number, bedLabel: bed.label,
          floorId: room.floorId, floorName: floor?.name ?? `Floor ${floor?.number ?? ''}`,
          blockId: block?.id ?? null, blockName: block?.name ?? null,
          tenant: tenant ? { id: tenant.id, fullName: tenant.fullName } : null };
      });
    });
}
