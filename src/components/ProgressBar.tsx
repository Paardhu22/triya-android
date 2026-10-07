import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme';

export interface ProgressBarProps {
  /** 0–100. */
  pct: number;
  color?: string;
  trackColor?: string;
  height?: number;
  /** Delay before the fill animates in (stagger in lists). */
  delay?: number;
}

/**
 * Thin fill bar — the web's `h-1.5 bg-muted` + `bg-foreground/60` fill rate.
 * Animates from its previous value, so filters and refreshes glide.
 */
export function ProgressBar({
  pct,
  color = 'rgba(40, 43, 48, 0.62)',
  trackColor = colors.surfacePressed,
  height = 5,
  delay = 80,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, pct));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(delay, withTiming(clamped, { duration: 650, easing: Easing.bezier(0.2, 0, 0, 1) })),
    );
  }, [clamped, delay, progress]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.get()}%` }));

  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color, borderRadius: height / 2 }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
  },
});
