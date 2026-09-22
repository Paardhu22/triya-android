import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

import { Typography } from '@/components/Typography';
import { colors, spacing } from '@/theme';

export interface KeyValueProps {
  label: string;
  value: string | ReactNode;
  /** Emphasise the value (totals, balances). */
  strong?: boolean;
  divider?: boolean;
  valueColor?: string;
}

/**
 * KeyValue row — a label on the left, a tabular value on the right, hairline
 * above when `divider`. Used for facts and money breakdowns.
 */
export function KeyValue({ label, value, strong = false, divider = false, valueColor }: KeyValueProps) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <Typography variant="caption" color="textSecondary" style={styles.label}>
        {label}
      </Typography>
      {typeof value === 'string' ? (
        <Typography
          variant={strong ? 'number' : 'numberSmall'}
          colorValue={valueColor}
          style={styles.value}
          numberOfLines={2}
        >
          {value}
        </Typography>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  label: {
    flexShrink: 0,
  },
  value: {
    flex: 1,
    textAlign: 'right',
  },
});
