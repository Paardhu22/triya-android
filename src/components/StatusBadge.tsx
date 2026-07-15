import { View, StyleSheet } from 'react-native';

import { Typography } from '@/components/Typography';
import type { StatusMeta } from '@/constants';
import { borderRadius, spacing } from '@/theme';

export interface StatusBadgeProps {
  /** Status metadata from src/constants (label + tone colors). */
  meta: StatusMeta;
  /** Compact variant for dense rows. Defaults to 'md'. */
  size?: 'sm' | 'md';
}

/**
 * StatusBadge component.
 *
 * Pill with a solid status dot and label on a soft tinted background. Status
 * always carries a text label — the dot is reinforcement, never the sole
 * signal (accessibility rule inherited from the web app).
 *
 * @example
 * <StatusBadge meta={PAYMENT_STATUS_META[tenancy.paymentStatus]} />
 * <StatusBadge meta={COMPLAINT_PRIORITY_META.HIGH} size="sm" />
 */
export function StatusBadge({ meta, size = 'md' }: StatusBadgeProps) {
  const isSmall = size === 'sm';
  return (
    <View
      style={[
        styles.badge,
        isSmall && styles.badgeSmall,
        { backgroundColor: meta.softColor },
      ]}
    >
      <View
        style={[
          styles.dot,
          isSmall && styles.dotSmall,
          { backgroundColor: meta.color },
        ]}
      />
      <Typography
        variant={isSmall ? 'small' : 'captionMedium'}
        colorValue={meta.color}
      >
        {meta.label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  badgeSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: borderRadius.full,
  },
  dotSmall: {
    width: 6,
    height: 6,
  },
});
