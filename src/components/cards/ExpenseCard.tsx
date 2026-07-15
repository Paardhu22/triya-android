import { Pressable, View, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import type { ExpenseListItem } from '@/mocks';
import { colors, spacing, borderRadius } from '@/theme';
import { formatFullDate, formatINR } from '@/utils';

export interface ExpenseCardProps {
  expense: ExpenseListItem;
  onPress: () => void;
}

/** Icon per starter category; anything user-created falls back to the tag. */
const CATEGORY_ICONS: Record<string, IconName> = {
  Utilities: 'flash-outline',
  Maintenance: 'wrench-outline',
  'Food & Groceries': 'food-apple-outline',
  'Staff Salary': 'account-cash-outline',
  Cleaning: 'broom',
  Miscellaneous: 'tag-outline',
};

export function expenseCategoryIcon(categoryName: string): IconName {
  return CATEGORY_ICONS[categoryName] ?? 'tag-outline';
}

/**
 * ExpenseCard component.
 *
 * An expense list row: category icon, category — subcategory, vendor and
 * date, amount, and a paperclip when a receipt is attached.
 *
 * @example
 * <ExpenseCard expense={item} onPress={() => router.push(`/expenses/${item.id}`)} />
 */
export function ExpenseCard({ expense, onPress }: ExpenseCardProps) {
  const subtitleParts = [expense.vendor, formatFullDate(expense.date)].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${expense.categoryName} expense, ${formatINR(expense.amount)}`}
    >
      <View style={styles.iconBox}>
        <Icon
          name={expenseCategoryIcon(expense.categoryName)}
          size={20}
          color={colors.primary}
        />
      </View>

      <View style={styles.body}>
        <Typography variant="bodyMedium" numberOfLines={1}>
          {expense.categoryName}
          {expense.subcategoryName ? ` — ${expense.subcategoryName}` : ''}
        </Typography>
        <Typography variant="small" color="textSecondary" numberOfLines={1}>
          {subtitleParts.join(' · ')}
        </Typography>
      </View>

      <View style={styles.right}>
        <Typography variant="bodyMedium">{formatINR(expense.amount)}</Typography>
        {expense.receiptKey && (
          <View style={styles.receiptTag}>
            <Icon name="paperclip" size={12} color={colors.textTertiary} />
            <Typography variant="small" color="textTertiary">
              Receipt
            </Typography>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  receiptTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
