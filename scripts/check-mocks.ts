import { getDb } from '@/mocks/db';
import {
  authenticate,
  getCollections,
  getDashboardData,
  getFloorLayout,
  getFloorNavigation,
  getInvoiceHistory,
  getTenantList,
  getTenantProfile,
  listLoginUsers,
  listPropertiesFor,
} from '@/mocks/queries';
import { markRentPaid, sendInvoice } from '@/mocks/actions';

const db = getDb();
console.log('users', db.users.length, '|', db.users.map((u) => u.email).join(', '));
console.log('properties', db.properties.length, '| blocks', db.blocks.length, '| floors', db.floors.length, '| rooms', db.rooms.length, '| beds', db.beds.length);
console.log('tenants', db.tenants.length, '| tenancies', db.tenancies.length, '| payments', db.payments.length, '| invoices', db.invoices.length);
console.log('complaints', db.complaints.length, '| expenses', db.expenses.length, '| notifications', db.notifications.length);

const admin = authenticate('admin@triya.local', 'Admin@12345');
console.log('admin auth ok:', Boolean(admin), '| bad auth null:', authenticate('admin@triya.local', 'nope') === null, '| login users:', listLoginUsers().length);

for (const property of db.properties) {
  const dash = getDashboardData(property.id);
  console.log(`\n${property.name}: rooms=${dash.totalRooms} beds=${dash.totalBeds} occ=${dash.occupiedBeds} paid=${dash.paidCount} pending=${dash.pendingCount} collected=₹${dash.monthlyCollections / 100} spent=₹${dash.monthlyExpenses / 100}`);
  console.log(`  sharing=${JSON.stringify(dash.sharingBreakdown.map((s) => `${s.sharingType}p:${s.rooms}r`))} blocks=[${dash.blockBreakdown.map((b) => `${b.name}:${b.occupied}/${b.beds}`).join(' ')}]`);
  const nav = getFloorNavigation(property.id);
  const firstFloor = nav.hasBlocks ? nav.blocks[0].floors[0] : nav.floors[0];
  const layout = getFloorLayout(firstFloor.id);
  console.log(`  nav: hasBlocks=${nav.hasBlocks} blocks=${nav.blocks.length} rootFloors=${nav.floors.length}; floor1 rooms=${layout.length} room[0]=${layout[0].number} beds=${layout[0].beds.length} occupiedTenant=${layout.flatMap(r => r.beds).find(b => b.tenancy)?.tenancy?.tenant.fullName}`);
  const collections = getCollections(property.id);
  console.log(`  collections=${collections.length} sample="${collections[0]?.tenant.fullName}" ${collections[0]?.roomNumber}·${collections[0]?.bedLabel} lastInv=${collections[0]?.lastInvoiceAt ? 'yes' : 'never'} | invoices=${getInvoiceHistory(property.id).length} tenants=${getTenantList(property.id).length}`);
}

if (admin) {
  const properties = listPropertiesFor(admin);
  console.log('\nadmin sees:', properties.map((p) => p.name).join(' | '));
  const rows = getCollections(properties[0].id);
  const unpaid = rows.find((r) => r.paymentStatus !== 'PAID');
  if (unpaid) {
    console.log('markRentPaid:', JSON.stringify(markRentPaid({ tenancyId: unpaid.id, method: 'ONLINE', recordedByName: admin.name })));
    console.log('now:', getCollections(properties[0].id).find((r) => r.id === unpaid.id)?.paymentStatus);
    console.log('sendInvoice:', JSON.stringify(sendInvoice({ tenancyId: unpaid.id, extraChargesPaise: 20000, extraChargesLabel: 'Laundry' })));
  }
  const withActive = getTenantList(properties[0].id).find((t) => t.active);
  if (withActive) {
    const profile = getTenantProfile(withActive.id);
    console.log('profile:', profile?.tenant.fullName, '| stays:', profile?.stays.length, '| payments:', profile?.payments.length, '| active room:', profile?.active?.roomNumber, '| deposit:', profile?.active?.securityDeposit);
  }
}
