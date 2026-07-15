import { RefreshControl, ScrollView, View, StyleSheet } from 'react-native';

import {
  Card,
  Divider,
  MetricCard,
  Screen,
  SectionHeader,
  Skeleton,
  StatCard,
  StatusBadge,
  Typography,
} from '@/components';
import {
  COMPLAINT_PRIORITY_META,
  COMPLAINT_STATUS_META,
  PAYMENT_STATUS_META,
} from '@/constants';
import { useDashboard } from '@/hooks';
import { FLAT_BLOCK_FLAVOURS, type DashboardData } from '@/mocks';
import { useActiveProperty } from '@/store';
import { colors, spacing } from '@/theme';
import { formatDotted, formatINR, formatINRCompact } from '@/utils';
import { TabHeader } from '../shared/TabHeader';

/**
 * DashboardScreen
 *
 * The property overview, mirroring the web dashboard's figures exactly:
 * capacity (beds — or flats for flat properties), occupancy rate, this
 * month's collections and expenses, the room/block capacity breakdown, and
 * recent payments + complaints.
 */
export function DashboardScreen() {
  const property = useActiveProperty();
  const { data, isLoading, isRefreshing, refresh } = useDashboard(property.id);

  return (
    <Screen edges={['top']} padded={false} keyboardAvoiding={false}>
      <ScrollView
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
        <TabHeader title="Dashboard" />
        {isLoading || !data ? <DashboardSkeleton /> : <DashboardBody data={data} />}
      </ScrollView>
    </Screen>
  );
}

function DashboardBody({ data }: { data: DashboardData }) {
  const property = useActiveProperty();
  const isFlat = property.isFlat;

  // Flat properties count whole units; PGs count beds (web dashboard rule).
  const totalUnits = isFlat ? data.totalRooms : data.totalBeds;
  const occupancyRate = totalUnits > 0 ? Math.round((data.occupiedBeds / totalUnits) * 100) : 0;

  return (
    <View style={styles.body}>
      {/* Headline metrics */}
      <MetricCard
        label={isFlat ? 'Occupancy — flats' : 'Occupancy — beds'}
        value={`${occupancyRate}%`}
        progress={occupancyRate}
        caption={`${data.occupiedBeds} occupied · ${data.availableBeds} vacant`}
      />

      <View style={styles.statRow}>
        <StatCard
          icon={isFlat ? 'home-city-outline' : 'bed-outline'}
          label={isFlat ? 'Total flats' : 'Total capacity'}
          value={String(totalUnits)}
          caption={isFlat ? `${totalUnits} flats` : `${data.totalRooms} rooms`}
        />
        <StatCard
          icon="cash-multiple"
          label="Collections (month)"
          value={formatINRCompact(data.monthlyCollections)}
          caption={`${data.paidCount} paid · ${data.pendingCount} unpaid`}
          accentColor={colors.success}
          accentSoftColor={colors.successLight}
        />
      </View>
      <View style={styles.statRow}>
        <StatCard
          icon="receipt"
          label="Expenses (month)"
          value={formatINRCompact(data.monthlyExpenses)}
          accentColor={colors.error}
          accentSoftColor={colors.errorLight}
        />
        <StatCard
          icon="account-clock-outline"
          label="Unpaid tenancies"
          value={String(data.pendingCount)}
          caption="pending + overdue"
          accentColor={colors.warning}
          accentSoftColor={colors.warningLight}
        />
      </View>

      {/* Capacity breakdown */}
      <SectionHeader
        title={isFlat ? 'Flat type breakdown' : 'Room capacity breakdown'}
        style={styles.section}
      />
      <View style={styles.breakdownList}>
        {isFlat
          ? data.blockBreakdown.map((block) => {
              const flavour = FLAT_BLOCK_FLAVOURS[block.name];
              const rate = block.rooms > 0 ? Math.round((block.occupied / block.rooms) * 100) : 0;
              return (
                <MetricCard
                  key={block.name}
                  label={`Block ${block.name}${flavour ? ` (${flavour})` : ''}`}
                  value={`${block.rooms} flats`}
                  progress={rate}
                  caption={`${block.occupied} occupied · ${block.available} available`}
                />
              );
            })
          : data.sharingBreakdown.map((row) => {
              const rate = row.beds > 0 ? Math.round((row.occupied / row.beds) * 100) : 0;
              return (
                <MetricCard
                  key={row.sharingType}
                  label={`${row.sharingType} sharing rooms`}
                  value={`${row.rooms} rooms`}
                  progress={rate}
                  caption={`${row.occupied}/${row.beds} beds occupied · ${row.available} vacant`}
                />
              );
            })}
      </View>

      {/* Recent payments */}
      <SectionHeader title="Recent payments" style={styles.section} />
      <Card flat noPadding>
        {data.recentPayments.length === 0 ? (
          <Typography variant="caption" color="textSecondary" style={styles.emptyRow}>
            No recent payment transactions found.
          </Typography>
        ) : (
          data.recentPayments.map((payment, index) => (
            <View key={payment.id}>
              {index > 0 && <Divider verticalSpacing="xs" style={styles.rowDivider} />}
              <View style={styles.activityRow}>
                <View style={styles.activityText}>
                  <Typography variant="captionMedium" numberOfLines={1}>
                    {payment.tenantName}
                  </Typography>
                  <Typography variant="small" color="textTertiary">
                    {formatDotted(payment.createdAt)}
                  </Typography>
                </View>
                <Typography variant="captionMedium">{formatINR(payment.amount)}</Typography>
                <StatusBadge meta={PAYMENT_STATUS_META[payment.status]} size="sm" />
              </View>
            </View>
          ))
        )}
      </Card>

      {/* Recent complaints */}
      <SectionHeader title="Recent complaints" style={styles.section} />
      <Card flat noPadding>
        {data.recentComplaints.length === 0 ? (
          <Typography variant="caption" color="textSecondary" style={styles.emptyRow}>
            No active complaints reported.
          </Typography>
        ) : (
          data.recentComplaints.map((complaint, index) => (
            <View key={complaint.id}>
              {index > 0 && <Divider verticalSpacing="xs" style={styles.rowDivider} />}
              <View style={styles.activityRow}>
                <View style={styles.activityText}>
                  <Typography variant="captionMedium" numberOfLines={1}>
                    {complaint.title}
                  </Typography>
                  <Typography variant="small" color="textTertiary" numberOfLines={1}>
                    By {complaint.tenantName ?? 'Staff'} · {formatDotted(complaint.createdAt)}
                  </Typography>
                </View>
                <View style={styles.badgeColumn}>
                  <StatusBadge meta={COMPLAINT_PRIORITY_META[complaint.priority]} size="sm" />
                  <StatusBadge meta={COMPLAINT_STATUS_META[complaint.status]} size="sm" />
                </View>
              </View>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

function DashboardSkeleton() {
  return (
    <View style={styles.body}>
      <Skeleton height={120} radius={12} />
      <View style={styles.statRow}>
        <Skeleton height={110} radius={12} style={styles.flexOne} />
        <Skeleton height={110} radius={12} style={styles.flexOne} />
      </View>
      <View style={styles.statRow}>
        <Skeleton height={110} radius={12} style={styles.flexOne} />
        <Skeleton height={110} radius={12} style={styles.flexOne} />
      </View>
      <Skeleton height={90} radius={12} />
      <Skeleton height={90} radius={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  body: {
    gap: spacing.sm + 4,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
  },
  flexOne: {
    flex: 1,
  },
  section: {
    marginTop: spacing.md,
    marginBottom: 0,
  },
  breakdownList: {
    gap: spacing.sm + 4,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  activityText: {
    flex: 1,
    gap: 1,
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rowDivider: {
    marginVertical: 0,
  },
  emptyRow: {
    padding: spacing.lg,
    textAlign: 'center',
  },
});
