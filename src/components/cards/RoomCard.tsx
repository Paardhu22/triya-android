import { Pressable, View, StyleSheet } from 'react-native';

import { Typography } from '@/components/Typography';
import { BED_VISUAL_STATUS_META, bedVisualStatus } from '@/constants';
import type { FloorRoom } from '@/mocks';
import { colors, spacing, borderRadius } from '@/theme';

export interface RoomCardProps {
  room: FloorRoom;
  /** Flat properties treat the whole card as the single unit. */
  isFlat: boolean;
  onPress: () => void;
}

/**
 * RoomCard component.
 *
 * A tile in the Floor Manager grid: the room number with one status dot per
 * bed (paid / pending / overdue / vacant). Flat properties show a single
 * left-edge accent instead of dots, mirroring the web floor board.
 *
 * @example
 * <RoomCard room={room} isFlat={property.isFlat} onPress={() => openRoom(room.id)} />
 */
export function RoomCard({ room, isFlat, onPress }: RoomCardProps) {
  const flatStatus =
    isFlat && room.beds[0] ? BED_VISUAL_STATUS_META[bedVisualStatus(room.beds[0])] : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        flatStatus && { borderLeftWidth: 4, borderLeftColor: flatStatus.color },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${isFlat ? 'Flat' : 'Room'} ${room.number}`}
    >
      <Typography variant="h3" style={styles.number}>
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

      <Typography variant="small" color="textSecondary">
        {isFlat ? 'Flat' : `${room.beds.length} Sharing`}
      </Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm - 2,
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  pressed: {
    backgroundColor: colors.surface,
    transform: [{ scale: 0.97 }],
  },
  number: {
    fontVariant: ['tabular-nums'],
  },
  dots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
});
