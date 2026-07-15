import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Divider } from '@/components/Divider';
import { Icon } from '@/components/Icon';
import { ListItem } from '@/components/ListItem';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { Typography } from '@/components/Typography';
import { enterHeader, enterItem } from '@/components/motion';
import { expenseCategoryIcon } from '@/components/cards/ExpenseCard';
import { useAction, useExpense } from '@/hooks';
import { deleteExpense } from '@/mocks/actions';
import { colors, spacing, borderRadius } from '@/theme';
import { formatFullDate, formatINR } from '@/utils';

/**
 * ExpenseDetailScreen
 *
 * One expense: amount, category, date, vendor, notes, who recorded it,
 * and deletion with confirmation (the web table's delete action).
 */
export function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: expense, isLoading } = useExpense(id);
  const { busy: isDeleting, run: runDelete } = useAction();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !expense) {
    return (
      <Screen edges={['bottom']}>
        <View style={styles.skeletons}>
          <Skeleton height={140} radius={16} />
          <Skeleton height={180} radius={12} />
        </View>
      </Screen>
    );
  }

  const handleDelete = async () => {
    const res = await runDelete(() => deleteExpense(expense.id));
    setDeleteOpen(false);
    if (res.ok) router.back();
    else setError(res.error);
  };

  return (
    <Screen edges={['bottom']} scrollable>
      <Animated.View entering={enterHeader()} style={styles.header}>
        <View style={styles.iconBox}>
          <Icon
            name={expenseCategoryIcon(expense.categoryName)}
            size={32}
            color={colors.primary}
          />
        </View>
        <Typography variant="h1" style={styles.amount}>
          {formatINR(expense.amount)}
        </Typography>
        <Typography variant="bodyMedium" color="textSecondary">
          {expense.categoryName}
          {expense.subcategoryName ? ` — ${expense.subcategoryName}` : ''}
        </Typography>
      </Animated.View>

      {error && (
        <Typography variant="caption" colorValue={colors.error} style={styles.error}>
          {error}
        </Typography>
      )}

      <Animated.View entering={enterItem(0)} style={styles.section}>
        <SectionHeader title="Details" />
        <Card flat>
          <View style={styles.detailRow}>
            <Typography variant="captionMedium" color="textSecondary">
              Date
            </Typography>
            <Typography variant="body">{formatFullDate(expense.date)}</Typography>
          </View>
          <Divider verticalSpacing="md" />
          <View style={styles.detailRow}>
            <Typography variant="captionMedium" color="textSecondary">
              Vendor
            </Typography>
            <Typography variant="body">{expense.vendor || 'Not recorded'}</Typography>
          </View>
          {expense.notes && (
            <>
              <Divider verticalSpacing="md" />
              <View style={styles.detailRow}>
                <Typography variant="captionMedium" color="textSecondary">
                  Notes
                </Typography>
                <Typography variant="body">{expense.notes}</Typography>
              </View>
            </>
          )}
          {expense.createdByName && (
            <>
              <Divider verticalSpacing="md" />
              <View style={styles.detailRow}>
                <Typography variant="captionMedium" color="textSecondary">
                  Recorded by
                </Typography>
                <Typography variant="body">{expense.createdByName}</Typography>
              </View>
            </>
          )}
        </Card>
      </Animated.View>

      <Animated.View entering={enterItem(1)} style={styles.section}>
        <SectionHeader title="Actions" />
        <Card flat noPadding>
          <ListItem
            title="Delete expense"
            icon="delete-outline"
            destructive
            onPress={() => setDeleteOpen(true)}
            disabled={isDeleting}
          />
        </Card>
      </Animated.View>

      <ConfirmDialog
        visible={deleteOpen}
        title="Delete expense"
        message={`Delete this ${formatINR(expense.amount)} ${expense.categoryName.toLowerCase()} expense? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  skeletons: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
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
  error: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  detailRow: {
    gap: 2,
  },
});
