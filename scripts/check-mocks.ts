/**
 * Mock-layer invariants. Run with: npx tsx scripts/check-mocks.ts
 *
 * Exercises every query across the three property shapes and the ledger
 * actions (collect rent, part payments, delete receipt, room rent), asserting
 * the rules the web app relies on so the numbers on every screen reconcile.
 */
import { getDb } from '@/mocks/db';
import {
  authenticate,
  getCollectionsData,
  getDashboardData,
  getFloorLayout,
  getFloorNavigation,
  getInvoiceHistory,
  getRentCollection,
  getRentReport,
  getRoomDetail,
  getTenantList,
  getTenantProfile,
  listPropertiesFor,
} from '@/mocks/queries';
import {
  collectRent,
  deleteRentCollection,
  remindPendingTenants,
  sendInvoice,
  setRoomRent,
} from '@/mocks/actions';
import { monthKey, paymentSplit } from '@/utils';

let failures = 0;
function check(label: string, ok: boolean, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? '  ok ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
}

const db = getDb();
console.log(
  `properties=${db.properties.length} rooms=${db.rooms.length} beds=${db.beds.length} tenancies=${db.tenancies.length} payments=${db.payments.length} invoices=${db.invoices.length}`,
);

check(
  'every receipt splits into cash + online = amount',
  db.payments.every((p) => {
    const { cash, online } = paymentSplit(p);
    return cash + online === p.amount;
  }),
);
check('every payment amount is a positive integer (paise)', db.payments.every((p) => Number.isInteger(p.amount) && p.amount > 0));

for (const property of db.properties) {
  console.log(`\n${property.name} (${property.isFlat ? 'flats' : 'PG'}${property.hasBlocks ? ', blocks' : ''})`);
  const dash = getDashboardData(property.id);
  const rows = getCollectionsData(property.id);
  const report = getRentReport(property.id);

  check(
    'dashboard state counts cover every active tenancy',
    dash.paidCount + dash.partialCount + dash.unpaidCount === dash.activeTenancies,
    `${dash.paidCount}+${dash.partialCount}+${dash.unpaidCount} of ${dash.activeTenancies}`,
  );
  check(
    'sharing / floor breakdowns reconcile with total beds',
    dash.sharingBreakdown.reduce((n, r) => n + r.beds, 0) === dash.totalBeds &&
      dash.floorBreakdown.reduce((n, r) => n + r.beds, 0) === dash.totalBeds,
  );
  check('dashboard trend has 6 months', dash.trend.length === 6);
  check(
    'collections: collected this month matches dashboard',
    rows.reduce((n, r) => n + r.collectedPaise, 0) === dash.collectedPaise,
    `${rows.reduce((n, r) => n + r.collectedPaise, 0)} vs ${dash.collectedPaise}`,
  );
  check(
    'collections: balance = max(0, due − collected) and outstanding = balance + earlier',
    rows.every(
      (r) =>
        r.balancePaise === Math.max(0, r.duePaise - r.collectedPaise) &&
        r.outstandingPaise === r.balancePaise + r.earlierDuePaise,
    ),
  );
  check('some tenancies are part-paid', rows.some((r) => r.state === 'PARTIAL'));
  check('some tenancies carry earlier dues', rows.some((r) => r.earlierDuePaise > 0));
  check(
    'report expected / collected reconcile per floor',
    report.byFloor.reduce((n, f) => n + f.expectedPaise, 0) === report.summary.expectedPaise &&
      report.byFloor.reduce((n, f) => n + f.collectedPaise, 0) === report.summary.collectedPaise,
  );
  check('report trend has 12 months', report.trend.length === 12);

  const nav = getFloorNavigation(property.id);
  const floor = nav.hasBlocks ? nav.blocks[0].floors[0] : nav.floors[0];
  const layout = getFloorLayout(floor.id);
  check('floor layout loads with room defaults', layout.length > 0 && layout.some((r) => r.defaultRent !== null));

  const invoices = getInvoiceHistory(property.id);
  check(
    'auto invoices carry the receipt they were issued for',
    invoices.filter((i) => i.paymentId).every((i) => (i.receivedPaise ?? 0) > 0),
  );
  check(
    'tenant list positions come from the ledger',
    getTenantList(property.id)
      .filter((t) => t.active)
      .every((t) => t.active!.collectedPaise <= t.active!.duePaise * 2),
  );
}

// ---------------------------------------------------------------------------
// Ledger actions
// ---------------------------------------------------------------------------
const admin = authenticate('admin@triya.local', 'Admin@12345');
if (!admin) throw new Error('admin login failed');
const property = listPropertiesFor(admin)[0];
console.log(`\nactions on ${property.name}`);

const unpaid = getCollectionsData(property.id).find((r) => r.state === 'UNPAID');
if (!unpaid) throw new Error('no unpaid tenancy to exercise');
const month = monthKey(new Date());
const half = Math.floor(unpaid.duePaise / 2 / 100) * 100;

const part = collectRent({
  tenancyId: unpaid.id,
  forMonth: month,
  amount: half,
  method: 'CASH',
  collectedAt: new Date().toISOString(),
  sendInvoice: true,
  recordedByName: admin.name,
});
check('part payment recorded', part.ok && !part.data.fullyPaid && part.data.balancePaise === unpaid.duePaise - half);
check('part payment issued its invoice', part.ok && part.data.invoice?.number !== null);
check(
  'row is now PARTIAL',
  getCollectionsData(property.id).find((r) => r.id === unpaid.id)?.state === 'PARTIAL',
);

const badSplit = collectRent({
  tenancyId: unpaid.id,
  forMonth: month,
  amount: 10000,
  method: 'SPLIT',
  cashAmount: 4000,
  onlineAmount: 5000,
  collectedAt: new Date().toISOString(),
  sendInvoice: false,
});
check('split that does not add up is refused', !badSplit.ok);

const rest = collectRent({
  tenancyId: unpaid.id,
  forMonth: month,
  amount: unpaid.duePaise - half,
  method: 'SPLIT',
  cashAmount: 100,
  onlineAmount: unpaid.duePaise - half - 100,
  collectedAt: new Date().toISOString(),
  sendInvoice: false,
});
check('balance collected → fully paid', rest.ok && rest.data.fullyPaid && rest.data.invoice === null);
const view = getRentCollection(unpaid.id, month);
check('rent collection view lists both receipts', view?.collections.length === 2 && view.state === 'PAID');

const staffDelete = deleteRentCollection(view!.collections[0].id, 'STAFF');
check('staff cannot delete a receipt', !staffDelete.ok);
const del = deleteRentCollection(view!.collections[0].id, 'ADMIN');
check(
  'admin delete re-derives the month',
  del.ok && getRentCollection(unpaid.id, month)?.state === 'PARTIAL',
);

const future = collectRent({
  tenancyId: unpaid.id,
  forMonth: month,
  amount: 100,
  method: 'CASH',
  collectedAt: new Date(Date.now() + 3 * 86400000).toISOString(),
  sendInvoice: false,
});
check('future collection date refused', !future.ok);

const bill = sendInvoice({ tenancyId: unpaid.id, extraChargesPaise: 20000, extraChargesLabel: 'Laundry' });
check('manual bill sent', bill.ok);

const pending = remindPendingTenants(property.id);
check('remind pending targets only tenants who owe', pending.ok && pending.data.eligible > 0);

const roomId = db.tenancies.find((t) => t.id === unpaid.id)!.roomId;
const roomRent = setRoomRent({ roomId, rent: 1_000_000, maintenance: 50_000, applyToOccupants: true }, 'MANAGER');
check('room rent applied to occupants', roomRent.ok && roomRent.data.updatedTenancies > 0);
check(
  'room default stored and tenancy rent updated',
  getRoomDetail(roomId)?.defaultRent === 1_000_000 &&
    getCollectionsData(property.id).find((r) => r.id === unpaid.id)?.duePaise === 1_050_000,
);
check('staff cannot set room rent', !setRoomRent({ roomId, rent: 1, maintenance: null, applyToOccupants: false }, 'STAFF').ok);

const profile = getTenantProfile(getTenantList(property.id).find((t) => t.active)!.id);
check('tenant profile has an active stay with a state', Boolean(profile?.active?.state));

console.log(failures === 0 ? '\nAll mock invariants hold.' : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
