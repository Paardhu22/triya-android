import {
  Pressable,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Typography } from '@/components/Typography';
import { colors, spacing } from '@/theme';

export interface TabOption<T extends string> {
  value: T;
  label: string;
  /** Optional badge count shown after the label. */
  count?: number;
}

export interface TabsProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Tabs component.
 *
 * Underline-style section tabs for switching between views of a screen
 * (e.g. Collections: Dues / Invoice History). For compact form choices use
 * `SegmentedControl` instead.
 *
 * @example
 * <Tabs
 *   options={[{ value: 'dues', label: 'Dues' }, { value: 'history', label: 'Invoice History' }]}
 *   value={tab}
 *   onChange={setTab}
 * />
 */
export function Tabs<T extends string>({ options, value, onChange, style }: TabsProps<T>) {
  return (
    <View style={[styles.row, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.tab, selected && styles.tabSelected]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Typography
              variant="captionMedium"
              colorValue={selected ? colors.primary : colors.textSecondary}
            >
              {option.label}
              {option.count !== undefined ? ` (${option.count})` : ''}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    marginBottom: -1,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabSelected: {
    borderBottomColor: colors.primary,
  },
});
