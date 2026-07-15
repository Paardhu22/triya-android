import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated from 'react-native-reanimated';

import { Divider } from '@/components/Divider';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { Typography } from '@/components/Typography';
import { BedCard } from '@/components/cards/BedCard';
import { enterHeader, enterItem } from '@/components/motion';
import { BedSheet } from '@/screens/floors/BedSheet';
import { useRoomDetail } from '@/hooks';
import { useActiveProperty } from '@/store';
import { spacing } from '@/theme';
import type { FloorBed } from '@/mocks';

/**
 * RoomDetailScreen
 *
 * One room's beds (the web room-view dialog as a pushed screen). Tapping a
 * bed opens the BedSheet with the tenant details or the check-in form.
 * Flat properties never land here — the Floor Manager opens the unit sheet
 * directly.
 */
export function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const property = useActiveProperty();
  const { data: room, isLoading, refetch } = useRoomDetail(id);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetBed, setSheetBed] = useState<FloorBed | null>(null);

  if (isLoading || !room) {
    return (
      <Screen edges={['bottom']}>
        <View style={styles.skeletons}>
          <Skeleton height={56} radius={12} />
          <Skeleton height={96} radius={12} />
          <Skeleton height={96} radius={12} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']} scrollable>
      <Animated.View entering={enterHeader()} style={styles.header}>
        <Typography variant="h2">Room {room.number}</Typography>
        <Typography variant="bodyMedium" color="textSecondary">
          {room.sharingType} sharing • {room.floorName || `Floor ${room.floorNumber}`}
          {room.blockName ? ` • ${room.blockName}` : ''}
        </Typography>
      </Animated.View>

      <Divider verticalSpacing="lg" />

      <View style={styles.content}>
        <SectionHeader title="Beds" />
        <View style={styles.list}>
          {room.beds.map((bed, index) => (
            <Animated.View key={bed.id} entering={enterItem(index)}>
              <BedCard
                bed={bed}
                isFlat={property.isFlat}
                onPress={() => {
                  setSheetBed(bed);
                  setSheetOpen(true);
                }}
              />
            </Animated.View>
          ))}
        </View>
      </View>

      <BedSheet
        visible={sheetOpen}
        roomNumber={room.number}
        bed={sheetBed}
        isFlat={property.isFlat}
        onClose={() => {
          setSheetOpen(false);
          refetch(); // Refetch room details in case tenancy changed
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.lg,
  },
  content: {
    marginBottom: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  skeletons: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
});
