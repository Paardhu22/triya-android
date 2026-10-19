import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import {
  BottomSheet,
  Button,
  FilterChips,
  DateField,
  TextInput,
  Typography,
  ErrorState,
  SkeletonCardList,
} from '@/components';
import { AttachmentPicker } from '@/components/AttachmentPicker';
import type { PickedFile } from '@/services/types';
import { useAction, useExpenseCategories } from '@/hooks';
import { createExpense } from '@/data';
import { useActiveProperty, useAuth } from '@/store';
import { colors, spacing } from '@/theme';
import { rupeesToPaise } from '@/utils';

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
 * web rule), amount, native date, vendor, notes and an optional receipt.
 */
export function AddExpenseSheet({ visible, onClose, onCreated }: AddExpenseSheetProps) {
  const property = useActiveProperty();
  const { user } = useAuth();
  const { data: categories, isLoading, error: loadError, refetch } = useExpenseCategories(property.id, visible);
  const { busy, run } = useAction();

  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<PickedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setCategoryId(categories?.[0]?.id ?? '');
      setSubcategoryId('');
      setAmount('');
      setDate(new Date());
      setReceipt(null);
      setVendor('');
      setNotes('');
      setError(null);
    }
  }
  if (visible && !categoryId && categories?.length) setCategoryId(categories[0].id);

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
    const result = await run(() =>
      createExpense({
        propertyId: property.id,
        categoryId,
        subcategoryId: subcategories.length > 0 ? subcategoryId : null,
        amount: parseRupees(amount),
        date: date.toISOString(),
        vendor: vendor.trim() || null,
        notes: notes.trim() || null,
        createdByName: user?.name ?? null,
      }, receipt),
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
      {isLoading ? <SkeletonCardList rows={2} /> : loadError && !categories ? <ErrorState message={loadError} onRetry={refetch} /> : noCategories ? (
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
              <DateField label="Date" value={date} onChange={setDate} maximumDate={new Date()} />
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

          <AttachmentPicker value={receipt} onChange={setReceipt} label="Receipt (optional)" disabled={busy} />

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
