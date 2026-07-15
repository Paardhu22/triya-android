import { useCallback, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FAB } from '@/components/FAB';
import { FilterChips } from '@/components/FilterChips';
import { Screen } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { SkeletonCardList } from '@/components/Skeleton';
import { Typography } from '@/components/Typography';
import { ComplaintCard } from '@/components/cards/ComplaintCard';
import { enterItem } from '@/components/motion';
import { useComplaints } from '@/hooks';
import type { ComplaintListItem } from '@/mocks';
import { useActiveProperty } from '@/store';
import { spacing } from '@/theme';
import type { ComplaintPriority, ComplaintStatus } from '@/types';
import { CreateComplaintSheet } from './CreateComplaintSheet';

type StatusFilter = 'ALL' | ComplaintStatus;
type PriorityFilter = 'ALL' | ComplaintPriority;

/**
 * ComplaintsScreen
 *
 * The web complaints page on mobile (pushed under More, native header):
 * search, the same status + priority filters, tap-through to the detail
 * screen, and the New-complaint sheet from the FAB.
 */
export function ComplaintsScreen() {
  const router = useRouter();
  const property = useActiveProperty();
  const {
    data: complaintsData,
    isLoading,
    error,
    isRefreshing,
    refresh,
    refetch,
  } = useComplaints(property.id);
  const complaints = useMemo(() => complaintsData ?? [], [complaintsData]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return complaints.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && c.priority !== priorityFilter) return false;
      if (q) {
        const haystack =
          `${c.title} ${c.description ?? ''} ${c.assignedToName ?? ''} ${c.roomNumber ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [complaints, statusFilter, priorityFilter, search]);

  const openCount = complaints.filter((c) => c.status === 'OPEN').length;
  const inProgressCount = complaints.filter((c) => c.status === 'IN_PROGRESS').length;

  const renderItem = useCallback(
    ({ item, index }: { item: ComplaintListItem; index: number }) => (
      <Animated.View entering={enterItem(index)}>
        <ComplaintCard
          complaint={item}
          onPress={() => router.push(`/(main)/complaints/${item.id}` as any)}
        />
      </Animated.View>
    ),
    [router],
  );

  return (
    <Screen edges={[]} padded={false}>
      <View style={styles.header}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search complaints" />
        <FilterChips
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'ALL', label: 'All' },
            { value: 'OPEN', label: 'Open', count: openCount },
            { value: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount },
            { value: 'RESOLVED', label: 'Resolved' },
          ]}
        />
        <FilterChips
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={[
            { value: 'ALL', label: 'All priorities' },
            { value: 'LOW', label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH', label: 'High' },
          ]}
        />
      </View>

      {isLoading ? (
        <View style={styles.skeletons}>
          <SkeletonCardList rows={5} />
        </View>
      ) : error && !complaintsData ? (
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
              title={
                complaints.length === 0
                  ? 'No complaints reported yet.'
                  : 'No complaints match your filters.'
              }
              icon="alert-circle-outline"
            />
          }
          ListFooterComponent={
            filtered.length > 0 ? (
              <Typography variant="small" color="textTertiary" style={styles.footerCount}>
                {filtered.length} of {complaints.length} complaints
              </Typography>
            ) : null
          }
        />
      )}

      <FAB label="New complaint" onPress={() => setCreateOpen(true)} icon="plus" />

      <CreateComplaintSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refetch}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm + 4,
  },
  skeletons: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 56,
    gap: spacing.sm,
  },
  footerCount: {
    textAlign: 'center',
    paddingTop: spacing.sm,
  },
});
