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
import { ExpenseCard } from '@/components/cards/ExpenseCard';
import { enterItem } from '@/components/motion';
import { useExpenseCategories, useExpenses } from '@/hooks';
import type { ExpenseListItem } from '@/mocks';
import { useActiveProperty } from '@/store';
import { colors, spacing } from '@/theme';
import { formatINR } from '@/utils';
import { AddExpenseSheet } from './AddExpenseSheet';

/**
 * ExpensesScreen
 *
 * The web Expense Tracker on mobile (pushed under More, native header):
 * search vendor/notes, category filter, a running total of the filtered
 * set, tap-through to the expense detail, and the Add-expense sheet.
 */
export function ExpensesScreen() {
  const router = useRouter();
  const property = useActiveProperty();
  const {
    data: expensesData,
    isLoading,
    error,
    isRefreshing,
    refresh,
    refetch,
  } = useExpenses(property.id);
  const expenses = useMemo(() => expensesData ?? [], [expensesData]);
  const { data: categories } = useExpenseCategories(property.id);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('ALL');
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (categoryId !== 'ALL' && e.categoryId !== categoryId) return false;
      if (q) {
        const haystack =
          `${e.categoryName} ${e.subcategoryName ?? ''} ${e.vendor ?? ''} ${e.notes ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, search, categoryId]);

  const totalPaise = useMemo(
    () => filtered.reduce((sum, e) => sum + e.amount, 0),
    [filtered],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ExpenseListItem; index: number }) => (
      <Animated.View entering={enterItem(index)}>
        <ExpenseCard
          expense={item}
          onPress={() => router.push(`/(main)/expenses/${item.id}` as any)}
        />
      </Animated.View>
    ),
    [router],
  );

  return (
    <Screen edges={[]} padded={false}>
      <View style={styles.header}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search vendor or notes" />
        <FilterChips
          value={categoryId}
          onChange={setCategoryId}
          options={[
            { value: 'ALL', label: 'All categories' },
            ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        {filtered.length > 0 && (
          <View style={styles.totalRow}>
            <Typography variant="caption" color="textSecondary">
              {filtered.length} expense{filtered.length === 1 ? '' : 's'}
            </Typography>
            <Typography variant="captionMedium" colorValue={colors.text}>
              Total {formatINR(totalPaise)}
            </Typography>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.skeletons}>
          <SkeletonCardList rows={5} />
        </View>
      ) : error && !expensesData ? (
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
                expenses.length === 0
                  ? 'No expenses recorded yet.'
                  : 'No expenses match your filters.'
              }
              icon="receipt"
            />
          }
        />
      )}

      <FAB label="Add expense" onPress={() => setAddOpen(true)} icon="plus" />

      <AddExpenseSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
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
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
});
