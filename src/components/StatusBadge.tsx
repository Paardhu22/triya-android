import { View, StyleSheet } from 'react-native';

import { Typography } from '@/components/Typography';
import type { StatusMeta } from '@/constants';
import { colors } from '@/theme';

export interface StatusBadgeProps {
  /** Status metadata from src/constants (label + tone). */
  meta: StatusMeta;
  /** Compact variant for dense rows. Defaults to 'md'. */
  size?: 'sm' | 'md';
  /** Colour the label in the status tone (e.g. "Overdue" under a balance). */
  tinted?: boolean;
}

/**
 * StatusBadge component.
 *
 * The web's status treatment since the Swiss redesign: a small solid dot and
 * the label in ink — no pill fill. Status always carries a text label; the
 * dot is reinforcement, never the sole signal.
 *
 * @example
 * <StatusBadge meta={COLLECTION_STATE_META[row.state]} />
 * <StatusBadge meta={PAYMENT_STATUS_META.OVERDUE} tinted size="sm" />
 */
export function StatusBadge({ meta, size = 'md', tinted = false }: StatusBadgeProps) {
  const isSmall = size === 'sm';
  return (
    <View style={styles.badge}>
      <View
        style={[styles.dot, isSmall && styles.dotSmall, { backgroundColor: meta.color }]}
      />
      <Typography
        variant={isSmall ? 'smallMedium' : 'captionMedium'}
        colorValue={tinted ? meta.color : colors.text}
        numberOfLines={1}
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
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
