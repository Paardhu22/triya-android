import { request, setSession, setActiveProperty, type Session, type AccessibleProperty } from '../src/data/client';
import { clearData, setProperties, loadSnapshot, getDb } from '../src/data/db';
import { getTenantList, getTenantProfile, getRentReport, getFloorLayout, getExpenses, getCollectionsData, getDashboardData } from '../src/data/queries';
import { DEFAULT_FILTERS, applyExpenseFilters } from '../src/utils/expenseFilters';
import { toCsv } from '../src/utils/csv';

const url = process.env.EXPO_PUBLIC_API_URL ?? '';
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Run against the isolated local mobile API test server after check-mobile-api.ts.');
let checks = 0;
function check(value: unknown, message: string) { if (!value) throw new Error(message); checks++; }
async function main() {
  clearData();
  check(getDb().tenants.length === 0 && getDb().users.length === 0, 'App starts without seeded tenants or accounts');
  const session = await request<Session>('login', { method: 'POST', body: JSON.stringify({ email: 'admin@mobile.test', password: 'MobileTest@123' }) });
  setSession(session);
  try {
    const { properties } = await request<{ properties: AccessibleProperty[] }>('session');
    setProperties(properties);
    const a = properties.find(p => p.slug === 'mobile-test-a')!;
    setActiveProperty(a.id);
    await Promise.all([loadSnapshot(), loadSnapshot()]);
    check(getTenantList(a.id).length === 1, 'Tenant selector reads only the server property');
    const tenant = getDb().tenants[0];
    const profile = getTenantProfile(tenant.id)!;
    check(profile.active === null && profile.stays[0].status === 'ENDED', 'Profile reflects server vacate');
    check(profile.payments[0].amount === 100001, 'Profile reads the real split receipt');
    const report = getRentReport(a.id);
    check(report.summary.collectedPaise === 100001 && report.summary.cashPaise === 50000 && report.summary.onlinePaise === 50001, 'Reports reconcile exact cash and online paise');
    check(getCollectionsData(a.id).length === 0, 'Ended tenancies leave current dues');
    const floor = getDb().floors[0];
    check(getFloorLayout(floor.id)[0].beds[0].tenancy === null, 'Floor reflects freed bed');
    check(getDashboardData(a.id).occupiedBeds === 0, 'Dashboard occupancy reflects server state');
    const expenses = getExpenses(a.id);
    check(expenses[0].amount === 12345, 'Expenses use server amount');
    check(applyExpenseFilters(expenses, { ...DEFAULT_FILTERS, amountMin: '123.46' }).length === 0, 'Minimum expense filter compares paise correctly');
    check(applyExpenseFilters(expenses, { ...DEFAULT_FILTERS, amountMax: '123.45', hasReceipt: 'no' }).length === 1, 'Maximum and receipt filters match boundaries');
    check(applyExpenseFilters(expenses, { ...DEFAULT_FILTERS, vendor: 'VENDOR' }).length === 1, 'Vendor filter is case insensitive');
    check(toCsv([['=1+1', 'a,"b', 'a\nb', 12]]) === '"\'=1+1","a,""b","a\nb","12"', 'CSV escapes content and neutralizes formulas');
    clearData();
    check(getDb().tenants.length === 0 && getDb().payments.length === 0, 'Sign-out clears cached personal and financial data');
    console.log(`Android data integration: ${checks} checks passed.`);
  } finally { await request('session', { method: 'DELETE' }); setSession(null); setActiveProperty(null); clearData(); }
}
void main();
