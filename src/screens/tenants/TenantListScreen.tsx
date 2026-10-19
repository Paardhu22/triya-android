import { shareCsv, toCsv } from '@/services/export';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import {
  EmptyState,
  Button,
  toast,
  ErrorState,
  FilterChips,
  GroupedItem,
  Icon,
  LargeTitle,
  Screen,
  SearchBar,
  SegmentedControl,
  SkeletonCardList,
  TopBar,
  Typography,
  useScrollHeader,
} from '@/components';
import { TenantCard } from '@/components/cards/TenantCard';
import { useTenants } from '@/hooks';
import type { TenantListItem } from '@/data';
import { useActiveProperty } from '@/store';
import { borderRadius, colors, spacing, GUTTER } from '@/theme';
import {
  PAYMENT_FILTER_OPTIONS,
  matchesPaymentFilter,
  type PaymentFilter,
} from '@/utils';
import { haptics } from '@/utils/haptics';

type StatusFilter = 'ALL' | 'CURRENT' | 'PAST';
type SortMode = 'name' | 'recent';

/**
 * TenantListScreen
 *
 * The web tenants table as a grouped list: search by name/phone, All /
 * Current / Past, the shared payment filter (Unpaid, Partially paid, Fully
 * paid, Overdue — this month, from the ledger) and Name / Recent sort.
 */
export function TenantListScreen() {
  const router = useRouter();
  const property = useActiveProperty();
  const { scrollY, onScroll } = useScrollHeader();
  const { data: tenantsData, isLoading, error, refetch, isRefreshing, refresh } =
    useTenants(property.id);
  const tenants = useMemo(() => tenantsData ?? [], [tenantsData]);

  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [payment, setPayment] = useState<PaymentFilter>('ALL');
  const [sort, setSort] = useState<SortMode>('name');

  const paymentCounts = useMemo(
    () =>
      Object.fromEntries(
        PAYMENT_FILTER_OPTIONS.map((o) => [
          o.value,
          tenants.filter(
            (t) =>
              o.value === 'ALL' ||
              (t.active &&
                matchesPaymentFilter(o.value, { state: t.active.state, status: t.active.paymentStatus })),
          ).length,
        ]),
      ) as Record<PaymentFilter, number>,
    [tenants],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = tenants.filter((t) => {
      if (status === 'CURRENT' && !t.active) return false;
      if (status === 'PAST' && t.active) return false;
      // A payment filter only makes sense for someone with rent due now.
      if (
        payment !== 'ALL' &&
        (!t.active ||
          !matchesPaymentFilter(payment, { state: t.active.state, status: t.active.paymentStatus }))
      ) {
        return false;
      }
      if (query && !`${t.fullName} ${t.phone}`.toLowerCase().includes(query)) return false;
      return true;
    });
    return [...list].sort((a, b) =>
      sort === 'recent' ? b.createdAt.localeCompare(a.createdAt) : a.fullName.localeCompare(b.fullName),
    );
  }, [tenants, status, payment, search, sort]);

  const currentCount = tenants.filter((t) => t.active).length;
  const pastCount = tenants.length - currentCount;

  const renderItem = useCallback(
    ({ item, index }: { item: TenantListItem; index: number }) => (
      <GroupedItem index={index} count={filtered.length} dividerInset={spacing.md + 40 + spacing.sm + 4}>
        <TenantCard
          tenant={item}
          isFlat={property.isFlat}
          onPress={() => router.push(`/(main)/tenants/${item.id}` as never)}
        />
      </GroupedItem>
    ),
    [filtered.length, property.isFlat, router],
  );

  const header = (
    <View style={styles.header}>
      <LargeTitle
        title="Tenants"
        subtitle={`${currentCount} current · ${pastCount} past`}
        scrollY={scrollY}
        right={
          <Pressable
            onPress={() => {
              haptics.selection();
              setSort((s) => (s === 'name' ? 'recent' : 'name'));
            }}
            style={({ pressed }) => [styles.sort, pressed && styles.sortPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Sorted by ${sort === 'name' ? 'name' : 'recently added'}, tap to change`}
          >
            <Icon
              name={sort === 'name' ? 'sort-alphabetical-ascending' : 'sort-clock-descending-outline'}
              size={16}
              color={colors.text}
            />
            <Typography variant="smallMedium">{sort === 'name' ? 'Name' : 'Recent'}</Typography>
          </Pressable>
        }
      />
      <Button title="Export filtered tenants" variant="ghost" size="sm" icon="export-variant" loading={exporting} disabled={!filtered.length || exporting} onPress={async () => {
        setExporting(true);
        try {
          await shareCsv('triya-tenants.csv', toCsv([
            ['Name', 'Phone', 'Status', property.isFlat ? 'Flat' : 'Room', 'Bed', 'Monthly due (INR)', 'Collected (INR)'],
            ...filtered.map(t => [t.fullName, t.phone, t.active ? 'Current' : 'Past', t.active?.roomNumber ?? '', property.isFlat ? '' : t.active?.bedLabel ?? '',
              ((t.active?.duePaise ?? 0) / 100).toFixed(2), ((t.active?.collectedPaise ?? 0) / 100).toFixed(2)]),
          ]));
        } catch { toast.error('Could not export tenants'); }
        finally { setExporting(false); }
      }} />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search name or phone" />
      <SegmentedControl
        value={status}
        onChange={setStatus}
        options={[
          { value: 'ALL', label: `All · ${tenants.length}` },
          { value: 'CURRENT', label: `Current · ${currentCount}` },
          { value: 'PAST', label: `Past · ${pastCount}` },
        ]}
      />
      <FilterChips
        inset={GUTTER}
        value={payment}
        onChange={setPayment}
        options={PAYMENT_FILTER_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
          count: o.value === 'ALL' ? undefined : paymentCounts[o.value],
        }))}
      />
    </View>
  );

  return (
    <Screen edges={['top']} padded={false} background={colors.canvas}>
      <TopBar title="Tenants" scrollY={scrollY} />
      {isLoading ? (
        <View style={styles.content}>
          {header}
          <SkeletonCardList rows={7} />
        </View>
      ) : error && !tenantsData ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <Animated.FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={header}
          contentContainerStyle={styles.content}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onRefresh={refresh}
          refreshing={isRefreshing}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={14}
          ListEmptyComponent={
            <EmptyState
              title={
                tenants.length === 0 ? 'No tenants found' : 'No tenants match your filters'
              }
              icon="account-search-outline"
            />
          }
          ListFooterComponent={
            filtered.length > 0 ? (
              <Typography variant="small" color="textTertiary" style={styles.footer}>
                {filtered.length} of {tenants.length} tenants
              </Typography>
            ) : null
          }
        />
      )}
    </Screen>
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
  sort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sortPressed: {
    backgroundColor: colors.surfacePressed,
  },
  footer: {
    textAlign: 'center',
    paddingTop: spacing.md,
  },
});
