import { useEffect, useRef } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, spacing, borderRadius } from '@/theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  /** Corner radius. Defaults to 6. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Skeleton component.
 *
 * A pulsing placeholder block. Compose into layout-matching loaders so
 * content doesn't jump when data arrives; `SkeletonCardList` covers the
 * common card-list case.
 *
 * @example
 * <Skeleton width="60%" height={16} />
 * <SkeletonCardList rows={6} />
 */
export function Skeleton({ width = '100%', height = 14, radius = 6, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

/** A circular skeleton (avatars). */
export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <Skeleton width={size} height={size} radius={size / 2} />;
}

/** Card-shaped skeleton row matching the app's list cards. */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <SkeletonCircle size={40} />
      <View style={styles.cardBody}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="35%" height={11} />
      </View>
      <Skeleton width={64} height={22} radius={borderRadius.full} />
    </View>
  );
}

/** A column of pulsing card skeletons for list screens. */
export function SkeletonCardList({ rows = 6 }: { rows?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surfacePressed,
  },
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
  cardBody: {
    flex: 1,
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm + 4,
  },
});
