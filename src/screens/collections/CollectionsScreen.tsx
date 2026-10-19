import { openStoredFile } from '@/data/client';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  ActionSheet,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FilterChips,
  GroupedItem,
  Icon,
  LargeTitle,
  MonthPicker,
  Screen,
  SearchBar,
  SegmentedControl,
  SkeletonCardList,
  StatCell,
  StatGrid,
  StatusBadge,
  Surface,
  TopBar,
  Typography,
  toast,
  useScrollHeader,
} from '@/components';
import { InvoiceCard } from '@/components/cards/InvoiceCard';
import { COLLECTION_STATE_META } from '@/constants';
import { useAction, useCollections, useInvoiceHistory } from '@/hooks';
import {
  getCollectionMonthOptions,
  remindAllTenants,
  remindPendingTenants,
  resendInvoice,
  sendRentReminder,
  type CollectionRow,
  type InvoiceHistoryRow,
} from '@/data';
import { useActiveProperty } from '@/store';
import { colors, spacing, GUTTER } from '@/theme';
import {
  PAYMENT_FILTER_OPTIONS,
  bedLocationShort,
  formatDayMonth,
  formatINR,
  formatINRCompact,
  matchesPaymentFilter,
  monthKey,
  type PaymentFilter,
} from '@/utils';
import { CollectRentSheet } from './CollectRentSheet';
import { SendInvoiceSheet } from './SendInvoiceSheet';

type DuesFilter = PaymentFilter | 'EARLIER';
type Segment = 'DUES' | 'INVOICES';
type InvoiceFilter = 'ALL' | 'SENT' | 'FAILED';

const FILTERS: { value: DuesFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  ...PAYMENT_FILTER_OPTIONS.filter((o) => o.value !== 'ALL'),
  { value: 'EARLIER', label: 'Earlier dues' },
];

function matches(filter: DuesFilter, row: CollectionRow): boolean {
  return filter === 'EARLIER' ? row.earlierDuePaise > 0 : matchesPaymentFilter(filter, row);
}

type ReminderKind = 'PENDING' | 'ALL';

/**
 * CollectionsScreen
 *
 * The web collections page on a phone. Dues for any billing month (month
 * picker), the web's payment filters with counts, and per-tenant rows showing
 * due / collected / balance / earlier dues with the collection state; tapping
 * a row opens its actions (Collect Rent, Send Invoice, Rent Reminder).
 * "Remind" offers both web bulk actions — only tenants with rent pending, or
 * everyone. Invoice History lists every invoice with resend.
 */
export function CollectionsScreen() {
  const router = useRouter();
  const property = useActiveProperty();
  const { scrollY, onScroll } = useScrollHeader();

  const currentMonth = monthKey(new Date());
  const [month, setMonth] = useState(currentMonth);
  const isCurrentMonth = month === currentMonth;
  const monthOptions = useMemo(() => getCollectionMonthOptions(), []);

  const dues = useCollections(property.id, month);
  // Reminders always describe today's position, whichever month is viewed.
  const currentDues = useCollections(property.id, undefined, !isCurrentMonth);
  const invoicesQuery = useInvoiceHistory(property.id);

  const rows = useMemo(() => dues.data ?? [], [dues.data]);
  const invoices = useMemo(() => invoicesQuery.data ?? [], [invoicesQuery.data]);
  const pendingCount = ((isCurrentMonth ? dues.data : currentDues.data) ?? []).filter((r) => r.outstandingPaise > 0).length;

  const [segment, setSegment] = useState<Segment>('DUES');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DuesFilter>('ALL');
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('ALL');

  // Sheets
  const [actionRow, setActionRow] = useState<CollectionRow | null>(null);
  const [collectFor, setCollectFor] = useState<string | null>(null);
  const [invoiceFor, setInvoiceFor] = useState<string | null>(null);
  const [invoiceAction, setInvoiceAction] = useState<InvoiceHistoryRow | null>(null);
  const [remindMenu, setRemindMenu] = useState(false);
  const [remindConfirm, setRemindConfirm] = useState<ReminderKind | null>(null);

  const { busy: reminding, run: runRemind } = useAction();

  const counts = useMemo(
    () =>
      Object.fromEntries(FILTERS.map((f) => [f.value, rows.filter((r) => matches(f.value, r)).length])) as Record<
        DuesFilter,
        number
      >,
    [rows],
  );

  const query = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          matches(filter, r) &&
          (!query ||
            `${r.tenant.fullName} ${r.tenant.phone} ${r.roomNumber}`.toLowerCase().includes(query)),
      ),
    [rows, filter, query],
  );

  const totals = useMemo(
    () =>
      filtered.reduce(
        (sum, r) => ({
          due: sum.due + r.duePaise,
          collected: sum.collected + r.collectedPaise,
          cash: sum.cash + r.cashPaise,
          online: sum.online + r.onlinePaise,
          balance: sum.balance + r.balancePaise,
          earlier: sum.earlier + r.earlierDuePaise,
        }),
        { due: 0, collected: 0, cash: 0, online: 0, balance: 0, earlier: 0 },
      ),
    [filtered],
  );

  const notSent = invoices.filter((i) => i.status === 'FAILED').length;
  const shownInvoices = useMemo(
    () =>
      invoices.filter(
        (i) =>
          (invoiceFilter === 'ALL' || i.status === invoiceFilter) &&
          (!query ||
            `${i.tenantName} ${i.roomNumber} ${i.number}`.toLowerCase().includes(query)),
      ),
    [invoices, invoiceFilter, query],
  );

  const onRemindOne = useCallback(
    async (tenancyId: string) => {
      const res = await runRemind(() => sendRentReminder(tenancyId));
      if (res.ok) toast.success('Rent reminder sent', { description: `Sent to ${res.data.tenantName} on WhatsApp.` });
      else toast.error(res.error);
    },
    [runRemind],
  );

  async function onConfirmRemind() {
    if (!remindConfirm) return;
    const res = await runRemind(() =>
      remindConfirm === 'PENDING' ? remindPendingTenants(property.id) : remindAllTenants(property.id),
    );
    setRemindConfirm(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const { sent, failed, skipped, eligible } = res.data;
    const undelivered = failed + skipped;
    const who = remindConfirm === 'PENDING' ? ' with rent pending' : '';
    if (eligible === 0) toast.success('Nobody has rent pending — no reminders were needed.');
    else if (sent === 0) toast.error('No rent reminders could be sent.');
    else
      toast.success(`Reminders sent to ${sent} tenant${sent === 1 ? '' : 's'}${who}.`, {
        description:
          undelivered > 0
            ? `${undelivered} could not be sent (no phone number or delivery failed).`
            : undefined,
      });
  }

  async function onResend(invoice: InvoiceHistoryRow) {
    const res = await runRemind(() => resendInvoice(invoice.id));
    if (res.ok) toast.success('Invoice resent on WhatsApp', { description: invoice.number });
    else toast.error(res.error);
  }

  const renderDue = useCallback(
    ({ item, index }: { item: CollectionRow; index: number }) => (
      <GroupedItem index={index} count={filtered.length}>
        <DueRow row={item} isFlat={property.isFlat} onPress={() => setActionRow(item)} />
      </GroupedItem>
    ),
    [filtered.length, property.isFlat],
  );

  const renderInvoice = useCallback(
    ({ item, index }: { item: InvoiceHistoryRow; index: number }) => (
      <GroupedItem index={index} count={shownInvoices.length}>
        <InvoiceCard invoice={item} isFlat={property.isFlat} onPress={() => setInvoiceAction(item)} />
      </GroupedItem>
    ),
    [shownInvoices.length, property.isFlat],
  );

  const loading = segment === 'DUES' ? dues.isLoading : invoicesQuery.isLoading;

  const header = (
    <View style={styles.header}>
      <LargeTitle
        title="Collections"
        subtitle="Rent and maintenance dues for every active tenant in this property."
        scrollY={scrollY}
      />
      <SegmentedControl
        value={segment}
        onChange={setSegment}
        options={[
          { value: 'DUES', label: 'Dues' },
          { value: 'INVOICES', label: `Invoice history` },
        ]}
      />

      {segment === 'DUES' ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.headerSection}>
          <View style={styles.toolbar}>
            <MonthPicker
              value={month}
              options={monthOptions}
              onChange={setMonth}
              loading={dues.isFetching}
            />
            <Button
              title={pendingCount > 0 ? `Remind · ${pendingCount}` : 'Remind'}
              icon="bell-ring-outline"
              size="sm"
              variant="outline"
              onPress={() => setRemindMenu(true)}
            />
          </View>

          <Surface>
            <StatGrid>
              <StatCell label="Month due" value={totals.due} format={formatINRCompact} hint={`${filtered.length} of ${rows.length} tenants`} />
              <StatCell
                label="Collected"
                value={totals.collected}
                format={formatINRCompact}
                hint={`Cash ${formatINRCompact(totals.cash)} · Online ${formatINRCompact(totals.online)}`}
              />
              <StatCell
                label="Balance"
                value={totals.balance}
                format={formatINRCompact}
                valueColor={totals.balance > 0 ? colors.error : undefined}
                hint="Still due this month"
              />
              <StatCell
                label="Earlier dues"
                value={totals.earlier}
                format={formatINRCompact}
                hint={`${counts.EARLIER ?? 0} tenant${counts.EARLIER === 1 ? '' : 's'} in arrears`}
              />
            </StatGrid>
          </Surface>

          <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, phone or room" />
          <FilterChips
            value={filter}
            onChange={setFilter}
            inset={GUTTER}
            options={FILTERS.map((f) => ({ ...f, count: counts[f.value] }))}
          />
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(200)} style={styles.headerSection}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search tenant, room or invoice #" />
          <FilterChips
            value={invoiceFilter}
            onChange={setInvoiceFilter}
            inset={GUTTER}
            options={[
              { value: 'ALL', label: 'All', count: invoices.length },
              { value: 'SENT', label: 'Sent', count: invoices.length - notSent },
              { value: 'FAILED', label: 'Not sent', count: notSent },
            ]}
          />
        </Animated.View>
      )}
    </View>
  );

  return (
    <Screen edges={['top']} padded={false} background={colors.canvas}>
      <TopBar title="Collections" scrollY={scrollY} />

      {loading ? (
        <View style={styles.content}>
          {header}
          <SkeletonCardList rows={5} />
        </View>
      ) : dues.error && !dues.data ? (
        <ErrorState message={dues.error} onRetry={dues.refetch} />
      ) : segment === 'DUES' ? (
        <Animated.FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderDue}
          ListHeaderComponent={header}
          contentContainerStyle={styles.content}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onRefresh={dues.refresh}
          refreshing={dues.isRefreshing}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          style={dues.isFetching ? styles.fetching : undefined}
          ListEmptyComponent={
            <EmptyState
              icon="inbox-outline"
              title={
                rows.length === 0
                  ? 'No active tenants owe rent for this month.'
                  : 'No tenants match your filters.'
              }
            />
          }
          ListFooterComponent={
            filtered.length > 0 ? (
              <Typography variant="small" color="textTertiary" style={styles.footer}>
                {filtered.length} of {rows.length} active tenants
              </Typography>
            ) : null
          }
        />
      ) : (
        <Animated.FlatList
          data={shownInvoices}
          keyExtractor={(item) => item.id}
          renderItem={renderInvoice}
          ListHeaderComponent={header}
          contentContainerStyle={styles.content}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onRefresh={invoicesQuery.refresh}
          refreshing={invoicesQuery.isRefreshing}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <EmptyState
              icon="receipt"
              title={
                invoices.length === 0
                  ? 'No invoices have been generated for this property yet.'
                  : 'No invoices match this filter.'
              }
            />
          }
          ListFooterComponent={
            shownInvoices.length > 0 ? (
              <Typography variant="small" color="textTertiary" style={styles.footer}>
                {shownInvoices.length} of {invoices.length} invoices
              </Typography>
            ) : null
          }
        />
      )}

      {/* Row actions — the web's per-row Actions menu */}
      <ActionSheet
        visible={actionRow !== null}
        onClose={() => setActionRow(null)}
        title={actionRow?.tenant.fullName ?? ''}
        subtitle={
          actionRow
            ? `${bedLocationShort(actionRow.roomNumber, actionRow.bedLabel, property.isFlat)} · ${formatINR(actionRow.outstandingPaise)} outstanding`
            : undefined
        }
        actions={
          actionRow
            ? [
                {
                  label: 'Collect rent',
                  description: 'Record a full or part payment',
                  icon: 'cash-plus',
                  onPress: () => setCollectFor(actionRow.id),
                },
                {
                  label: 'Send invoice',
                  description: 'Bill the tenant before payment',
                  icon: 'receipt',
                  onPress: () => setInvoiceFor(actionRow.id),
                },
                {
                  label: 'Rent reminder',
                  description:
                    isCurrentMonth && actionRow.outstandingPaise === 0
                      ? 'Nothing outstanding'
                      : 'WhatsApp message with their balance',
                  icon: 'bell-ring-outline',
                  // A past month's row cannot tell whether anything is still
                  // owed today — let the action decide (web rule).
                  disabled: isCurrentMonth && actionRow.outstandingPaise === 0,
                  onPress: () => onRemindOne(actionRow.id),
                },
                {
                  label: 'View tenant profile',
                  icon: 'account-outline',
                  onPress: () => router.push(`/(main)/tenants/${actionRow.tenant.id}` as never),
                },
              ]
            : []
        }
      />

      <ActionSheet
        visible={invoiceAction !== null}
        onClose={() => setInvoiceAction(null)}
        title={invoiceAction?.number ?? ''}
        subtitle={invoiceAction ? `${invoiceAction.tenantName} · ${formatINR(invoiceAction.totalPaise)}` : undefined}
        actions={
          invoiceAction
            ? [
                {
                  label: 'Open invoice PDF', icon: 'file-pdf-box',
                  onPress: async () => {
                    try { await openStoredFile(invoiceAction.storageKey); }
                    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not open invoice'); }
                  },
                },
                {
                  label: invoiceAction.status === 'FAILED' ? 'Send on WhatsApp' : 'Resend on WhatsApp',
                  description:
                    invoiceAction.status === 'FAILED'
                      ? invoiceAction.lastError ?? 'Delivery failed'
                      : 'Send the stored PDF again',
                  icon: 'whatsapp',
                  onPress: () => onResend(invoiceAction),
                },
                {
                  label: 'View tenant profile',
                  icon: 'account-outline',
                  onPress: () => router.push(`/(main)/tenants/${invoiceAction.tenantId}` as never),
                },
              ]
            : []
        }
      />

      <ActionSheet
        visible={remindMenu}
        onClose={() => setRemindMenu(false)}
        title="Rent reminders"
        subtitle="Each message states that tenant's own balance."
        actions={[
          {
            label: `Remind pending · ${pendingCount}`,
            description: 'Unpaid or part-paid this month, or an unpaid earlier month',
            icon: 'bell-ring-outline',
            disabled: pendingCount === 0,
            onPress: () => setRemindConfirm('PENDING'),
          },
          {
            label: 'Remind everyone',
            description: 'Every active tenant, including those fully paid',
            icon: 'account-group-outline',
            onPress: () => setRemindConfirm('ALL'),
          },
        ]}
      />

      <ConfirmDialog
        visible={remindConfirm !== null}
        title={remindConfirm === 'PENDING' ? 'Remind tenants with rent pending' : 'Remind everyone'}
        message={
          remindConfirm === 'PENDING'
            ? `This sends a reminder to the ${pendingCount} tenant${pendingCount === 1 ? '' : 's'} who have not paid in full. Fully paid tenants are not messaged.`
            : 'This sends a WhatsApp reminder to every active tenant. Fully paid tenants are thanked instead of asked to pay.'
        }
        confirmLabel="Send reminders"
        loading={reminding}
        onConfirm={onConfirmRemind}
        onCancel={() => setRemindConfirm(null)}
      />

      <CollectRentSheet
        visible={collectFor !== null}
        tenancyId={collectFor}
        defaultMonth={month}
        onClose={() => setCollectFor(null)}
      />
      <SendInvoiceSheet
        visible={invoiceFor !== null}
        tenancyId={invoiceFor}
        month={month}
        isFlat={property.isFlat}
        onClose={() => setInvoiceFor(null)}
      />
    </Screen>
  );
}

/** One tenant's dues for the month — replaces the web dues table row. */
function DueRow({ row, isFlat, onPress }: { row: CollectionRow; isFlat: boolean; onPress: () => void }) {
  const overdue = row.status === 'OVERDUE';
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.surfacePressed }}
      style={({ pressed }) => [styles.due, pressed && styles.duePressed]}
      accessibilityRole="button"
      accessibilityLabel={`${row.tenant.fullName}, balance ${formatINR(row.balancePaise)}`}
    >
      <View style={styles.dueMain}>
        <View style={styles.dueText}>
          <Typography variant="bodyMedium" numberOfLines={1}>
            {row.tenant.fullName}
          </Typography>
          <Typography variant="small" color="textSecondary" numberOfLines={1}>
            {bedLocationShort(row.roomNumber, row.bedLabel, isFlat)} · {row.tenant.phone}
          </Typography>
        </View>
        <View style={styles.dueRight}>
          <Typography variant="number" colorValue={row.balancePaise > 0 ? colors.text : colors.textSecondary}>
            {formatINR(row.balancePaise)}
          </Typography>
          <Typography variant="small" color="textTertiary">
            balance
          </Typography>
        </View>
      </View>

      <View style={styles.dueMeta}>
        <StatusBadge meta={COLLECTION_STATE_META[row.state]} size="sm" />
        {row.state !== 'PAID' && (
          <Typography variant="smallMedium" colorValue={overdue ? colors.error : colors.textSecondary}>
            {overdue ? 'Overdue' : 'Due'} {formatDayMonth(row.dueDate)}
          </Typography>
        )}
        <View style={styles.dueSpacer} />
        <Typography variant="small" color="textSecondary">
          {formatINR(row.collectedPaise)} / {formatINR(row.duePaise)}
          {row.collectionCount > 1 ? ` (${row.collectionCount})` : ''}
        </Typography>
      </View>

      {row.earlierDuePaise > 0 && (
        <View style={styles.earlier}>
          <Icon name="history" size={13} color={colors.warning} />
          <Typography variant="small" colorValue={colors.warning}>
            + {formatINR(row.earlierDuePaise)} earlier ({row.earlierDueMonths.length} mo)
          </Typography>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: GUTTER,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  headerSection: {
    gap: spacing.md,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  fetching: {
    opacity: 0.6,
  },
  footer: {
    textAlign: 'center',
    paddingTop: spacing.md,
  },
  due: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 6,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  duePressed: {
    backgroundColor: colors.canvas,
  },
  dueMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dueText: {
    flex: 1,
    gap: 2,
  },
  dueRight: {
    alignItems: 'flex-end',
  },
  dueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  dueSpacer: {
    flex: 1,
  },
  earlier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});
