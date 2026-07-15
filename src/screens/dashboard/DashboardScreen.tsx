import { RefreshControl, ScrollView, View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  Icon,
  Screen,
  Skeleton,
  Typography,
  enterItem,
} from '@/components';
import {
  COMPLAINT_PRIORITY_META,
  COMPLAINT_STATUS_META,
  PAYMENT_STATUS_META,
} from '@/constants';
import { useDashboard } from '@/hooks';
import { FLAT_BLOCK_FLAVOURS, type DashboardData } from '@/mocks';
import { useActiveProperty } from '@/store';
import { colors, spacing, borderRadius } from '@/theme';
import { formatDotted, formatINR } from '@/utils';
import { TabHeader } from '../shared/TabHeader';
import {
  BlueprintPanel,
  BlueprintStatCard,
  CodeText,
  EnumChip,
  Kicker,
} from './blueprint';

/**
 * DashboardScreen
 *
 * The property overview in the web dashboard's blueprint style: four
 * grid-paper stat cards (capacity, occupancy, collections, expenses),
 * the room/block capacity breakdown, and recent payments + complaints.
 * Figures and copy mirror the web page exactly.
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
      {/* Capacity & summary stats — FIG.01–04 */}
      <Animated.View entering={enterItem(0)} style={styles.statRow}>
        <BlueprintStatCard
          fig="FIG.01"
          accent="blue"
          kicker={isFlat ? 'Total flats' : 'Total capacity'}
          rawValue={totalUnits}
          description={
            <>
              Active units in this property:{' '}
              <CodeText>{isFlat ? `${totalUnits} flats` : `${data.totalRooms} rooms`}</CodeText>.
            </>
          }
          footer='status = "active"'
        />
        <BlueprintStatCard
          fig="FIG.02"
          accent="purple"
          kicker="Occupancy status"
          rawValue={occupancyRate}
          format={(n) => `${n}%`}
          progressPct={occupancyRate}
          description={
            <>
              Active tenancy breakdown: <CodeText>{data.occupiedBeds} occupied</CodeText> and{' '}
              <CodeText>{data.availableBeds} vacant</CodeText>.
            </>
          }
          footer={`rate = "${occupancyRate}%"`}
        />
      </Animated.View>

      <Animated.View entering={enterItem(1)} style={styles.statRow}>
        <BlueprintStatCard
          fig="FIG.03"
          accent="emerald"
          kicker="Collections (month)"
          rawValue={data.monthlyCollections}
          format={formatINR}
          valueSize={23}
          description={
            <>
              Summary of active contracts: <CodeText>{data.paidCount} paid</CodeText> and{' '}
              <CodeText>{data.pendingCount} unpaid</CodeText>.
            </>
          }
          footer='revenue = "PAID"'
        />
        <BlueprintStatCard
          fig="FIG.04"
          accent="rose"
          kicker="Expenses (month)"
          rawValue={data.monthlyExpenses}
          format={formatINR}
          valueSize={23}
          description={
            <>
              Total operational costs: <CodeText>{formatINR(data.monthlyExpenses)}</CodeText>{' '}
              debited.
            </>
          }
          footer='outflow = "DEBIT"'
        />
      </Animated.View>

      {/* Capacity breakdown — FIG.05+ */}
      <Animated.View entering={enterItem(2)} style={styles.section}>
        <Kicker label={isFlat ? 'Flat type breakdown' : 'Room capacity breakdown'} />
      </Animated.View>
      <View style={styles.breakdownList}>
        {isFlat
          ? data.blockBreakdown.map((block, idx) => {
              const flavour = FLAT_BLOCK_FLAVOURS[block.name];
              const rate = block.rooms > 0 ? Math.round((block.occupied / block.rooms) * 100) : 0;
              return (
                <Animated.View key={block.name} entering={enterItem(3 + idx)}>
                  <BlueprintStatCard
                    fig={`FIG.0${5 + idx}`}
                    accent="blue"
                    kicker={`Block ${block.name}${flavour ? ` (${flavour})` : ''}`}
                    rawValue={block.rooms}
                    progressPct={rate}
                    description={
                      <>
                        Status: <CodeText>{block.occupied} occupied</CodeText> and{' '}
                        <CodeText>{block.available} available</CodeText>.
                      </>
                    }
                    footer={`block = "${block.name.toLowerCase()}"`}
                  />
                </Animated.View>
              );
            })
          : data.sharingBreakdown.map((row, idx) => {
              const rate = row.beds > 0 ? Math.round((row.occupied / row.beds) * 100) : 0;
              return (
                <Animated.View key={row.sharingType} entering={enterItem(3 + idx)}>
                  <BlueprintStatCard
                    fig={`FIG.0${5 + idx}`}
                    accent="purple"
                    kicker={`${row.sharingType} sharing rooms`}
                    rawValue={row.rooms}
                    progressPct={rate}
                    description={
                      <>
                        Beds capacity: <CodeText>{row.occupied}/{row.beds} occupied</CodeText>{' '}
                        and <CodeText>{row.available} vacant</CodeText>.
                      </>
                    }
                    footer={`sharing = "${row.sharingType}p"`}
                  />
                </Animated.View>
              );
            })}
      </View>

      {/* Recent payments — FIG.08 */}
      <Animated.View entering={enterItem(4)} style={styles.section}>
        <BlueprintPanel
          fig="FIG.08"
          kicker="Recent payments"
          accent="emerald"
          footerLeft='transaction = "all"'
          footerRight='type = "payment"'
        >
          {data.recentPayments.length === 0 ? (
            <Typography variant="mono" color="textSecondary" style={styles.emptyRow}>
              No recent payment transactions found.
            </Typography>
          ) : (
            data.recentPayments.map((payment) => (
              <View key={payment.id} style={styles.activityRow}>
                <View style={[styles.activityChip, styles.chipEmerald]}>
                  <Icon name="arrow-top-right" size={14} color="#10B981" />
                </View>
                <View style={styles.activityText}>
                  <Typography variant="captionMedium" numberOfLines={1}>
                    {payment.tenantName}
                  </Typography>
                  <Typography variant="mono" color="textTertiary" style={styles.activityDate}>
                    {formatDotted(payment.createdAt)}
                  </Typography>
                </View>
                <View style={styles.activityRight}>
                  <Typography variant="mono" style={styles.amount}>
                    {formatINR(payment.amount)}
                  </Typography>
                  <EnumChip
                    label={payment.status}
                    color={PAYMENT_STATUS_META[payment.status].color}
                    softColor={PAYMENT_STATUS_META[payment.status].softColor}
                  />
                </View>
              </View>
            ))
          )}
        </BlueprintPanel>
      </Animated.View>

      {/* Recent complaints — FIG.09 */}
      <Animated.View entering={enterItem(5)} style={styles.section}>
        <BlueprintPanel
          fig="FIG.09"
          kicker="Recent complaints"
          accent="rose"
          footerLeft='tickets = "open"'
          footerRight='type = "complaint"'
        >
          {data.recentComplaints.length === 0 ? (
            <Typography variant="mono" color="textSecondary" style={styles.emptyRow}>
              No active complaints reported.
            </Typography>
          ) : (
            data.recentComplaints.map((complaint) => (
              <View key={complaint.id} style={styles.activityRow}>
                <View style={[styles.activityChip, styles.chipRose]}>
                  <Icon name="clipboard-text-outline" size={14} color="#F43F5E" />
                </View>
                <View style={styles.activityText}>
                  <Typography variant="captionMedium" numberOfLines={1}>
                    {complaint.title}
                  </Typography>
                  <Typography variant="small" color="textTertiary" numberOfLines={1}>
                    By {complaint.tenantName ?? 'Staff'} ·{' '}
                    <Typography variant="mono" color="textTertiary" style={styles.activityDate}>
                      {formatDotted(complaint.createdAt)}
                    </Typography>
                  </Typography>
                </View>
                <View style={styles.badgeColumn}>
                  <EnumChip
                    label={complaint.priority}
                    color={COMPLAINT_PRIORITY_META[complaint.priority].color}
                    softColor={COMPLAINT_PRIORITY_META[complaint.priority].softColor}
                  />
                  <EnumChip
                    label={complaint.status}
                    color={COMPLAINT_STATUS_META[complaint.status].color}
                    softColor={COMPLAINT_STATUS_META[complaint.status].softColor}
                  />
                </View>
              </View>
            ))
          )}
        </BlueprintPanel>
      </Animated.View>
    </View>
  );
}

function DashboardSkeleton() {
  return (
    <View style={styles.body}>
      <View style={styles.statRow}>
        <Skeleton height={196} radius={borderRadius.xl} style={styles.flexOne} />
        <Skeleton height={196} radius={borderRadius.xl} style={styles.flexOne} />
      </View>
      <View style={styles.statRow}>
        <Skeleton height={196} radius={borderRadius.xl} style={styles.flexOne} />
        <Skeleton height={196} radius={borderRadius.xl} style={styles.flexOne} />
      </View>
      <Skeleton height={180} radius={borderRadius.xl} />
      <Skeleton height={220} radius={borderRadius.xl} />
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
    alignItems: 'stretch',
  },
  flexOne: {
    flex: 1,
  },
  section: {
    marginTop: spacing.sm,
  },
  breakdownList: {
    gap: spacing.sm + 4,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  activityChip: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipEmerald: {
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
  },
  chipRose: {
    backgroundColor: 'rgba(244, 63, 94, 0.10)',
  },
  activityText: {
    flex: 1,
    gap: 1,
  },
  activityDate: {
    fontSize: 10,
    lineHeight: 14,
  },
  activityRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
    fontWeight: 'bold',
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  emptyRow: {
    paddingVertical: spacing.xl,
    textAlign: 'center',
  },
});
