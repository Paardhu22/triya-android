import { View, StyleSheet } from 'react-native';

import { Card } from '@/components/Card';
import { Icon, type IconName } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius } from '@/theme';

export interface StatCardProps {
  label: string;
  value: string;
  /** Small line under the value, e.g. "96 paid · 52 unpaid". */
  caption?: string;
  icon?: IconName;
  /** Accent for the icon tile. Defaults to the primary color. */
  accentColor?: string;
  /** Soft background behind the icon. Defaults to primaryLight. */
  accentSoftColor?: string;
}

/**
 * StatCard component.
 *
 * Compact metric tile for dashboard grids: icon, label, value, caption.
 * For the hero metric with a progress bar use MetricCard.
 *
 * @example
 * <StatCard icon="cash-multiple" label="Collections (month)" value="₹8.9L" caption="96 paid · 52 unpaid" />
 */
export function StatCard({
  label,
  value,
  caption,
  icon,
  accentColor = colors.primary,
  accentSoftColor = colors.primaryLight,
}: StatCardProps) {
  return (
    <Card flat style={styles.card}>
      {icon && (
        <View style={[styles.iconBox, { backgroundColor: accentSoftColor }]}>
          <Icon name={icon} size={18} color={accentColor} />
        </View>
      )}
      <Typography variant="caption" color="textSecondary" numberOfLines={1}>
        {label}
      </Typography>
      <Typography variant="h2" style={styles.value} numberOfLines={1}>
        {value}
      </Typography>
      {caption && (
        <Typography variant="small" color="textTertiary" numberOfLines={1}>
          {caption}
        </Typography>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: spacing.md,
    gap: 2,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    marginTop: 2,
  },
});
