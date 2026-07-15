import { useMemo, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { FilterChips } from '@/components/FilterChips';
import { Screen } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { TenantCard } from '@/components/cards/TenantCard';
import { useTenants } from '@/hooks';
import { useActiveProperty } from '@/store';
import { spacing } from '@/theme';
import { TabHeader } from '@/screens/shared/TabHeader';

export function TenantListScreen() {
  const router = useRouter();
  const property = useActiveProperty();
  const { data: tenantsData } = useTenants(property.id);
  const tenants = tenantsData || [];

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ACTIVE' | 'PAST'>('ACTIVE');

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      if (filter === 'ACTIVE' && !t.active) return false;
      if (filter === 'PAST' && t.active) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.fullName.toLowerCase().includes(q) || t.phone.includes(q);
      }
      return true;
    });
  }, [tenants, filter, search]);

  const activeCount = tenants.filter((t) => t.active).length;
  const pastCount = tenants.length - activeCount;

  return (
    <Screen edges={['top']} padded={false}>
      <TabHeader title="Tenants" />
      <View style={styles.header}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or phone"
        />
        <FilterChips
          value={filter}
          onChange={setFilter}
          style={styles.filters}
          options={[
            { value: 'ACTIVE', label: 'Active', count: activeCount },
            { value: 'PAST', label: 'Past', count: pastCount },
          ]}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TenantCard
            tenant={item}
            isFlat={!property.hasBlocks}
            onPress={() => router.push(`/(main)/tenants/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title={search ? 'No tenants match your search' : 'No tenants found'}
            icon="account-search-outline"
          />
        }
      />
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
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
});
