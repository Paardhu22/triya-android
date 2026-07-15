import {
  Pressable,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius } from '@/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * SegmentedControl component.
 *
 * Equal-width boxed segments for compact, mutually exclusive choices
 * (2–4 options), e.g. payment method or complaint priority in forms.
 * For screen-level sections use `Tabs` instead.
 *
 * @example
 * <SegmentedControl
 *   options={[{ value: 'CASH', label: 'Cash' }, { value: 'ONLINE', label: 'Online' }]}
 *   value={method}
 *   onChange={setMethod}
 * />
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.track, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Typography
              variant="captionMedium"
              colorValue={selected ? colors.text : colors.textSecondary}
            >
              {option.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfacePressed,
    borderRadius: borderRadius.md + 2,
    padding: 3,
  },
  segment: {
    flex: 1,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  segmentSelected: {
    backgroundColor: colors.background,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
});
