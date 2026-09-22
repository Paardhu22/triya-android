import { View, StyleSheet } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { Typography } from '@/components/Typography';
import { BED_VISUAL_STATUS_META, bedVisualStatus } from '@/constants';
import type { FloorBed } from '@/mocks';
import { borderRadius, colors, elevation, spacing } from '@/theme';
import { formatINR } from '@/utils';

export interface BedCardProps {
  bed: FloorBed;
  /** Flat properties label the unit itself, not a bed. */
  isFlat: boolean;
  onPress: () => void;
}

/**
 * BedCard component.
 *
 * One bed drawn like the web room view's bed: a pillow band at the head with
 * the bed label, the mattress carrying the occupant and rent, and the status
 * word at the foot in the Floor Manager's bed tone. Vacant beds invite a
 * check-in.
 */
export function BedCard({ bed, isFlat, onPress }: BedCardProps) {
  const status = bedVisualStatus(bed);
  const visual = BED_VISUAL_STATUS_META[status];
  const tenancy = bed.tenancy;

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.96}
      style={styles.bed}
      accessibilityRole="button"
      accessibilityLabel={`${isFlat ? 'Unit' : `Bed ${bed.label}`}, ${visual.label}${tenancy ? `, ${tenancy.tenant.fullName}` : ''}`}
    >
      <View style={[styles.head, { backgroundColor: visual.softColor }]}>
        <View style={styles.pillow}>
          <Typography variant="overline" style={styles.pillowText}>
            {isFlat ? 'Unit' : `Bed ${bed.label}`}
          </Typography>
        </View>
      </View>

      <View style={styles.mattress}>
        {tenancy ? (
          <>
            <Typography variant="bodySemibold" numberOfLines={1} style={styles.center}>
              {tenancy.tenant.fullName}
            </Typography>
            <Typography variant="numberSmall" color="textSecondary" style={styles.center}>
              {formatINR(tenancy.monthlyRent)}/mo
            </Typography>
            {tenancy.noticeGivenDate ? (
              <Typography variant="small" colorValue={colors.warning} style={styles.center}>
                On notice
              </Typography>
            ) : null}
          </>
        ) : (
          <Typography variant="caption" color="textSecondary" style={styles.center}>
            Tap to check in
          </Typography>
        )}
      </View>

      <View style={styles.foot}>
        <View style={[styles.dot, { backgroundColor: visual.color }]} />
        <Typography variant="overline" colorValue={status === 'vacant' ? colors.textSecondary : visual.color}>
          {status === 'vacant' ? 'Available' : visual.label}
        </Typography>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bed: {
    flex: 1,
    minHeight: 168,
    borderRadius: borderRadius.lg + 2,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    ...elevation.xs,
  },
  head: {
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
  },
  pillow: {
    minWidth: 76,
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(44, 48, 64, 0.08)',
  },
  pillowText: {
    color: colors.text,
    letterSpacing: 0.6,
  },
  mattress: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
