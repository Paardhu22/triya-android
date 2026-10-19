import { Children, isValidElement, type ReactNode } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';

import { Typography } from '@/components/Typography';
import { useCountUp } from '@/hooks/useCountUp';
import { colors, spacing } from '@/theme';

export interface StatCellProps {
  /** Uppercase label (web StatCard label). */
  label: string;
  /** Pre-formatted value, or a number to count up to. */
  value: string | number;
  /** Formats a counting numeric value (e.g. formatINRCompact). */
  format?: (value: number) => string;
  /** Muted explanatory line under the figure. */
  hint?: string;
  /** Colours the figure (e.g. outstanding in the error tone). */
  valueColor?: string;
  onPress?: () => void;
  actionLabel?: string;
}

/**
 * One figure in a StatGrid — the web's Swiss StatCard: small uppercase label,
 * large tight tabular figure, muted hint. Numeric values count up on mount.
 */
export function StatCell({ label, value, format, hint, valueColor, onPress, actionLabel }: StatCellProps) {
  const counted = useCountUp(typeof value === 'number' ? value : 0);
  const display =
    typeof value === 'number' ? (format ? format(counted) : String(counted)) : value;

  const content = (
    <View style={styles.cell}>
      <Typography variant="overline" color="textSecondary" numberOfLines={1}>
        {label}
      </Typography>
      <Typography
        variant="figure"
        colorValue={valueColor}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={styles.value}
      >
        {display}
      </Typography>
      {hint ? (
        <Typography variant="small" color="textSecondary" numberOfLines={2}>
          {hint}
        </Typography>
      ) : null}
      {actionLabel && <Typography variant="smallMedium" color="primary" style={{ marginTop: 8 }}>{actionLabel}</Typography>}
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${display}, ${actionLabel ?? 'view details'}`} onPress={onPress}>{content}</Pressable> : content;
}

export interface StatGridProps {
  /** StatCell children, laid out two per row with hairline dividers. */
  children: ReactNode;
  columns?: 2 | 3;
  variant?: 'grouped' | 'plain';
}

/**
 * StatGrid component.
 *
 * The web's `grid grid-cols-2 divide-x divide-y border` stat block: figures
 * share one surface and are separated by hairlines rather than each sitting
 * in its own box.
 */
export function StatGrid({ children, columns = 2, variant = 'grouped' }: StatGridProps) {
  const cells = Children.toArray(children).filter(isValidElement);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < cells.length; i += columns) rows.push(cells.slice(i, i + columns));

  return (
    <View style={variant === 'plain' ? styles.plain : undefined}>
      {rows.map((row, r) => (
        <View key={r} style={[styles.row, r > 0 && styles.rowDivider]}>
          {row.map((cell, c) => (
            <View key={c} style={[styles.slot, c > 0 && variant === 'grouped' && styles.slotDivider]}>
              {cell}
            </View>
          ))}
          {row.length < columns &&
            Array.from({ length: columns - row.length }, (_, i) => (
              <View key={`pad-${i}`} style={[styles.slot, styles.slotDivider]} />
            ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  plain: { borderTopWidth: 1, borderTopColor: colors.border },
  row: {
    flexDirection: 'row',
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  slot: {
    flex: 1,
  },
  slotDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.divider,
  },
  cell: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md + 2,
    gap: 4,
  },
  value: {
    marginTop: spacing.xs + 2,
    marginBottom: 2,
  },
});
