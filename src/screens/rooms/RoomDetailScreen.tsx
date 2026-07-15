import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Divider } from '@/components/Divider';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Typography } from '@/components/Typography';
import { BedCard } from '@/components/cards/BedCard';
import { BedSheet } from '@/screens/floors/BedSheet';
import { useRoomDetail } from '@/hooks';
import { useActiveProperty } from '@/store';
import { spacing } from '@/theme';
import type { FloorBed } from '@/mocks';

export function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const property = useActiveProperty();
  const { data: room, isLoading, refetch } = useRoomDetail(id);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetBed, setSheetBed] = useState<FloorBed | null>(null);

  if (isLoading || !room) return null;

  return (
    <Screen edges={['bottom']} scrollable>
      <View style={styles.header}>
        <Typography variant="h2">Room {room.number}</Typography>
        <Typography variant="bodyMedium" color="textSecondary">
          {room.sharingType} sharing • {room.floorName || `Floor ${room.floorNumber}`}
          {room.blockName ? ` • ${room.blockName}` : ''}
        </Typography>
      </View>
      
      <Divider verticalSpacing="lg" />
      
      <View style={styles.content}>
        <SectionHeader title="Beds" />
        <View style={styles.list}>
          {room.beds.map((bed) => (
            <BedCard
              key={bed.id}
              bed={bed}
              isFlat={!property.hasBlocks}
              onPress={() => {
                setSheetBed(bed);
                setSheetOpen(true);
              }}
            />
          ))}
        </View>
      </View>

      <BedSheet
        visible={sheetOpen}
        roomNumber={room.number}
        bed={sheetBed}
        isFlat={!property.hasBlocks}
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
});
