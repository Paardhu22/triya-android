import { useMemo, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { FAB } from '@/components/FAB';
import { Screen } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { ExpenseCard } from '@/components/cards/ExpenseCard';
import { TabHeader } from '@/screens/shared/TabHeader';
import { useExpenses } from '@/hooks';
import { useActiveProperty } from '@/store';
import { spacing } from '@/theme';

export function ExpensesScreen() {
  const router = useRouter();
  const property = useActiveProperty();
  const { data: expensesData } = useExpenses(property.id);
  const expenses = expensesData || [];

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return expenses;
    const q = search.toLowerCase();
    return expenses.filter(
      (e) =>
        e.categoryName.toLowerCase().includes(q) ||
        e.subcategoryName?.toLowerCase().includes(q) ||
        e.vendor?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q)
    );
  }, [expenses, search]);

  return (
    <Screen edges={['top']} padded={false}>
      <TabHeader title="Expenses" />
      <View style={styles.header}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search expenses..." />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ExpenseCard
            expense={item}
            onPress={() => router.push(`/(main)/expenses/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title={search ? 'No expenses match your search' : 'No expenses found'}
            icon="receipt"
          />
        }
      />
      <FAB label="Add Expense" onPress={() => router.push(`/(main)/expenses/new` as any)} icon="plus" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 56,
    gap: spacing.sm,
  },
});
