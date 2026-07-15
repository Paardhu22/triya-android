import { View, StyleSheet } from 'react-native';

import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius } from '@/theme';

export interface MetricCardProps {
  label: string;
  value: string;
  /** Supporting line, e.g. "148 occupied · 32 vacant". */
  caption?: string;
  /** 0–100. Renders a progress bar when provided. */
  progress?: number;
  /** Bar color. Defaults to the primary color. */
  progressColor?: string;
}

/**
 * MetricCard (Dashboard Metric Card) component.
 *
 * Hero dashboard metric with an optional progress bar — used for occupancy
 * and other rate-style figures. For plain figures use StatCard.
 *
 * @example
 * <MetricCard label="Occupancy" value="82%" progress={82} caption="148 occupied · 32 vacant" />
 */
export function MetricCard({
  label,
  value,
  caption,
  progress,
  progressColor = colors.primary,
}: MetricCardProps) {
  return (
    <Card flat style={styles.card}>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="h1" style={styles.value}>
        {value}
      </Typography>
      {progress !== undefined && (
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.min(100, Math.max(0, progress))}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>
      )}
      {caption && (
        <Typography variant="small" color="textTertiary">
          {caption}
        </Typography>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  value: {
    marginTop: -2,
  },
  track: {
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfacePressed,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});
