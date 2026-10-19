import { ErrorState } from '@/components/ErrorState';
import { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated from 'react-native-reanimated';

import {
  Button,
  Screen,
  SectionHeader,
  Skeleton,
  Surface,
  Typography,
  enterHeader,
  enterItem,
} from '@/components';
import { BedCard } from '@/components/cards/BedCard';
import { BED_VISUAL_STATUSES, BED_VISUAL_STATUS_META, bedVisualStatus } from '@/constants';
import { useRoomDetail } from '@/hooks';
import { BedSheet } from '@/screens/floors/BedSheet';
import { useActiveProperty, useAuth } from '@/store';
import { borderRadius, colors, spacing, GUTTER } from '@/theme';
import { formatINR } from '@/utils';
import { RoomRentSheet } from './RoomRentSheet';

/**
 * RoomDetailScreen
 *
 * One room (the web room-view dialog as a pushed screen): the room's rent
 * default with Set Rent for ADMIN/MANAGER, and its beds drawn as beds.
 * Tapping a bed opens the BedSheet. Flat properties never land here — the
 * Floor Manager opens the unit sheet directly.
 */
export function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const property = useActiveProperty();
  const { user } = useAuth();
  const canSetRent = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const { data: room, isLoading, error: loadError, refetch } = useRoomDetail(id);

  const [sheetBedId, setSheetBedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rentOpen, setRentOpen] = useState(false);

  // Always read the bed from live data so the sheet reflects new collections.
  const sheetBed = room?.beds.find((b) => b.id === sheetBedId) ?? null;

  const counts = useMemo(() => {
    const result = { paid: 0, pending: 0, overdue: 0, vacant: 0 };
    for (const bed of room?.beds ?? []) result[bedVisualStatus(bed)] += 1;
    return result;
  }, [room]);

  if (!isLoading && !room) return <Screen edges={['bottom']}><ErrorState message={loadError ?? 'Room not found in this property.'} onRetry={refetch} /></Screen>;

  if (isLoading || !room) {
    return (
      <Screen edges={['bottom']} background={colors.canvas}>
        <View style={styles.skeletons}>
          <Skeleton height={40} width={160} />
          <Skeleton height={96} radius={borderRadius.lg} />
          <View style={styles.bedRow}>
            <Skeleton height={168} radius={borderRadius.lg} style={styles.flex} />
            <Skeleton height={168} radius={borderRadius.lg} style={styles.flex} />
          </View>
        </View>
      </Screen>
    );
  }

  const occupantCount = room.beds.filter((b) => b.tenancy).length;
  const bedRows: (typeof room.beds)[] = [];
  for (let i = 0; i < room.beds.length; i += 2) bedRows.push(room.beds.slice(i, i + 2));

  return (
    <Screen edges={['bottom']} padded={false} background={colors.canvas}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={enterHeader()} style={styles.header}>
          <Typography variant="display">Room {room.number}</Typography>
          <Typography variant="caption" color="textSecondary">
            {room.sharingType} sharing · {room.floorName || `Floor ${room.floorNumber}`}
            {room.blockName ? ` · Block ${room.blockName}` : ''} · {occupantCount}/{room.beds.length}{' '}
            occupied
          </Typography>
          <View style={styles.legend}>
            {BED_VISUAL_STATUSES.filter((s) => counts[s] > 0).map((s) => (
              <View key={s} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: BED_VISUAL_STATUS_META[s].color }]} />
                <Typography variant="small" color="textSecondary">
                  {counts[s]} {BED_VISUAL_STATUS_META[s].label.toLowerCase()}
                </Typography>
              </View>
            ))}
          </View>
        </Animated.View>

        {canSetRent && (
          <Animated.View entering={enterItem(0)}>
            <Surface style={styles.rent}>
              <View style={styles.rentText}>
                <Typography variant="overline" color="textSecondary">
                  Room rent
                </Typography>
                <Typography variant="bodySemibold">
                  {room.defaultRent === null
                    ? 'Set per tenant'
                    : `${formatINR(room.defaultRent)}/mo${
                        room.defaultMaintenance
                          ? ` + ${formatINR(room.defaultMaintenance)}`
                          : ''
                      }`}
                </Typography>
                <Typography variant="small" color="textSecondary">
                  {room.defaultRent === null
                    ? 'No room default yet.'
                    : 'Pre-fills every new move-in.'}
                </Typography>
              </View>
              <Button
                title="Set rent"
                icon="currency-inr"
                size="sm"
                variant="outline"
                onPress={() => setRentOpen(true)}
              />
            </Surface>
          </Animated.View>
        )}

        <Animated.View entering={enterItem(1)}>
          <SectionHeader title="Beds" meta={`${room.beds.length} in this room`} />
          <View style={styles.beds}>
            {bedRows.map((row, r) => (
              <View key={r} style={styles.bedRow}>
                {row.map((bed) => (
                  <BedCard
                    key={bed.id}
                    bed={bed}
                    isFlat={property.isFlat}
                    onPress={() => {
                      setSheetBedId(bed.id);
                      setSheetOpen(true);
                    }}
                  />
                ))}
                {row.length === 1 && <View style={styles.flex} />}
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <BedSheet
        visible={sheetOpen}
        roomNumber={room.number}
        bed={sheetBed}
        isFlat={property.isFlat}
        onClose={() => setSheetOpen(false)}
      />
      <RoomRentSheet
        visible={rentOpen}
        isFlat={property.isFlat}
        room={{
          id: room.id,
          number: room.number,
          defaultRent: room.defaultRent,
          defaultMaintenance: room.defaultMaintenance,
          occupantCount,
        }}
        onClose={() => setRentOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: GUTTER,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    paddingTop: spacing.sm,
    gap: 4,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  rentText: {
    flex: 1,
    gap: 2,
  },
  beds: {
    gap: spacing.sm + 4,
  },
  bedRow: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
  },
  flex: {
    flex: 1,
  },
  skeletons: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
});
