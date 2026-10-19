import { View, StyleSheet } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { Typography } from '@/components/Typography';
import { BED_VISUAL_STATUS_META, bedVisualStatus } from '@/constants';
import type { FloorRoom } from '@/data';
import { colors, fontFamilies, spacing, borderRadius, elevation } from '@/theme';

export interface RoomCardProps {
  room: FloorRoom;
  /** Flat properties treat the whole card as the single unit. */
  isFlat: boolean;
  onPress: () => void;
}

/**
 * RoomCard component.
 *
 * A tile in the Floor Manager grid (web floor-board RoomCard): the room
 * number, one status dot per bed (paid / pending / overdue / vacant) and the
 * sharing type. Flat properties show a single left-edge accent instead.
 */
export function RoomCard({ room, isFlat, onPress }: RoomCardProps) {
  const flatStatus =
    isFlat && room.beds[0] ? BED_VISUAL_STATUS_META[bedVisualStatus(room.beds[0])] : null;
  const occupied = room.beds.filter((b) => b.status === 'OCCUPIED').length;

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.95}
      style={[styles.card, flatStatus && { borderLeftWidth: 4, borderLeftColor: flatStatus.color }]}
      accessibilityRole="button"
      accessibilityLabel={`${isFlat ? 'Flat' : 'Room'} ${room.number}, ${occupied} of ${room.beds.length} occupied`}
    >
      <Typography style={styles.number} numberOfLines={1} adjustsFontSizeToFit>
        {room.number}
      </Typography>

      {!isFlat && room.beds.length > 0 && (
        <View style={styles.dots}>
          {room.beds.map((bed) => (
            <View
              key={bed.id}
              style={[
                styles.dot,
                { backgroundColor: BED_VISUAL_STATUS_META[bedVisualStatus(bed)].color },
              ]}
            />
          ))}
        </View>
      )}

      <Typography variant="small" color="textSecondary" style={styles.caption}>
        {isFlat ? (flatStatus?.label ?? 'Flat') : `${room.beds.length} Sharing`}
      </Typography>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    ...elevation.xs,
  },
  number: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: fontFamilies.bold,
    letterSpacing: -0.4,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  dots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    maxWidth: 64,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  caption: {
    fontSize: 11,
  },
});
