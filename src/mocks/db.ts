/**
 * In-memory mock database.
 *
 * Holds the same relational shape as the backend and is populated by a
 * deterministic generator (see config.ts for the ported structure). All reads
 * go through queries.ts and all writes through actions.ts, mirroring the web
 * app's lib/queries + lib/actions split — swapping this module for real API
 * calls is the only change backend integration requires.
 */

import type {
  AppNotification,
  Bed,
  Block,
  Complaint,
  ComplaintPriority,
  ComplaintStatus,
  Expense,
  ExpenseCategory,
  ExpenseSubcategory,
  Floor,
  Invoice,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Property,
  Room,
  Tenancy,
  Tenant,
  User,
} from '@/types';
import {
  addDays,
  addMonths,
  formatFullDate,
  formatMonthYear,
  formatINR,
  resolveDepositStatusOnVacate,
  startOfMonth,
  toDate,
  vacateByDate,
  computeInvoiceTotals,
  defaultDueDate,
  MAINTENANCE_RESERVE_PAISE,
} from '@/utils';
import {
  ADMIN_ACCOUNT,
  COLLEGES,
  COMPANIES,
  COMPLAINT_POOL,
  EXPENSE_POOL,
  FIRST_NAMES,
  LAST_NAMES,
  OCCUPATIONS,
  PROPERTY_DEFS,
  STARTER_CATEGORIES,
  type BlockDef,
  type PropertyDef,
} from './config';
import { Rng } from './random';

export interface MockDatabase {
  users: User[];
  /** email -> password. Mock credential store for the demo login. */
  credentials: Record<string, string>;
  properties: Property[];
  blocks: Block[];
  floors: Floor[];
  rooms: Room[];
  beds: Bed[];
  tenants: Tenant[];
  tenancies: Tenancy[];
  payments: Payment[];
  invoices: Invoice[];
  complaints: Complaint[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  expenseSubcategories: ExpenseSubcategory[];
  notifications: AppNotification[];
}

// ---------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------

const idCounters: Record<string, number> = {};

/** Deterministic readable ids: newId('tenant') -> "tenant-0042". */
export function newId(prefix: string): string {
  idCounters[prefix] = (idCounters[prefix] ?? 0) + 1;
  return `${prefix}-${String(idCounters[prefix]).padStart(4, '0')}`;
}

// ---------------------------------------------------------------------------
// Generator internals
// ---------------------------------------------------------------------------

const HOME_TOWNS = [
  'Warangal', 'Vijayawada', 'Guntur', 'Karimnagar', 'Nizamabad',
  'Visakhapatnam', 'Tirupati', 'Nellore', 'Khammam', 'Kurnool',
];

const TENANT_NOTES = [
  'Prefers lower bed.',
  'Vegetarian mess only.',
  'Late check-in approved by manager.',
  'Works night shifts — do not disturb mornings.',
  'Referred by an existing tenant.',
];

function bedLabels(n: number): string[] {
  return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i)); // A, B, C...
}

function isoDaysAgo(days: number, now: Date): string {
  return addDays(now, -days).toISOString();
}

interface NameFactory {
  nextName(): string;
  nextPhone(): string;
}

function createNameFactory(rng: Rng): NameFactory {
  const usedNames = new Set<string>();
  const usedPhones = new Set<string>();
  return {
    nextName() {
      for (let i = 0; i < 50; i++) {
        const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
        if (!usedNames.has(name)) {
          usedNames.add(name);
          return name;
        }
      }
      // Pools exhausted for this combination — disambiguate with an initial.
      const fallback = `${rng.pick(FIRST_NAMES)} ${String.fromCharCode(65 + rng.int(0, 25))}. ${rng.pick(LAST_NAMES)}`;
      usedNames.add(fallback);
      return fallback;
    },
    nextPhone() {
      for (;;) {
        const phone = `9${rng.int(100000000, 999999999)}`;
        if (!usedPhones.has(phone)) {
          usedPhones.add(phone);
          return phone;
        }
      }
    },
  };
}

function makeTenant(
  db: MockDatabase,
  rng: Rng,
  names: NameFactory,
  propertyId: string,
  createdAt: string,
): Tenant {
  const fullName = names.nextName();
  const occupation = rng.pick(OCCUPATIONS);
  const isStudent = occupation.kind === 'student';
  const homeTown = rng.pick(HOME_TOWNS);
  const emailName = fullName.toLowerCase().replace(/[^a-z]+/g, '.');

  const tenant: Tenant = {
    id: newId('tenant'),
    propertyId,
    fullName,
    phone: names.nextPhone(),
    email: rng.chance(0.7) ? `${emailName}@gmail.com` : null,
    emergencyContact: rng.chance(0.75) ? names.nextPhone() : null,
    fatherName: rng.chance(0.7) ? `${rng.pick(FIRST_NAMES)} ${fullName.split(' ').slice(-1)[0]}` : null,
    motherName: rng.chance(0.5) ? `${rng.pick(FIRST_NAMES)} ${fullName.split(' ').slice(-1)[0]}` : null,
    address: rng.chance(0.6) ? `H.No ${rng.int(1, 12)}-${rng.int(1, 120)}, ${homeTown}` : null,
    aadhaarNumber: rng.chance(0.55)
      ? `${rng.int(2000, 9999)} ${rng.int(1000, 9999)} ${rng.int(1000, 9999)}`
      : null,
    panNumber: rng.chance(0.35)
      ? `${fullName.replace(/[^A-Za-z]/g, '').slice(0, 5).toUpperCase().padEnd(5, 'X')}${rng.int(1000, 9999)}${'PKRTV'[rng.int(0, 4)]}`
      : null,
    college: isStudent ? rng.pick(COLLEGES) : null,
    company: isStudent ? null : rng.pick(COMPANIES),
    occupation: occupation.label,
    notes: rng.chance(0.15) ? rng.pick(TENANT_NOTES) : null,
    photoUrl: null,
    createdAt,
  };
  tenant.photoUrl = rng.chance(0.4) ? `tenants/${tenant.id}/kyc.jpg` : null;
  db.tenants.push(tenant);
  return tenant;
}

/** Generate the historical PAID payments (and current month when PAID). */
function makePayments(
  db: MockDatabase,
  rng: Rng,
  tenancy: Tenancy,
  recordedByName: string,
  now: Date,
): void {
  const amount = tenancy.monthlyRent + tenancy.maintenanceCharge;
  const checkIn = toDate(tenancy.checkInDate);
  const end = tenancy.checkOutDate ? toDate(tenancy.checkOutDate) : now;
  const dueDay = tenancy.paymentDueDay ?? 5;

  // Walk backwards from the month of `end`: up to 6 covered months.
  for (let back = 0; back < 6; back++) {
    const forMonth = startOfMonth(addMonths(startOfMonth(end), -back));
    if (forMonth < startOfMonth(checkIn)) break;

    const isCurrentMonth = forMonth.getTime() === startOfMonth(now).getTime();
    if (tenancy.status === 'ACTIVE' && isCurrentMonth && tenancy.paymentStatus !== 'PAID') {
      continue; // unpaid current cycle — no payment row yet
    }

    const method: PaymentMethod = rng.weighted([
      ['ONLINE', 55],
      ['CASH', 35],
      ['SPLIT', 10],
    ] as const);
    let cashAmount: number | null = null;
    let onlineAmount: number | null = null;
    if (method === 'SPLIT') {
      cashAmount = Math.round((amount * rng.int(30, 70)) / 100 / 10000) * 10000;
      onlineAmount = amount - cashAmount;
    }

    let paidAt = addDays(forMonth, dueDay - 1 + rng.int(-2, 4));
    if (paidAt > now) paidAt = now;
    if (paidAt < forMonth) paidAt = forMonth;

    db.payments.push({
      id: newId('payment'),
      propertyId: tenancy.propertyId,
      tenancyId: tenancy.id,
      tenantId: tenancy.tenantId,
      amount,
      forMonth: forMonth.toISOString(),
      status: 'PAID',
      method,
      cashAmount,
      onlineAmount,
      paidAt: paidAt.toISOString(),
      notes: null,
      recordedByName,
      createdAt: paidAt.toISOString(),
    });
  }
}

/** Sequential invoice numbers per property + billing month: INV-202607-0001. */
const invoiceSeq: Record<string, number> = {};

function nextInvoiceNumber(propertyId: string, billingMonth: Date): string {
  const yyyymm = `${billingMonth.getFullYear()}${String(billingMonth.getMonth() + 1).padStart(2, '0')}`;
  const key = `${propertyId}-${yyyymm}`;
  invoiceSeq[key] = (invoiceSeq[key] ?? 0) + 1;
  return `INV-${yyyymm}-${String(invoiceSeq[key]).padStart(4, '0')}`;
}

export function createInvoiceRecord(
  db: MockDatabase,
  input: {
    tenancy: Tenancy;
    propertySlug: string;
    billingMonth: Date;
    issueDate: Date;
    previousDuePaise?: number;
    extraChargesPaise?: number;
    extraChargesLabel?: string | null;
    discountPaise?: number;
    notes?: string | null;
    failed?: boolean;
  },
): Invoice {
  const charges = {
    rentPaise: input.tenancy.monthlyRent,
    maintenancePaise: input.tenancy.maintenanceCharge,
    previousDuePaise: input.previousDuePaise ?? 0,
    extraChargesPaise: input.extraChargesPaise ?? 0,
    discountPaise: input.discountPaise ?? 0,
  };
  const { subtotalPaise, totalPaise } = computeInvoiceTotals(charges);
  const number = nextInvoiceNumber(input.tenancy.propertyId, input.billingMonth);
  const failed = input.failed ?? false;

  const invoice: Invoice = {
    id: newId('invoice'),
    propertyId: input.tenancy.propertyId,
    tenancyId: input.tenancy.id,
    tenantId: input.tenancy.tenantId,
    number,
    billingMonth: input.billingMonth.toISOString(),
    issueDate: input.issueDate.toISOString(),
    dueDate: defaultDueDate(input.tenancy.paymentDueDay, input.billingMonth).toISOString(),
    rentPaise: charges.rentPaise,
    maintenancePaise: charges.maintenancePaise,
    previousDuePaise: charges.previousDuePaise,
    extraChargesPaise: charges.extraChargesPaise,
    extraChargesLabel: input.extraChargesLabel ?? null,
    discountPaise: charges.discountPaise,
    subtotalPaise,
    totalPaise,
    notes: input.notes ?? null,
    storageKey: `invoices/${input.propertySlug}/${number}.pdf`,
    status: failed ? 'FAILED' : 'SENT',
    sentAt: failed ? null : input.issueDate.toISOString(),
    createdAt: input.issueDate.toISOString(),
  };
  db.invoices.push(invoice);
  return invoice;
}

// ---------------------------------------------------------------------------
// Property generation
// ---------------------------------------------------------------------------

function rentFor(def: PropertyDef, blockName: string | null, sharingType: number): number {
  if (def.isFlat && blockName) return def.rentTable[`block:${blockName}`] ?? 1_800_000;
  return def.rentTable[String(sharingType)] ?? 900_000;
}

function generateProperty(db: MockDatabase, def: PropertyDef, now: Date): void {
  const rng = new Rng(def.slug.split('').reduce((a, c) => a + c.charCodeAt(0) * 31, 7));
  const names = createNameFactory(rng);

  const property: Property = {
    id: newId('property'),
    name: def.name,
    slug: def.slug,
    address: def.address,
    city: def.city,
    phone: def.phone,
    rulesText: def.rulesText,
    hasBlocks: def.hasBlocks,
    isFlat: def.isFlat ?? false,
    isActive: true,
  };
  db.properties.push(property);

  const manager: User = {
    id: newId('user'),
    name: def.account.name,
    email: def.account.email,
    role: 'MANAGER',
    isActive: true,
    propertyId: property.id,
  };
  db.users.push(manager);
  db.credentials[manager.email] = def.account.password;

  // --- Structure -----------------------------------------------------------
  interface BuiltBed { bed: Bed; room: Room; blockName: string | null }
  const builtBeds: BuiltBed[] = [];

  const buildFloor = (
    blockId: string | null,
    blockName: string | null,
    floorNumber: number,
    floorName: string | undefined,
    roomsDef: number[],
  ) => {
    const floor: Floor = {
      id: newId('floor'),
      propertyId: property.id,
      blockId,
      number: floorNumber,
      name: floorName ?? null,
      order: floorNumber,
    };
    db.floors.push(floor);

    roomsDef.forEach((sharingType, index) => {
      const seq = index + 1;
      const room: Room = {
        id: newId('room'),
        propertyId: property.id,
        floorId: floor.id,
        number: `${blockName ?? ''}${floorNumber}${String(seq).padStart(2, '0')}`,
        label: null,
        sharingType,
        order: seq,
      };
      db.rooms.push(room);

      bedLabels(sharingType).forEach((label, bedIndex) => {
        const bed: Bed = {
          id: newId('bed'),
          propertyId: property.id,
          roomId: room.id,
          label,
          status: 'AVAILABLE',
          order: bedIndex,
        };
        db.beds.push(bed);
        builtBeds.push({ bed, room, blockName });
      });
    });
  };

  if (def.hasBlocks) {
    def.blocks.forEach((blockDef: BlockDef, index) => {
      const block: Block = {
        id: newId('block'),
        propertyId: property.id,
        name: blockDef.name,
        order: index,
      };
      db.blocks.push(block);
      for (const floorDef of blockDef.floors) {
        buildFloor(block.id, blockDef.name, floorDef.number, floorDef.name, blockDef.rooms);
      }
    });
  } else {
    for (const floorDef of def.floors) {
      buildFloor(null, null, floorDef.number, floorDef.name, def.rooms);
    }
  }

  // --- Occupancy -----------------------------------------------------------
  for (const { bed, room, blockName } of builtBeds) {
    if (!rng.chance(def.occupancyRate)) continue;

    const checkInDaysAgo = rng.int(35, 600);
    const checkInISO = isoDaysAgo(checkInDaysAgo, now);
    const tenant = makeTenant(db, rng, names, property.id, checkInISO);
    const rent = rentFor(def, blockName, room.sharingType);
    const maintenance = rng.chance(def.isFlat ? 0.5 : 0.4) ? (def.isFlat ? 100_000 : 50_000) : 0;
    const paymentStatus: PaymentStatus = rng.weighted([
      ['PAID', 68],
      ['PENDING', 22],
      ['OVERDUE', 10],
    ] as const);

    const noticeGiven = rng.chance(0.05) ? addDays(now, -rng.int(1, 10)) : null;

    const tenancy: Tenancy = {
      id: newId('tenancy'),
      propertyId: property.id,
      tenantId: tenant.id,
      bedId: bed.id,
      roomId: room.id,
      status: 'ACTIVE',
      monthlyRent: rent,
      maintenanceCharge: maintenance,
      // Deposits are stored net of the ₹1000 maintenance reserve deducted at move-in.
      securityDeposit: rent * 2 - MAINTENANCE_RESERVE_PAISE,
      depositStatus: 'PENDING',
      paymentStatus,
      paymentDueDay: rng.weighted([
        [5, 6], [1, 2], [2, 1], [3, 1], [4, 1], [6, 1], [7, 1], [10, 1],
      ] as const),
      checkInDate: checkInISO,
      noticeGivenDate: noticeGiven ? noticeGiven.toISOString() : null,
      expectedLeavingDate: noticeGiven ? vacateByDate(noticeGiven).toISOString() : null,
      checkOutDate: null,
    };
    db.tenancies.push(tenancy);
    bed.status = 'OCCUPIED';

    makePayments(db, rng, tenancy, rng.chance(0.85) ? manager.name : ADMIN_ACCOUNT.name, now);

    // Past stay on the same bed for a slice of tenants (stay history demo).
    if (rng.chance(0.08)) {
      const endedCheckOutDaysAgo = checkInDaysAgo + rng.int(5, 30);
      const endedCheckInDaysAgo = endedCheckOutDaysAgo + rng.int(90, 360);
      const pastTenant = makeTenant(db, rng, names, property.id, isoDaysAgo(endedCheckInDaysAgo, now));
      const pastNotice = rng.chance(0.7)
        ? addDays(isoDaysAgo(endedCheckOutDaysAgo, now), -rng.int(15, 25))
        : null;
      const checkOutISO = isoDaysAgo(endedCheckOutDaysAgo, now);
      const ended: Tenancy = {
        id: newId('tenancy'),
        propertyId: property.id,
        tenantId: pastTenant.id,
        bedId: bed.id,
        roomId: room.id,
        status: 'ENDED',
        monthlyRent: rent - 50_000,
        maintenanceCharge: 0,
        securityDeposit: (rent - 50_000) * 2 - MAINTENANCE_RESERVE_PAISE,
        depositStatus: resolveDepositStatusOnVacate(pastNotice, checkOutISO),
        paymentStatus: 'PAID',
        paymentDueDay: 5,
        checkInDate: isoDaysAgo(endedCheckInDaysAgo, now),
        noticeGivenDate: pastNotice ? pastNotice.toISOString() : null,
        expectedLeavingDate: pastNotice ? vacateByDate(pastNotice).toISOString() : null,
        checkOutDate: checkOutISO,
      };
      db.tenancies.push(ended);
    }
  }

  // --- Invoices ------------------------------------------------------------
  const activeTenancies = db.tenancies.filter(
    (t) => t.propertyId === property.id && t.status === 'ACTIVE',
  );
  const currentMonth = startOfMonth(now);
  for (const tenancy of activeTenancies) {
    // Previous months: invoice trail for ~45% of tenancies.
    for (let back = 2; back >= 1; back--) {
      const billingMonth = startOfMonth(addMonths(currentMonth, -back));
      if (billingMonth < startOfMonth(tenancy.checkInDate)) continue;
      if (!rng.chance(0.45)) continue;
      createInvoiceRecord(db, {
        tenancy,
        propertySlug: property.slug,
        billingMonth,
        issueDate: addDays(billingMonth, rng.int(0, 3)),
        failed: rng.chance(0.06),
      });
    }
    // Current month: sent for PAID (60%) and for a slice of unpaid dues (35%).
    const sendChance = tenancy.paymentStatus === 'PAID' ? 0.6 : 0.35;
    if (rng.chance(sendChance)) {
      createInvoiceRecord(db, {
        tenancy,
        propertySlug: property.slug,
        billingMonth: currentMonth,
        issueDate: addDays(currentMonth, rng.int(0, 2)),
        extraChargesPaise: rng.chance(0.12) ? rng.int(2, 8) * 10_000 : 0,
        extraChargesLabel: rng.chance(0.12) ? 'Electricity extra' : null,
        discountPaise: rng.chance(0.08) ? rng.int(2, 5) * 10_000 : 0,
        failed: rng.chance(0.08),
      });
    }
  }

  // --- Complaints ----------------------------------------------------------
  const admin = db.users.find((u) => u.role === 'ADMIN');
  const complaintCount = rng.int(8, 14);
  const poolStart = rng.int(0, COMPLAINT_POOL.length - 1);
  for (let i = 0; i < complaintCount; i++) {
    const template = COMPLAINT_POOL[(poolStart + i) % COMPLAINT_POOL.length];
    const status: ComplaintStatus = rng.weighted([
      ['OPEN', 35],
      ['IN_PROGRESS', 25],
      ['RESOLVED', 40],
    ] as const);
    const priority: ComplaintPriority = rng.weighted([
      ['LOW', 25],
      ['MEDIUM', 50],
      ['HIGH', 25],
    ] as const);
    const linked = rng.chance(0.7) && activeTenancies.length > 0 ? rng.pick(activeTenancies) : null;
    const createdAt = addDays(now, -rng.int(0, 45));
    const assignChance = status === 'RESOLVED' ? 1 : status === 'IN_PROGRESS' ? 0.8 : 0.3;
    const assignee = rng.chance(assignChance)
      ? (rng.chance(0.8) ? manager : admin ?? manager)
      : null;
    let resolvedAt: Date | null = null;
    if (status === 'RESOLVED') {
      resolvedAt = addDays(createdAt, rng.int(1, 7));
      if (resolvedAt > now) resolvedAt = now;
    }

    db.complaints.push({
      id: newId('complaint'),
      propertyId: property.id,
      title: template.title,
      description: template.description,
      status,
      priority,
      assignedToId: assignee?.id ?? null,
      tenantId: linked?.tenantId ?? null,
      roomId: linked?.roomId ?? null,
      createdAt: createdAt.toISOString(),
      updatedAt: (resolvedAt ?? createdAt).toISOString(),
      resolvedAt: resolvedAt ? resolvedAt.toISOString() : null,
    });
  }

  // --- Expense categories + expenses ---------------------------------------
  const categoriesForProperty: { category: ExpenseCategory; subs: ExpenseSubcategory[] }[] = [];
  for (const starter of STARTER_CATEGORIES) {
    const category: ExpenseCategory = {
      id: newId('expcat'),
      propertyId: property.id,
      name: starter.name,
    };
    db.expenseCategories.push(category);
    const subs = starter.subs.map((name) => {
      const sub: ExpenseSubcategory = {
        id: newId('expsub'),
        propertyId: property.id,
        categoryId: category.id,
        name,
      };
      db.expenseSubcategories.push(sub);
      return sub;
    });
    categoriesForProperty.push({ category, subs });
  }

  const expenseCount = rng.int(26, 40);
  for (let i = 0; i < expenseCount; i++) {
    const { category, subs } = rng.pick(categoriesForProperty);
    const pool = EXPENSE_POOL[category.name];
    const sub = subs.length > 0 && rng.chance(0.8) ? rng.pick(subs) : null;
    const date = addDays(now, -rng.int(0, 90));
    const amount = rng.int(pool.minRupees, pool.maxRupees) * 100;
    const note = pool.notes
      ? `${rng.pick(pool.notes)} — ${formatMonthYear(date)}`
      : rng.chance(0.25)
        ? `Bill for ${formatMonthYear(date)}`
        : null;

    db.expenses.push({
      id: newId('expense'),
      propertyId: property.id,
      categoryId: category.id,
      subcategoryId: sub?.id ?? null,
      amount,
      date: date.toISOString(),
      vendor: rng.pick(pool.vendors),
      notes: note,
      receiptKey: rng.chance(0.45) ? `receipts/${property.slug}/rcpt-${i + 1}.jpg` : null,
      createdByName: rng.chance(0.85) ? manager.name : ADMIN_ACCOUNT.name,
      createdAt: date.toISOString(),
    });
  }

  // --- Notifications --------------------------------------------------------
  const propertyPayments = db.payments
    .filter((p) => p.propertyId === property.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const tenantById = new Map(db.tenants.map((t) => [t.id, t]));
  const roomById = new Map(db.rooms.map((r) => [r.id, r]));

  let unreadBudget = 3;
  const pushNotification = (
    kind: AppNotification['kind'],
    title: string,
    body: string,
    createdAt: string,
  ) => {
    db.notifications.push({
      id: newId('notification'),
      propertyId: property.id,
      kind,
      title,
      body,
      createdAt,
      read: unreadBudget-- <= 0,
    });
  };

  for (const payment of propertyPayments.slice(0, 3)) {
    const tenant = tenantById.get(payment.tenantId);
    if (!tenant) continue;
    pushNotification(
      'PAYMENT',
      'Rent received',
      `${tenant.fullName} paid ${formatINR(payment.amount)} for ${formatMonthYear(payment.forMonth)}.`,
      payment.createdAt,
    );
  }

  const openComplaints = db.complaints
    .filter((c) => c.propertyId === property.id && c.status === 'OPEN')
    .slice(0, 3);
  for (const complaint of openComplaints) {
    const room = complaint.roomId ? roomById.get(complaint.roomId) : null;
    pushNotification(
      'COMPLAINT',
      'New complaint',
      `${complaint.title}${room ? ` — Room ${room.number}` : ''}.`,
      complaint.createdAt,
    );
  }

  const overdue = activeTenancies.filter((t) => t.paymentStatus === 'OVERDUE').slice(0, 2);
  for (const tenancy of overdue) {
    const tenant = tenantById.get(tenancy.tenantId);
    const room = roomById.get(tenancy.roomId);
    if (!tenant || !room) continue;
    pushNotification(
      'PAYMENT',
      'Rent overdue',
      `${tenant.fullName} (${property.isFlat ? 'Flat' : 'Room'} ${room.number}) has an overdue balance of ${formatINR(tenancy.monthlyRent + tenancy.maintenanceCharge)}.`,
      isoDaysAgo(rng.int(1, 3), now),
    );
  }

  const noticed = activeTenancies.filter((t) => t.noticeGivenDate).slice(0, 2);
  for (const tenancy of noticed) {
    const tenant = tenantById.get(tenancy.tenantId);
    if (!tenant || !tenancy.expectedLeavingDate) continue;
    pushNotification(
      'TENANT',
      'Notice given',
      `${tenant.fullName} plans to vacate by ${formatFullDate(tenancy.expectedLeavingDate)}.`,
      tenancy.noticeGivenDate as string,
    );
  }

  pushNotification(
    'SYSTEM',
    'Rent cycle reset',
    `Payment statuses were reset for ${formatMonthYear(now)}. ${activeTenancies.length} active tenancies to collect.`,
    startOfMonth(now).toISOString(),
  );
}

// ---------------------------------------------------------------------------
// Build + singleton
// ---------------------------------------------------------------------------

function buildDatabase(): MockDatabase {
  const now = new Date();
  const db: MockDatabase = {
    users: [],
    credentials: {},
    properties: [],
    blocks: [],
    floors: [],
    rooms: [],
    beds: [],
    tenants: [],
    tenancies: [],
    payments: [],
    invoices: [],
    complaints: [],
    expenses: [],
    expenseCategories: [],
    expenseSubcategories: [],
    notifications: [],
  };

  db.users.push({
    id: newId('user'),
    name: ADMIN_ACCOUNT.name,
    email: ADMIN_ACCOUNT.email,
    role: 'ADMIN',
    isActive: true,
    propertyId: null,
  });
  db.credentials[ADMIN_ACCOUNT.email] = ADMIN_ACCOUNT.password;

  for (const def of PROPERTY_DEFS) {
    generateProperty(db, def, now);
  }

  // Newest-first notifications.
  db.notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return db;
}

let database: MockDatabase = buildDatabase();

type Listener = () => void;
const listeners = new Set<Listener>();

/** Direct handle for queries/actions. Do not mutate outside actions.ts. */
export function getDb(): MockDatabase {
  return database;
}

/** Subscribe to any mock-data mutation. Returns an unsubscribe function. */
export function subscribeToDb(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Actions call this after mutating so hooks refetch. */
export function notifyDbChanged(): void {
  for (const listener of listeners) listener();
}

/** Rebuild the dataset from scratch (dev/demo reset). */
export function resetDb(): void {
  database = buildDatabase();
  notifyDbChanged();
}
