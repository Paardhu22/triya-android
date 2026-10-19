import { useCallback, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, toast } from '@/components';
import { shareCsv, toCsv } from '@/services/export';
import { DEFAULT_FILTERS, applyExpenseFilters, hasActiveFilters } from '@/utils/expenseFilters';
import { ExpenseFiltersSheet } from './ExpenseFiltersSheet';
import { CategoryManagerSheet } from './CategoryManagerSheet';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FAB } from '@/components/FAB';
import { FilterChips } from '@/components/FilterChips';
import { Screen } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { SkeletonCardList } from '@/components/Skeleton';
import { Typography } from '@/components/Typography';
import { ExpenseCard } from '@/components/cards/ExpenseCard';
import { GroupedItem } from '@/components/GroupedItem';
import { useExpenseCategories, useExpenses } from '@/hooks';
import type { ExpenseListItem } from '@/data';
import { useActiveProperty, useAuth } from '@/store';
import { colors, spacing, GUTTER } from '@/theme';
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
  const { user } = useAuth();
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => applyExpenseFilters(expenses, { ...filters, search }), [expenses, filters, search]);
  async function exportExpenses() {
    setExporting(true);
    try {
      await shareCsv('triya-expenses.csv', toCsv([
        ['Date', 'Category', 'Subcategory', 'Vendor', 'Amount (INR)', 'Notes', 'Receipt'],
        ...filtered.map(e => [e.date.slice(0, 10), e.categoryName, e.subcategoryName ?? '', e.vendor ?? '', (e.amount / 100).toFixed(2), e.notes ?? '', e.receiptKey ? 'Yes' : 'No']),
      ]));
    } catch { toast.error('Could not export expenses'); }
    finally { setExporting(false); }
  }

  const totalPaise = useMemo(
    () => filtered.reduce((sum, e) => sum + e.amount, 0),
    [filtered],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ExpenseListItem; index: number }) => (
      <GroupedItem index={index} count={filtered.length} dividerInset={spacing.md + 38 + spacing.sm + 4}>
        <ExpenseCard
          expense={item}
          onPress={() => router.push(`/(main)/expenses/${item.id}` as any)}
        />
      </GroupedItem>
    ),
    [router, filtered.length],
  );

  return (
    <Screen edges={[]} padded={false} background={colors.canvas}>
      <View style={styles.header}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search vendor or notes" />
        <FilterChips
          inset={GUTTER}
          value={filters.categoryId || 'ALL'}
          onChange={v => setFilters({ ...filters, categoryId: v === 'ALL' ? '' : v, subcategoryId: '' })}
          options={[
            { value: 'ALL', label: 'All categories' },
            ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        {(categories?.find(c => c.id === filters.categoryId)?.subcategories.length ?? 0) > 0 && <FilterChips
          value={filters.subcategoryId} onChange={v => setFilters({ ...filters, subcategoryId: v })}
          options={[{ value: '', label: 'All subcategories' }, ...(categories?.find(c => c.id === filters.categoryId)?.subcategories ?? []).map(c => ({ value: c.id, label: c.name }))]} />}
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Button title={hasActiveFilters(filters) ? 'Filters active' : 'Filters'} variant="outline" size="sm" icon="filter-variant" onPress={() => setFiltersOpen(true)} />
          <Button title="Export CSV" variant="outline" size="sm" icon="export-variant" disabled={!filtered.length || exporting} loading={exporting} onPress={() => void exportExpenses()} />
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && <Button title="Categories" variant="ghost" size="sm" onPress={() => setCategoriesOpen(true)} />}
        </View>
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

      <ExpenseFiltersSheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} filters={filters} onChange={setFilters} />
      <CategoryManagerSheet visible={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
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
    paddingHorizontal: GUTTER,
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
    paddingHorizontal: GUTTER,
    gap: spacing.sm,
  },
  list: {
    paddingHorizontal: GUTTER,
    paddingBottom: spacing.xxl + 56,
  },
});
