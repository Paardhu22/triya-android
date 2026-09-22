import { RefreshControl, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import {
  BarChart,
  LargeTitle,
  ListRow,
  OccupancyBars,
  ProgressBar,
  Screen,
  SectionHeader,
  Skeleton,
  StatCell,
  StatGrid,
  StatusBadge,
  Surface,
  TopBar,
  Typography,
  enterItem,
  useScrollHeader,
} from '@/components';
import {
  COLLECTION_STATE_META,
  COMPLAINT_PRIORITY_META,
  COMPLAINT_STATUS_META,
  PAYMENT_STATUS_META,
} from '@/constants';
import { useDashboard } from '@/hooks';
import type { DashboardData } from '@/mocks';
import { useActiveProperty } from '@/store';
import { borderRadius, colors, spacing, GUTTER } from '@/theme';
import {
  PAYMENT_METHOD_META,
  bedLocationLabel,
  formatFullDate,
  formatINR,
  formatINRCompact,
  formatLongDate,
  formatMonthYear,
  vacateByDate,
} from '@/utils';

/** "2 sharing", "Single" — the vocabulary staff actually use (web `sharingLabel`). */
function sharingLabel(sharingType: number, isFlat: boolean): string {
  if (isFlat) return 'Flat';
  if (sharingType === 1) return 'Single';
  return `${sharingType} sharing`;
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/**
 * DashboardScreen
 *
 * The web dashboard's Swiss grid on a phone: capacity and financial-ledger
 * stat grids, the six-month collections-vs-expenses chart, occupancy by
 * sharing type / block / floor, rent settlement, the notice register and the
 * latest activity. Every figure comes from the same roll-up as the web, so
 * the totals always reconcile.
 */
export function DashboardScreen() {
  const property = useActiveProperty();
  const { data, isLoading, isRefreshing, refresh } = useDashboard(property.id);
  const { scrollY, onScroll } = useScrollHeader();

  return (
    <Screen edges={['top']} padded={false} keyboardAvoiding={false} background={colors.canvas}>
      <TopBar title="Dashboard" scrollY={scrollY} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <LargeTitle
          title="Dashboard"
          subtitle={`Occupancy and rent for ${property.name} as at ${formatLongDate(new Date())}.`}
          scrollY={scrollY}
        />
        {isLoading || !data ? <DashboardSkeleton /> : <DashboardBody data={data} />}
      </Animated.ScrollView>
    </Screen>
  );
}

function DashboardBody({ data }: { data: DashboardData }) {
  const router = useRouter();
  const property = useActiveProperty();
  const { isFlat, hasBlocks } = property;
  const occupancyRate = pct(data.occupiedBeds, data.totalBeds);
  const collectionRate = pct(data.collectedPaise, data.expectedPaise);
  const unit = isFlat ? 'flats' : 'beds';

  let section = 0;
  const next = () => enterItem(section++);

  return (
    <View style={styles.body}>
      {/* 01 · Capacity overview */}
      <Animated.View entering={next()}>
        <SectionHeader
          title="Capacity overview"
          meta={`${data.totalRooms} ${isFlat ? 'units' : 'rooms'} total`}
        />
        <Surface>
          <StatGrid>
            <StatCell
              label={isFlat ? 'Total flats' : 'Total beds'}
              value={data.totalBeds}
              hint={`Across ${data.totalRooms} ${isFlat ? 'units' : 'rooms'}`}
            />
            <StatCell
              label="Occupied"
              value={data.occupiedBeds}
              hint={`${occupancyRate}% of capacity filled`}
            />
            <StatCell label="Available" value={data.availableBeds} hint={`${unit} ready to move in`} />
            <StatCell
              label={isFlat ? 'Units let' : 'Rooms full'}
              value={`${data.fullRooms}/${data.totalRooms}`}
              hint={`${data.partialRooms} part filled · ${data.emptyRooms} empty`}
            />
          </StatGrid>
          <View style={styles.occupancyStrip}>
            <ProgressBar pct={occupancyRate} color={colors.chart1} height={4} />
          </View>
        </Surface>
      </Animated.View>

      {/* 02 · Financial ledger */}
      <Animated.View entering={next()}>
        <SectionHeader
          title={`Financial ledger · ${formatMonthYear(data.monthStart).split(' ')[0]}`}
          meta={`${collectionRate}% realization`}
        />
        <Surface>
          <StatGrid>
            <StatCell
              label="Expected rent"
              value={data.expectedPaise}
              format={formatINRCompact}
              hint={`${data.activeTenancies} active ${data.activeTenancies === 1 ? 'tenancy' : 'tenancies'}`}
            />
            <StatCell
              label="Collected"
              value={data.collectedPaise}
              format={formatINRCompact}
              hint={`${collectionRate}% of target collected`}
            />
            <StatCell
              label="Outstanding"
              value={data.outstandingPaise}
              format={formatINRCompact}
              hint={`${data.unpaidCount} unpaid · ${data.partialCount} part paid · ${data.overdueCount} overdue`}
            />
            <StatCell
              label="Expenses"
              value={data.expensesPaise}
              format={formatINRCompact}
              hint={`Net ${formatINRCompact(data.netPaise)} this month`}
            />
          </StatGrid>
          <ListRow
            divider
            insetDivider={false}
            title="Open collections"
            subtitle="Collect rent, send invoices and reminders"
            icon="wallet-outline"
            onPress={() => router.navigate('/(main)/(tabs)/collections' as never)}
          />
        </Surface>
      </Animated.View>

      {/* 03 · Trend */}
      <Animated.View entering={next()}>
        <SectionHeader title="Collections vs expenses" meta="Trailing 6 months" />
        <Surface padded>
          <BarChart
            data={data.trend.map((t) => ({
              label: t.label,
              values: { collected: t.collectedPaise, expenses: t.expensesPaise },
            }))}
            series={[
              { key: 'collected', label: 'Collected', color: colors.chart1 },
              { key: 'expenses', label: 'Expenses', color: colors.chart5 },
            ]}
            format={formatINRCompact}
            formatValue={formatINR}
          />
        </Surface>
      </Animated.View>

      {/* 04 · Capacity breakdown */}
      <Animated.View entering={next()}>
        <SectionHeader
          title={isFlat ? 'Occupancy by unit type' : 'Occupancy by sharing type'}
          meta={`${data.sharingBreakdown.reduce((n, r) => n + r.available, 0)} ${unit} available`}
        />
        <Surface>
          {data.sharingBreakdown.length > 1 && (
            <View style={styles.chartPad}>
              <OccupancyBars
                rows={data.sharingBreakdown.map((r) => ({
                  label: sharingLabel(r.sharingType, isFlat),
                  occupied: r.occupied,
                  available: r.available,
                }))}
              />
            </View>
          )}
          {data.sharingBreakdown.map((r, i) => (
            <ListRow
              key={r.sharingType}
              divider={i > 0 || data.sharingBreakdown.length > 1}
              title={sharingLabel(r.sharingType, isFlat)}
              subtitle={`${r.rooms} ${isFlat ? 'flats' : 'rooms'} · ${r.occupied}/${r.beds} occupied · ${pct(r.occupied, r.beds)}% fill`}
              trailing={
                <View style={styles.trailingRight}>
                  <Typography variant="number">{formatINRCompact(r.expectedPaise)}</Typography>
                  <Typography variant="small" color="textTertiary">
                    rent / month
                  </Typography>
                </View>
              }
            />
          ))}
          {data.sharingBreakdown.length === 0 && (
            <EmptyLine text="No rooms configured for this property yet." />
          )}
        </Surface>
      </Animated.View>

      {/* Blocks — only with two or more, else there is nothing to compare. */}
      {hasBlocks && data.blockBreakdown.length > 1 && (
        <Animated.View entering={next()}>
          <SectionHeader title="Block occupancy" meta={`${data.blockBreakdown.length} blocks`} />
          <Surface padded>
            <OccupancyBars
              rows={data.blockBreakdown.map((b) => ({
                label: `Block ${b.name}`,
                occupied: b.occupied,
                available: b.available,
              }))}
            />
          </Surface>
        </Animated.View>
      )}

      {/* 05 · Floor directory */}
      <Animated.View entering={next()}>
        <SectionHeader
          title="Floor occupancy directory"
          meta={`${data.floorBreakdown.length} floors`}
        />
        <Surface>
          {data.floorBreakdown.length === 0 ? (
            <EmptyLine text="No floors configured for this property yet." />
          ) : (
            data.floorBreakdown.map((f, i) => {
              const fill = pct(f.occupied, f.beds);
              return (
                <View key={f.id} style={[styles.floorRow, i > 0 && styles.hairlineTop]}>
                  <View style={styles.floorText}>
                    <Typography variant="bodyMedium" numberOfLines={1}>
                      {f.blockName ? `Block ${f.blockName} · ` : ''}
                      {f.name ?? `Floor ${f.number}`}
                    </Typography>
                    <Typography variant="small" color="textSecondary">
                      {f.rooms} {isFlat ? 'flats' : 'rooms'} · {f.occupied}/{f.beds} occupied ·{' '}
                      {f.available} free
                    </Typography>
                  </View>
                  <View style={styles.fillCol}>
                    <Typography variant="numberSmall">{fill}%</Typography>
                    <View style={styles.fillBar}>
                      <ProgressBar pct={fill} height={4} delay={120 + i * 40} />
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </Surface>
      </Animated.View>

      {/* 06 · Rent settlement */}
      <Animated.View entering={next()}>
        <SectionHeader
          title="Rent settlement status"
          meta={`${data.activeTenancies} tenancies`}
        />
        <Surface>
          {(
            [
              [COLLECTION_STATE_META.PAID, data.paidCount],
              [COLLECTION_STATE_META.PARTIAL, data.partialCount],
              [COLLECTION_STATE_META.UNPAID, data.unpaidCount],
              [
                { ...PAYMENT_STATUS_META.OVERDUE, label: 'Overdue (unpaid or part paid)' },
                data.overdueCount,
              ],
            ] as const
          ).map(([meta, count], i) => (
            <View key={meta.label} style={[styles.settleRow, i > 0 && styles.hairlineTop]}>
              <StatusBadge meta={meta} />
              <Typography variant="number">
                {count}{' '}
                <Typography variant="small" color="textSecondary">
                  {count === 1 ? 'tenancy' : 'tenancies'}
                </Typography>
              </Typography>
            </View>
          ))}
          <View style={[styles.movement, styles.hairlineTop]}>
            <Movement value={data.moveInsThisMonth} label="Moved in" />
            <Movement value={data.moveOutsThisMonth} label="Moved out" divider />
            <Movement value={data.openComplaints} label="Complaints" divider />
          </View>
        </Surface>
      </Animated.View>

      {/* 07 · Notice register */}
      <Animated.View entering={next()}>
        <SectionHeader title="Notice register" meta={`${data.noticeTenancies.length} scheduled`} />
        <Surface>
          {data.noticeTenancies.length === 0 ? (
            <EmptyLine text="No active move-out notices on file." />
          ) : (
            data.noticeTenancies.map((t, i) => (
              <ListRow
                key={t.id}
                divider={i > 0}
                title={t.name}
                subtitle={bedLocationLabel(t.roomNumber, t.bedLabel, isFlat)}
                onPress={() => router.push(`/(main)/tenants/${t.tenantId}` as never)}
                trailing={
                  <View style={styles.trailingRight}>
                    <Typography variant="numberSmall">
                      {formatFullDate(vacateByDate(t.noticeGivenDate))}
                    </Typography>
                    <Typography variant="overline" color="textTertiary">
                      Vacate by
                    </Typography>
                  </View>
                }
              />
            ))
          )}
        </Surface>
      </Animated.View>

      {/* 08 · Recent collections */}
      <Animated.View entering={next()}>
        <SectionHeader title="Recent collections" meta="Latest 5" />
        <Surface>
          {data.recentPayments.length === 0 ? (
            <EmptyLine text="No payment transactions recorded yet." />
          ) : (
            data.recentPayments.map((p, i) => (
              <ListRow
                key={p.id}
                divider={i > 0}
                title={p.tenantName}
                subtitle={`${formatFullDate(p.createdAt)} · ${PAYMENT_METHOD_META[p.method].label}`}
                trailing={<Typography variant="number">{formatINR(p.amount)}</Typography>}
              />
            ))
          )}
        </Surface>
      </Animated.View>

      {/* 09 · Complaints log */}
      <Animated.View entering={next()}>
        <SectionHeader
          title="Incident & complaints log"
          meta="See all"
          onMetaPress={() => router.push('/(main)/complaints' as never)}
        />
        <Surface>
          {data.recentComplaints.length === 0 ? (
            <EmptyLine text="No tickets or complaints raised yet." />
          ) : (
            data.recentComplaints.map((c, i) => (
              <ListRow
                key={c.id}
                divider={i > 0}
                title={c.title}
                subtitle={`${c.tenantName ?? 'Staff'} · ${formatFullDate(c.createdAt)}`}
                onPress={() => router.push(`/(main)/complaints/${c.id}` as never)}
                trailing={
                  <View style={styles.badgeCol}>
                    <StatusBadge meta={COMPLAINT_STATUS_META[c.status]} size="sm" />
                    <StatusBadge meta={COMPLAINT_PRIORITY_META[c.priority]} size="sm" />
                  </View>
                }
              />
            ))
          )}
        </Surface>
      </Animated.View>
    </View>
  );
}

function Movement({ value, label, divider }: { value: number; label: string; divider?: boolean }) {
  return (
    <View style={[styles.movementCell, divider && styles.hairlineLeft]}>
      <Typography variant="h2" style={styles.tabular}>
        {value}
      </Typography>
      <Typography variant="overline" color="textSecondary">
        {label}
      </Typography>
    </View>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <Typography variant="caption" color="textSecondary" style={styles.empty}>
      {text}
    </Typography>
  );
}

function DashboardSkeleton() {
  return (
    <View style={styles.body}>
      {[200, 200, 260, 220].map((h, i) => (
        <View key={i} style={styles.skeletonBlock}>
          <Skeleton width={140} height={11} />
          <Skeleton height={h} radius={borderRadius.lg} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: GUTTER,
    paddingBottom: spacing.xxl,
  },
  body: {
    gap: spacing.lg,
  },
  occupancyStrip: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  chartPad: {
    padding: spacing.md,
    paddingBottom: spacing.md + 2,
  },
  trailingRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  floorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
  },
  floorText: {
    flex: 1,
    gap: 2,
  },
  fillCol: {
    width: 64,
    alignItems: 'flex-end',
    gap: 6,
  },
  fillBar: {
    width: 56,
  },
  hairlineTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  hairlineLeft: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.divider,
  },
  settleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 6,
    paddingHorizontal: spacing.md,
  },
  movement: {
    flexDirection: 'row',
    backgroundColor: colors.canvas,
  },
  movementCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  skeletonBlock: {
    gap: spacing.sm + 2,
  },
});
