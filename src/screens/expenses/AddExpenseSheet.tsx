import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import {
  BottomSheet,
  Button,
  FilterChips,
  TextInput,
  Typography,
} from '@/components';
import { useAction, useExpenseCategories } from '@/hooks';
import { createExpense } from '@/mocks';
import { useActiveProperty, useAuth } from '@/store';
import { colors, spacing } from '@/theme';
import { rupeesToPaise, toISODateOnly } from '@/utils';

export interface AddExpenseSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called after a successful create so the list can refetch. */
  onCreated: () => void;
}

function parseRupees(text: string): number {
  const value = Number.parseFloat(text.replace(/[^\d.]/g, ''));
  return Number.isFinite(value) && value > 0 ? rupeesToPaise(value) : 0;
}

/**
 * AddExpenseSheet
 *
 * The web's "Add expense" dialog as a bottom sheet: category (and
 * subcategory when the category defines any — required then, exactly the
 * web rule), amount, date, vendor and notes. Receipt capture arrives with
 * the device-services build.
 */
export function AddExpenseSheet({ visible, onClose, onCreated }: AddExpenseSheetProps) {
  const property = useActiveProperty();
  const { user } = useAuth();
  const { data: categories } = useExpenseCategories(property.id);
  const { busy, run } = useAction();

  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toISODateOnly());
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setCategoryId(categories?.[0]?.id ?? '');
      setSubcategoryId('');
      setAmount('');
      setDate(toISODateOnly());
      setVendor('');
      setNotes('');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const subcategories = useMemo(
    () => categories?.find((c) => c.id === categoryId)?.subcategories ?? [],
    [categories, categoryId],
  );

  async function onSubmit() {
    // Subcategory is required only when the chosen category has any (web rule).
    if (subcategories.length > 0 && !subcategoryId) {
      setError('Select a subcategory.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setError('Date must be YYYY-MM-DD.');
      return;
    }
    const result = await run(() =>
      createExpense({
        propertyId: property.id,
        categoryId,
        subcategoryId: subcategories.length > 0 ? subcategoryId : null,
        amount: parseRupees(amount),
        date: new Date(`${date.trim()}T00:00:00`).toISOString(),
        vendor: vendor.trim() || null,
        notes: notes.trim() || null,
        createdByName: user?.name ?? null,
      }),
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onCreated();
    onClose();
  }

  const noCategories = (categories ?? []).length === 0;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Add expense">
      {noCategories ? (
        <View style={styles.emptyBox}>
          <Typography variant="caption" color="textSecondary" style={styles.emptyText}>
            No categories yet. Categories are managed by your administrator.
          </Typography>
        </View>
      ) : (
        <View style={styles.form}>
          <Typography variant="caption" color="textSecondary">
            Record a new expense for this property.
          </Typography>

          <View style={styles.fieldBlock}>
            <Typography variant="captionMedium" color="textSecondary">
              Category
            </Typography>
            <FilterChips
              value={categoryId}
              onChange={(next) => {
                setCategoryId(next);
                setSubcategoryId('');
                if (error) setError(null);
              }}
              options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
            />
          </View>

          {subcategories.length > 0 && (
            <View style={styles.fieldBlock}>
              <Typography variant="captionMedium" color="textSecondary">
                Subcategory
              </Typography>
              <FilterChips
                value={subcategoryId}
                onChange={(next) => {
                  setSubcategoryId(next);
                  if (error) setError(null);
                }}
                options={subcategories.map((s) => ({ value: s.id, label: s.name }))}
              />
            </View>
          )}

          <View style={styles.twoCol}>
            <View style={styles.col}>
              <TextInput
                label="Amount (₹)"
                placeholder="0"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
            <View style={styles.col}>
              <TextInput
                label="Date"
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
                value={date}
                onChangeText={setDate}
              />
            </View>
          </View>

          <TextInput
            label="Vendor (optional)"
            placeholder="e.g. Ravi Electricals"
            value={vendor}
            onChangeText={setVendor}
          />
          <TextInput
            label="Notes (optional)"
            placeholder="What was this for?"
            value={notes}
            onChangeText={setNotes}
          />

          {error && (
            <Typography variant="caption" colorValue={colors.error}>
              {error}
            </Typography>
          )}

          <Button
            title="Add expense"
            icon="plus"
            loading={busy}
            disabled={!categoryId || parseRupees(amount) <= 0}
            onPress={onSubmit}
          />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  fieldBlock: {
    gap: spacing.sm,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  col: {
    flex: 1,
  },
  emptyBox: {
    paddingVertical: spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
  },
});
