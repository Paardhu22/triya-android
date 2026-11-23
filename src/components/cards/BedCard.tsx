import { View, StyleSheet } from 'react-native';
import Svg from 'react-native-svg';

import { BedGlyph } from '@/components/BedGlyph';
import { PressableScale } from '@/components/PressableScale';
import { Typography } from '@/components/Typography';
import { BED_VISUAL_STATUS_META, bedVisualStatus } from '@/constants';
import type { FloorBed } from '@/data';
import { borderRadius, colors, spacing } from '@/theme';
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
 * The Floor Manager's schematic bed with tenant details below it. Both views
 * use BedGlyph so the pillow, blanket, status color, and label stay consistent.
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
      <View style={styles.illustration}>
        <Svg width={88} height={122} viewBox="-12 -8 88 122" accessible={false}>
          <BedGlyph width={64} label={isFlat ? 'Unit' : `Bed ${bed.label}`} status={status} />
        </Svg>
      </View>

      <View style={styles.details}>
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
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  illustration: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: '#f7f3ed',
  },
  details: {
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
