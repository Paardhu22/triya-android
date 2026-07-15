import { Pressable, View, StyleSheet } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/StatusBadge';
import { Typography } from '@/components/Typography';
import {
  BED_VISUAL_STATUS_META,
  PAYMENT_STATUS_META,
  bedVisualStatus,
} from '@/constants';
import type { FloorBed } from '@/mocks';
import { colors, spacing, borderRadius } from '@/theme';
import { formatINR, formatFullDate } from '@/utils';

export interface BedCardProps {
  bed: FloorBed;
  /** Flat properties label the unit itself, not a bed. */
  isFlat: boolean;
  onPress: () => void;
}

/**
 * BedCard component.
 *
 * One bed inside a room: left accent in the bed's visual status color, the
 * occupant (or "Vacant"), rent, payment badge, and a notice line when the
 * tenant is leaving. Tapping opens the bed's action sheet.
 *
 * @example
 * <BedCard bed={bed} isFlat={false} onPress={() => openBed(bed)} />
 */
export function BedCard({ bed, isFlat, onPress }: BedCardProps) {
  const visual = BED_VISUAL_STATUS_META[bedVisualStatus(bed)];
  const tenancy = bed.tenancy;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: visual.color },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Bed ${bed.label}, ${visual.label}`}
    >
      <View style={styles.header}>
        <Typography variant="captionMedium" color="textSecondary">
          {isFlat ? 'Unit' : `Bed ${bed.label}`}
        </Typography>
        {tenancy ? (
          <StatusBadge meta={PAYMENT_STATUS_META[tenancy.paymentStatus]} size="sm" />
        ) : (
          <StatusBadge
            meta={{ label: 'Vacant', color: visual.color, softColor: visual.softColor }}
            size="sm"
          />
        )}
      </View>

      {tenancy ? (
        <>
          <View style={styles.tenantRow}>
            <Avatar name={tenancy.tenant.fullName} size="sm" />
            <View style={styles.tenantText}>
              <Typography variant="bodyMedium" numberOfLines={1}>
                {tenancy.tenant.fullName}
              </Typography>
              <Typography variant="small" color="textSecondary" numberOfLines={1}>
                {formatINR(tenancy.monthlyRent)}/mo · since {formatFullDate(tenancy.checkInDate)}
              </Typography>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textTertiary} />
          </View>
          {tenancy.noticeGivenDate && tenancy.expectedLeavingDate && (
            <View style={styles.noticeRow}>
              <Icon name="calendar-alert" size={14} color={colors.warning} />
              <Typography variant="small" colorValue={colors.warning}>
                Notice given · vacating by {formatFullDate(tenancy.expectedLeavingDate)}
              </Typography>
            </View>
          )}
        </>
      ) : (
        <View style={styles.vacantRow}>
          <Icon name="bed-outline" size={18} color={colors.textTertiary} />
          <Typography variant="caption" color="textSecondary">
            Vacant — tap to add a tenant
          </Typography>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 4,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.sm + 2,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  tenantText: {
    flex: 1,
    gap: 1,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  vacantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
