import { Alert, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Card } from '@/components/Card';
import { Divider } from '@/components/Divider';
import { Icon } from '@/components/Icon';
import { ListItem } from '@/components/ListItem';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Typography } from '@/components/Typography';
import { expenseCategoryIcon } from '@/components/cards/ExpenseCard';
import { useExpense } from '@/hooks';
import { colors, spacing, borderRadius } from '@/theme';
import { formatFullDate, formatINR } from '@/utils';

export function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: expense, isLoading } = useExpense(id);

  if (isLoading || !expense) return null;

  const handleDelete = () => {
    Alert.alert('Coming soon', 'Deleting expenses will be added soon');
  };

  return (
    <Screen edges={['bottom']} scrollable>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Icon name={expenseCategoryIcon(expense.categoryName)} size={32} color={colors.primary} />
        </View>
        <Typography variant="h2" style={styles.amount}>{formatINR(expense.amount)}</Typography>
        <Typography variant="bodyMedium" color="textSecondary">
          {expense.categoryName}
          {expense.subcategoryName ? ` — ${expense.subcategoryName}` : ''}
        </Typography>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Details" />
        <Card>
          <View style={styles.detailRow}>
            <Typography variant="captionMedium" color="textSecondary">Date</Typography>
            <Typography variant="bodyMedium">{formatFullDate(expense.date)}</Typography>
          </View>
          <Divider verticalSpacing="md" />
          <View style={styles.detailRow}>
            <Typography variant="captionMedium" color="textSecondary">Vendor</Typography>
            <Typography variant="bodyMedium">{expense.vendor || 'Unknown Vendor'}</Typography>
          </View>
          {expense.notes && (
            <>
              <Divider verticalSpacing="md" />
              <View style={styles.detailRow}>
                <Typography variant="captionMedium" color="textSecondary">Notes</Typography>
                <Typography variant="bodyMedium">{expense.notes}</Typography>
              </View>
            </>
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Actions" />
        <Card>
          {expense.receiptKey && (
            <>
              <ListItem 
                title="View Receipt" 
                icon="paperclip" 
                onPress={() => Alert.alert('Coming soon', 'Receipt viewer will be added soon')}
              />
              <Divider style={{ marginVertical: 0 }} />
            </>
          )}
          <ListItem 
            title="Delete Expense" 
            icon="delete-outline" 
            destructive 
            onPress={handleDelete}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  amount: {
    marginBottom: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  detailRow: {
    gap: 2,
  },
});
