import { Pressable, View, StyleSheet } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/StatusBadge';
import { Typography } from '@/components/Typography';
import { PAYMENT_STATUS_META } from '@/constants';
import type { TenantListItem } from '@/mocks';
import { colors, spacing, borderRadius } from '@/theme';
import { bedLocationShort, formatINR } from '@/utils';

export interface TenantCardProps {
  tenant: TenantListItem;
  /** Flat properties show "101" instead of "101 · A". */
  isFlat: boolean;
  onPress: () => void;
}

/**
 * TenantCard component.
 *
 * A tenant list row: avatar, name + occupation, location and rent for
 * current tenants, payment badge; past tenants render muted with a "Past"
 * marker. The card replaces the web's tenants table row.
 *
 * @example
 * <TenantCard tenant={item} isFlat={false} onPress={() => router.push(`/tenants/${item.id}`)} />
 */
export function TenantCard({ tenant, isFlat, onPress }: TenantCardProps) {
  const active = tenant.active;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={tenant.fullName}
    >
      <Avatar name={tenant.fullName} size="md" />

      <View style={styles.body}>
        <Typography variant="bodyMedium" numberOfLines={1}>
          {tenant.fullName}
        </Typography>
        <Typography variant="small" color="textSecondary" numberOfLines={1}>
          {active
            ? `${bedLocationShort(active.roomNumber, active.bedLabel, isFlat)} · ${formatINR(active.monthlyRent)}/mo`
            : tenant.occupation ?? 'No active stay'}
        </Typography>
      </View>

      <View style={styles.right}>
        {active ? (
          <StatusBadge meta={PAYMENT_STATUS_META[active.paymentStatus]} size="sm" />
        ) : (
          <View style={styles.pastTag}>
            <Icon name="history" size={13} color={colors.textTertiary} />
            <Typography variant="small" color="textTertiary">
              Past
            </Typography>
          </View>
        )}
        <Icon name="chevron-right" size={20} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  pressed: {
    backgroundColor: colors.surface,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pastTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
