import { useEffect, useState } from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius, elevation } from '@/theme';
import { haptics } from '@/utils/haptics';

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

const PAD = 3;

/**
 * SegmentedControl component.
 *
 * Equal-width segments on a warm track with a white thumb that glides to the
 * selection — the web's shadcn `TabsList`, made tactile. For 2–4 mutually
 * exclusive choices (tabs within a screen, payment method…).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segment = width > 0 ? (width - PAD * 2) / options.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    x.set(withTiming(index * segment, { duration: 240, easing: Easing.bezier(0.2, 0, 0, 1) }));
  }, [index, segment, x]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
  }));

  return (
    <View
      style={[styles.track, style]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {segment > 0 && <Animated.View style={[styles.thumb, { width: segment }, thumbStyle]} />}
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
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Typography
              variant={selected ? 'captionMedium' : 'caption'}
              colorValue={selected ? colors.text : colors.textSecondary}
              numberOfLines={1}
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
    borderRadius: borderRadius.md,
    padding: PAD,
  },
  thumb: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: borderRadius.md - 2,
    backgroundColor: colors.background,
    ...elevation.xs,
  },
  segment: {
    flex: 1,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
