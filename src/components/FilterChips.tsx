import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius } from '@/theme';
import { haptics } from '@/utils/haptics';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  /** Optional count shown after the label, muted (web `opacity-70` count). */
  count?: number;
}

export interface FilterChipsProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  /** Horizontal inset so chips scroll edge-to-edge but start on the gutter. */
  inset?: number;
}

/**
 * FilterChips component.
 *
 * A horizontally scrolling single-select row — the web's filter button group
 * (`variant={active ? "default" : "outline"}` with a count). Scrolls to the
 * screen edge so long sets never wrap or clip.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  style,
  inset = 0,
}: FilterChipsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { paddingHorizontal: inset }]}
      style={[inset > 0 && { marginHorizontal: -inset }, style]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (!selected) {
                haptics.selection();
                onChange(option.value);
              }
            }}
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
              colorValue={selected ? colors.textInverse : colors.text}
            >
              {option.label}
            </Typography>
            {option.count !== undefined && (
              <View style={[styles.count, selected && styles.countSelected]}>
                <Typography
                  variant="smallMedium"
                  colorValue={selected ? colors.textInverse : colors.textSecondary}
                  style={styles.countText}
                >
                  {option.count}
                </Typography>
              </View>
            )}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: spacing.sm + 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    backgroundColor: colors.surfacePressed,
  },
  count: {
    minWidth: 20,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  countSelected: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  countText: {
    fontVariant: ['tabular-nums'],
  },
});
