import { useCallback, useMemo, useState } from 'react';
import { Pressable, View, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FilterChips } from '@/components/FilterChips';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { SkeletonCardList } from '@/components/Skeleton';
import { Typography } from '@/components/Typography';
import { TenantCard } from '@/components/cards/TenantCard';
import { enterItem } from '@/components/motion';
import { useTenants } from '@/hooks';
import type { TenantListItem } from '@/mocks';
import { useActiveProperty } from '@/store';
import { colors, spacing } from '@/theme';
import { TabHeader } from '@/screens/shared/TabHeader';

type StatusFilter = 'ALL' | 'CURRENT' | 'PAST';
type SortMode = 'name' | 'recent';

/**
 * TenantListScreen
 *
 * The web tenants table as a touch list: search by name/phone, the same
 * All / Current / Past filter and Name / Recently added sort, tap-through
 * to the profile. (CSV export stays a desktop affordance.)
 */
export function TenantListScreen() {
  const router = useRouter();
  const property = useActiveProperty();
  const { data: tenantsData, isLoading, error, refetch, isRefreshing, refresh } =
    useTenants(property.id);
  const tenants = useMemo(() => tenantsData ?? [], [tenantsData]);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [sort, setSort] = useState<SortMode>('name');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = tenants.filter((t) => {
      if (filter === 'CURRENT' && !t.active) return false;
      if (filter === 'PAST' && t.active) return false;
      if (query && !`${t.fullName} ${t.phone}`.toLowerCase().includes(query)) return false;
      return true;
    });
    return [...list].sort((a, b) =>
      sort === 'recent'
        ? b.createdAt.localeCompare(a.createdAt)
        : a.fullName.localeCompare(b.fullName),
    );
  }, [tenants, filter, search, sort]);

  const currentCount = tenants.filter((t) => t.active).length;
  const pastCount = tenants.length - currentCount;

  const renderItem = useCallback(
    ({ item, index }: { item: TenantListItem; index: number }) => (
      <Animated.View entering={enterItem(index)}>
        <TenantCard
          tenant={item}
          isFlat={property.isFlat}
          onPress={() => router.push(`/(main)/tenants/${item.id}` as any)}
        />
      </Animated.View>
    ),
    [property.isFlat, router],
  );

  return (
    <Screen edges={['top']} padded={false}>
      <TabHeader title="Tenants" />
      <View style={styles.header}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or phone"
        />
        <View style={styles.filterRow}>
          <FilterChips
            value={filter}
            onChange={setFilter}
            style={styles.filters}
            options={[
              { value: 'ALL', label: 'All tenants', count: tenants.length },
              { value: 'CURRENT', label: 'Current', count: currentCount },
              { value: 'PAST', label: 'Past', count: pastCount },
            ]}
          />
          <Pressable
            onPress={() => setSort((s) => (s === 'name' ? 'recent' : 'name'))}
            style={({ pressed }) => [styles.sortButton, pressed && styles.sortPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${sort === 'name' ? 'name' : 'recently added'}, tap to change`}
          >
            <Icon
              name={sort === 'name' ? 'sort-alphabetical-ascending' : 'sort-clock-descending-outline'}
              size={15}
              color={colors.textSecondary}
            />
            <Typography variant="small" color="textSecondary">
              {sort === 'name' ? 'Name' : 'Recent'}
            </Typography>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.skeletons}>
          <SkeletonCardList rows={7} />
        </View>
      ) : error && !tenantsData ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          onRefresh={refresh}
          refreshing={isRefreshing}
          ListEmptyComponent={
            <EmptyState
              title={search ? 'No tenants match your filters' : 'No tenants found'}
              icon="account-search-outline"
            />
          }
          ListFooterComponent={
            filtered.length > 0 ? (
              <Typography variant="small" color="textTertiary" style={styles.footerCount}>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filters: {
    flex: 1,
    paddingBottom: 0,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortPressed: {
    backgroundColor: colors.surfacePressed,
  },
  skeletons: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  footerCount: {
    textAlign: 'center',
    paddingTop: spacing.sm,
  },
});
