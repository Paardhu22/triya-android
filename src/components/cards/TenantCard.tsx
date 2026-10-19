import { Pressable, View, StyleSheet } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/StatusBadge';
import { Typography } from '@/components/Typography';
import { COLLECTION_STATE_META } from '@/constants';
import type { TenantListItem } from '@/data';
import { colors, spacing } from '@/theme';
import { bedLocationShort, formatINR } from '@/utils';

export interface TenantCardProps {
  tenant: TenantListItem;
  /** Flat properties show "101" instead of "101 · A". */
  isFlat: boolean;
  onPress: () => void;
}

/**
 * TenantCard — one tenants-list row: avatar, name, unit and rent for current
 * tenants, and this month's collection state (with Overdue beneath, web
 * tenants table); past tenants read muted with a "Past" marker.
 */
export function TenantCard({ tenant, isFlat, onPress }: TenantCardProps) {
  const active = tenant.active;

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.surfacePressed }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={tenant.fullName}
    >
      <Avatar name={tenant.fullName} uri={tenant.photoUrl} size="md" />

      <View style={styles.body}>
        <Typography variant="bodyMedium" numberOfLines={1} colorValue={active ? colors.text : colors.textSecondary}>
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
          <>
            <StatusBadge meta={COLLECTION_STATE_META[active.state]} size="sm" />
            {active.paymentStatus === 'OVERDUE' && (
              <Typography variant="smallMedium" colorValue={colors.error}>
                Overdue
              </Typography>
            )}
          </>
        ) : (
          <View style={styles.pastTag}>
            <Icon name="history" size={13} color={colors.textTertiary} />
            <Typography variant="small" color="textTertiary">
              Past
            </Typography>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.background,
  },
  pressed: {
    backgroundColor: colors.canvas,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 3,
  },
  pastTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
