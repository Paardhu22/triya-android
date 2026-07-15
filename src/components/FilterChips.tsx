import {
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius } from '@/theme';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  /** Optional count rendered after the label, e.g. "Pending · 4". */
  count?: number;
}

export interface FilterChipsProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * FilterChips component.
 *
 * A horizontally scrollable single-select chip row — the mobile replacement
 * for the web's filter dropdowns. Large touch targets, one active value.
 *
 * @example
 * <FilterChips
 *   options={[{ value: 'ALL', label: 'All' }, { value: 'PENDING', label: 'Pending', count: 4 }]}
 *   value={status}
 *   onChange={setStatus}
 * />
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  style,
}: FilterChipsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={style}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              pressed && !selected && styles.chipPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Typography
              variant="captionMedium"
              colorValue={selected ? colors.textInverse : colors.textSecondary}
            >
              {option.label}
              {option.count !== undefined ? ` · ${option.count}` : ''}
            </Typography>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    backgroundColor: colors.surfacePressed,
  },
});
