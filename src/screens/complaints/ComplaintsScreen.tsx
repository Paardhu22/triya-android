import { useMemo, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { FAB } from '@/components/FAB';
import { FilterChips } from '@/components/FilterChips';
import { Screen } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { ComplaintCard } from '@/components/cards/ComplaintCard';
import { TabHeader } from '@/screens/shared/TabHeader';
import { useComplaints } from '@/hooks';
import { COMPLAINT_PRIORITY_META, COMPLAINT_STATUS_META } from '@/constants';
import { useActiveProperty } from '@/store';
import { spacing } from '@/theme';
import type { ComplaintStatus } from '@/types';

type FilterType = 'ALL' | ComplaintStatus;

export function ComplaintsScreen() {
  const router = useRouter();
  const property = useActiveProperty();
  const { data: complaintsData } = useComplaints(property.id);
  const complaints = complaintsData || [];

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');

  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      if (filter !== 'ALL' && c.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.assignedToName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [complaints, filter, search]);

  const openCount = complaints.filter(c => c.status === 'OPEN').length;
  const inProgressCount = complaints.filter(c => c.status === 'IN_PROGRESS').length;

  return (
    <Screen edges={['top']} padded={false}>
      <TabHeader title="Complaints" />
      <View style={styles.header}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search complaints..." />
        <FilterChips
          value={filter}
          onChange={setFilter}
          style={styles.filters}
          options={[
            { value: 'ALL', label: 'All' },
            { value: 'OPEN', label: 'Open', count: openCount },
            { value: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount },
            { value: 'RESOLVED', label: 'Resolved' },
          ]}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ComplaintCard
            complaint={item}
            onPress={() => router.push(`/(main)/complaints/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title={search ? 'No complaints match your search' : 'No complaints found'}
            icon="alert-circle-outline"
          />
        }
      />
      <FAB label="New Complaint" onPress={() => {}} icon="plus" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  filters: {
    paddingBottom: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 56,
    gap: spacing.sm,
  },
});
