import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  BarChart,
  EmptyState,
  ErrorState,
  FilterChips,
  GroupedItem,
  Icon,
  MonthPicker,
  ProgressBar,
  Screen,
  SearchBar,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  StatCell,
  StatGrid,
  StatusBadge,
  Surface,
  Typography,
  toast,
} from '@/components';
import { COLLECTION_STATE_META } from '@/constants';
import { useRentReport } from '@/hooks';
import type { ReportFloorRow, ReportRoomRow, ReportTenantRow } from '@/data';
import { useActiveProperty } from '@/store';
import { borderRadius, colors, spacing, GUTTER } from '@/theme';
import {
  PAYMENT_FILTER_OPTIONS,
  formatDateTime,
  formatINR,
  formatINRCompact,
  matchesPaymentFilter,
  monthKey,
  paiseToRupees,
  type PaymentFilter,
} from '@/utils';
import { toCsv, shareCsv } from '@/services/export';
import { haptics } from '@/utils/haptics';

type Tab = 'floor' | 'room' | 'tenant';
type Row = ReportFloorRow | ReportRoomRow | ReportTenantRow;

/** Rupees with no symbol — spreadsheets should see a number, not "₹1,234". */
const csvAmount = (paise: number) => paiseToRupees(paise).toFixed(2);

const pct = (a: number, b: number) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);

/**
 * ReportsScreen
 *
 * The web Reports page: rent expected against rent collected for a billing
 * month, a twelve-month collection trend, and the roll-up by floor, room and
 * tenant (with the shared payment filter). The current tab exports as CSV
 * through the share sheet — the phone's version of the web download.
 */
export function ReportsScreen() {
  const property = useActiveProperty();
  const roomNoun = property.isFlat ? 'Flat' : 'Room';
  const [month, setMonth] = useState(monthKey(new Date()));
  const { data: report, isLoading, isFetching, error, refetch } = useRentReport(property.id, month);

  const [tab, setTab] = useState<Tab>('floor');
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState<PaymentFilter>('ALL');

  const query = search.trim().toLowerCase();
  const rows: Row[] = useMemo(() => {
    if (!report) return [];
    if (tab === 'floor') return report.byFloor.filter((r) => !query || r.label.toLowerCase().includes(query));
    if (tab === 'room')
      return report.byRoom.filter((r) => !query || `${r.number} ${r.floorLabel}`.toLowerCase().includes(query));
    return report.byTenant.filter(
      (r) =>
        matchesPaymentFilter(payment, r) &&
        (!query || `${r.tenantName} ${r.roomNumber} ${r.bedLabel}`.toLowerCase().includes(query)),
    );
  }, [report, tab, query, payment]);

  async function onExport() {
    if (!report) return;
    haptics.tap();
    let csv: string;
    if (tab === 'floor') {
      csv = toCsv([
        ['Floor', 'Tenants', 'Expected', 'Collected', 'Cash', 'Online', 'Outstanding'],
        ...(rows as ReportFloorRow[]).map((r) => [
          r.label, r.tenancies, csvAmount(r.expectedPaise), csvAmount(r.collectedPaise),
          csvAmount(r.cashPaise), csvAmount(r.onlinePaise), csvAmount(r.outstandingPaise),
        ]),
      ]);
    } else if (tab === 'room') {
      csv = toCsv([
        [roomNoun, 'Floor', 'Sharing', 'Tenants', 'Expected', 'Collected', 'Cash', 'Online', 'Outstanding'],
        ...(rows as ReportRoomRow[]).map((r) => [
          r.number, r.floorLabel, r.sharingType, r.tenancies, csvAmount(r.expectedPaise),
          csvAmount(r.collectedPaise), csvAmount(r.cashPaise), csvAmount(r.onlinePaise),
          csvAmount(r.outstandingPaise),
        ]),
      ]);
    } else {
      csv = toCsv([
        ['Tenant', roomNoun, 'Bed', 'Floor', 'Expected', 'Collected', 'Cash', 'Online', 'Balance', 'Last paid', 'Status'],
        ...(rows as ReportTenantRow[]).map((r) => [
          r.tenantName, r.roomNumber, property.isFlat ? '' : r.bedLabel, r.floorLabel,
          csvAmount(r.expectedPaise), csvAmount(r.collectedPaise), csvAmount(r.cashPaise),
          csvAmount(r.onlinePaise), csvAmount(r.balancePaise), r.lastPaidAt ?? '',
          `${COLLECTION_STATE_META[r.state].label}${r.status === 'OVERDUE' ? ' (overdue)' : ''}`,
        ]),
      ]);
    }
    try {
      await shareCsv(`rent-report-${report.month}-${tab}.csv`, csv);
    } catch {
      toast.error('Could not open the share sheet');
    }
  }

  const renderRow = useCallback(
    ({ item, index }: { item: Row; index: number }) => (
      <GroupedItem index={index} count={rows.length}>
        {tab === 'floor' ? (
          <FloorRow row={item as ReportFloorRow} delay={index} />
        ) : tab === 'room' ? (
          <RoomRow row={item as ReportRoomRow} isFlat={property.isFlat} />
        ) : (
          <TenantRow row={item as ReportTenantRow} isFlat={property.isFlat} />
        )}
      </GroupedItem>
    ),
    [rows.length, tab, property.isFlat],
  );

  if (!isLoading && !report) return <Screen><ErrorState message={error ?? 'Report unavailable'} onRetry={refetch} /></Screen>;

  if (isLoading || !report) {
    return (
      <Screen edges={['bottom']} background={colors.canvas}>
        <View style={styles.skeletons}>
          <Skeleton height={36} width={180} radius={18} />
          <Skeleton height={270} radius={borderRadius.lg} />
          <Skeleton height={240} radius={borderRadius.lg} />
        </View>
      </Screen>
    );
  }

  const { summary } = report;

  const header = (
    <View style={styles.header}>
      <Typography variant="caption" color="textSecondary">
        Rent expected against rent collected for {report.monthLabel}, broken down by floor,{' '}
        {roomNoun.toLowerCase()} and tenant.
      </Typography>

      <View style={styles.toolbar}>
        <MonthPicker
          value={month}
          options={report.availableMonths}
          onChange={setMonth}
          loading={isFetching}
          title="Report month"
        />
        <Pressable
          onPress={onExport}
          style={({ pressed }) => [styles.export, pressed && styles.exportPressed]}
          accessibilityRole="button"
          accessibilityLabel="Export CSV"
        >
          <Icon name="export-variant" size={16} color={colors.text} />
          <Typography variant="smallMedium">Export</Typography>
        </Pressable>
      </View>

      <Surface style={isFetching ? styles.fetching : undefined}>
        <StatGrid>
          <StatCell
            label="Expected"
            value={summary.expectedPaise}
            format={formatINRCompact}
            hint={`${summary.tenancies} ${summary.tenancies === 1 ? 'tenancy' : 'tenancies'}`}
          />
          <StatCell
            label="Collected"
            value={summary.collectedPaise}
            format={formatINRCompact}
            hint={`${Math.round(summary.collectionRate * 100)}% of expected`}
          />
          <StatCell
            label="Outstanding"
            value={summary.outstandingPaise}
            format={formatINRCompact}
            hint={`${summary.unpaid} unpaid · ${summary.partiallyPaid} part paid`}
          />
          <StatCell label="Fully paid" value={`${summary.fullyPaid}/${summary.tenancies}`} hint={`${formatINR(summary.collectedPaise)} received`} />
          <StatCell label="Cash" value={summary.cashPaise} format={formatINRCompact} hint="collected in cash" />
          <StatCell label="Online" value={summary.onlinePaise} format={formatINRCompact} hint="collected online" />
        </StatGrid>
      </Surface>

      <View>
        <SectionHeader title="Rent collected" meta="Trailing 12 months" />
        <Surface padded>
          <BarChart
            data={report.trend.map((t) => ({ label: t.label, values: { collected: t.collectedPaise } }))}
            series={[{ key: 'collected', label: 'Collected', color: colors.chart1 }]}
            format={formatINRCompact}
            formatValue={formatINR}
            height={140}
          />
        </Surface>
      </View>

      <SegmentedControl
        value={tab}
        onChange={(t) => {
          setTab(t);
          setSearch('');
        }}
        options={[
          { value: 'floor', label: 'By floor' },
          { value: 'room', label: `By ${roomNoun.toLowerCase()}` },
          { value: 'tenant', label: 'By tenant' },
        ]}
      />
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder={
          tab === 'floor' ? 'Search floor' : tab === 'room' ? `Search ${roomNoun.toLowerCase()} or floor` : 'Search tenant or unit'
        }
      />
      {tab === 'tenant' && (
        <FilterChips
          inset={GUTTER}
          value={payment}
          onChange={setPayment}
          options={PAYMENT_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      )}
    </View>
  );

  return (
    <Screen edges={['bottom']} padded={false} background={colors.canvas}>
      <Animated.FlatList
        data={rows}
        keyExtractor={(item) =>
          'tenancyId' in item ? item.tenancyId : (item as ReportFloorRow | ReportRoomRow).id
        }
        renderItem={renderRow}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        style={isFetching ? styles.fetching : undefined}
        ListEmptyComponent={
          <EmptyState
            icon="chart-bar"
            title={`No ${tab === 'floor' ? 'floors' : tab === 'room' ? `${roomNoun.toLowerCase()}s` : 'tenants'} to report for this month.`}
          />
        }
      />
    </Screen>
  );
}

function Money({ collected, expected }: { collected: number; expected: number }) {
  return (
    <View style={styles.money}>
      <Typography variant="number">{formatINR(collected)}</Typography>
      <Typography variant="small" color="textTertiary">
        of {formatINR(expected)}
      </Typography>
    </View>
  );
}

function FloorRow({ row, delay }: { row: ReportFloorRow; delay: number }) {
  const rate = pct(row.collectedPaise, row.expectedPaise);
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={styles.rowText}>
          <Typography variant="bodyMedium" numberOfLines={1}>
            {row.label}
          </Typography>
          <Typography variant="small" color="textSecondary">
            {row.tenancies} tenant{row.tenancies === 1 ? '' : 's'} · {formatINR(row.outstandingPaise)} outstanding
          </Typography>
        </View>
        <Money collected={row.collectedPaise} expected={row.expectedPaise} />
      </View>
      <View style={styles.rateRow}>
        <View style={styles.rateBar}>
          <ProgressBar pct={rate} height={4} delay={80 + Math.min(delay, 8) * 40} />
        </View>
        <Typography variant="numberSmall" color="textSecondary" style={styles.rateText}>
          {rate}%
        </Typography>
      </View>
      <Typography variant="small" color="textTertiary">
        Cash {formatINR(row.cashPaise)} · Online {formatINR(row.onlinePaise)}
      </Typography>
    </View>
  );
}

function RoomRow({ row, isFlat }: { row: ReportRoomRow; isFlat: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={styles.rowText}>
          <Typography variant="bodyMedium">
            {isFlat ? 'Flat' : 'Room'} {row.number}
          </Typography>
          <Typography variant="small" color="textSecondary" numberOfLines={1}>
            {row.floorLabel}
            {!isFlat ? ` · ${row.sharingType} sharing` : ''} · {row.tenancies} tenant
            {row.tenancies === 1 ? '' : 's'}
          </Typography>
        </View>
        <Money collected={row.collectedPaise} expected={row.expectedPaise} />
      </View>
      <Typography variant="small" color="textTertiary">
        Cash {formatINR(row.cashPaise)} · Online {formatINR(row.onlinePaise)} · Outstanding{' '}
        {formatINR(row.outstandingPaise)}
      </Typography>
    </View>
  );
}

function TenantRow({ row, isFlat }: { row: ReportTenantRow; isFlat: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={styles.rowText}>
          <Typography variant="bodyMedium" numberOfLines={1}>
            {row.tenantName}
            {!row.isActive ? (
              <Typography variant="small" color="textTertiary">
                {'  '}moved out
              </Typography>
            ) : null}
          </Typography>
          <Typography variant="small" color="textSecondary" numberOfLines={1}>
            {isFlat ? `Flat ${row.roomNumber}` : `${row.roomNumber} · ${row.bedLabel}`} ·{' '}
            {row.lastPaidAt ? `last ${formatDateTime(row.lastPaidAt)}` : 'Not collected'}
          </Typography>
        </View>
        <Money collected={row.collectedPaise} expected={row.expectedPaise} />
      </View>
      <View style={styles.tenantMeta}>
        <StatusBadge meta={COLLECTION_STATE_META[row.state]} size="sm" />
        {row.status === 'OVERDUE' && (
          <Typography variant="smallMedium" colorValue={colors.error}>
            Overdue
          </Typography>
        )}
        <View style={styles.flex} />
        {row.balancePaise > 0 && (
          <Typography variant="smallMedium">{formatINR(row.balancePaise)} due</Typography>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: GUTTER,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  skeletons: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  header: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  export: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  exportPressed: {
    backgroundColor: colors.surfacePressed,
  },
  fetching: {
    opacity: 0.6,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 6,
    gap: spacing.sm,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  money: {
    alignItems: 'flex-end',
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rateBar: {
    flex: 1,
  },
  rateText: {
    width: 40,
    textAlign: 'right',
  },
  tenantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
