import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import {
  EmptyState,
  FilterChips,
  RoomCard,
  Screen,
  Skeleton,
  Typography,
  enterItem,
} from '@/components';
import { BED_VISUAL_STATUSES, BED_VISUAL_STATUS_META } from '@/constants';
import { useFloorLayout, useFloorNavigation } from '@/hooks';
import type { FloorBed } from '@/mocks';
import { useActiveProperty } from '@/store';
import { colors, fontFamilies, spacing } from '@/theme';
import { TabHeader } from '../shared/TabHeader';
import { BedSheet } from './BedSheet';

const GRID_COLUMNS = 3;

/**
 * FloorManagerScreen
 *
 * The web Floor Manager redesigned for touch: block chips (only when the
 * property has more than one block — the web rule), floor chips, then the
 * room grid with per-bed status dots. Tapping a room opens its bed view;
 * flat properties skip straight to the unit sheet since a "room" has exactly
 * one bed.
 */
export function FloorManagerScreen() {
  const router = useRouter();
  const property = useActiveProperty();
  const { data: nav, isLoading: navLoading } = useFloorNavigation(property.id);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);

  const floors = useMemo(() => {
    if (!nav) return [];
    return nav.hasBlocks
      ? nav.blocks.find((b) => b.id === selectedBlockId)?.floors ?? []
      : nav.floors;
  }, [nav, selectedBlockId]);

  const selectionValid = floors.some((floor) => floor.id === selectedFloorId);

  // (Re)initialise to the first block/floor whenever the current selection
  // stops being valid — first load and property switches — while leaving a
  // valid selection untouched across silent data refreshes.
  useEffect(() => {
    if (!nav || selectionValid) return;
    if (nav.hasBlocks) {
      const block = nav.blocks[0] ?? null;
      setSelectedBlockId(block?.id ?? null);
      setSelectedFloorId(block?.floors[0]?.id ?? null);
    } else {
      setSelectedBlockId(null);
      setSelectedFloorId(nav.floors[0]?.id ?? null);
    }
  }, [nav, selectionValid]);

  const {
    data: rooms,
    isLoading: layoutLoading,
    isRefreshing,
    refresh,
  } = useFloorLayout(selectedFloorId);

  // Bed sheet (flat properties open it straight from the room tile).
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetBed, setSheetBed] = useState<FloorBed | null>(null);
  const [sheetRoomNumber, setSheetRoomNumber] = useState('');

  // Only surface the block selector when there is a genuine choice.
  const showBlocks = Boolean(nav?.hasBlocks && nav.blocks.length > 1);

  // The web floor banner's number treatment: basements read B1, B2…
  const activeFloor = floors.find((floor) => floor.id === selectedFloorId) ?? null;
  const floorGhostLabel =
    activeFloor === null
      ? ''
      : activeFloor.number < 0
        ? `B${Math.abs(activeFloor.number)}`
        : String(activeFloor.number).padStart(2, '0');

  const occupiedCount = useMemo(
    () =>
      (rooms ?? []).reduce(
        (sum, room) => sum + room.beds.filter((bed) => bed.status === 'OCCUPIED').length,
        0,
      ),
    [rooms],
  );
  const bedCount = useMemo(
    () => (rooms ?? []).reduce((sum, room) => sum + room.beds.length, 0),
    [rooms],
  );

  // Pad the last grid row so cards keep equal widths.
  const gridRows = useMemo(() => {
    const list = rooms ?? [];
    const chunks: (typeof list)[] = [];
    for (let i = 0; i < list.length; i += GRID_COLUMNS) {
      chunks.push(list.slice(i, i + GRID_COLUMNS));
    }
    return chunks;
  }, [rooms]);

  return (
    <Screen edges={['top']} padded={false} keyboardAvoiding={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <TabHeader title="Floor Manager" />

        {navLoading || !nav ? (
          <View style={styles.skeletons}>
            <Skeleton height={36} radius={18} />
            <Skeleton height={220} radius={12} />
          </View>
        ) : (
          <View style={styles.body}>
            {showBlocks && (
              <FilterChips
                options={nav.blocks.map((block) => ({
                  value: block.id,
                  label: `Block ${block.name}`,
                }))}
                value={selectedBlockId ?? ''}
                onChange={(blockId) => {
                  setSelectedBlockId(blockId);
                  const block = nav.blocks.find((b) => b.id === blockId);
                  setSelectedFloorId(block?.floors[0]?.id ?? null);
                }}
              />
            )}

            <FilterChips
              options={floors.map((floor) => ({
                value: floor.id,
                label: floor.name ?? `Floor ${floor.number}`,
              }))}
              value={selectedFloorId ?? ''}
              onChange={setSelectedFloorId}
            />

            {/* Legend */}
            <View style={styles.legend}>
              {BED_VISUAL_STATUSES.map((status) => (
                <View key={status} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: BED_VISUAL_STATUS_META[status].color },
                    ]}
                  />
                  <Typography variant="small" color="textSecondary">
                    {BED_VISUAL_STATUS_META[status].label}
                  </Typography>
                </View>
              ))}
            </View>

            {layoutLoading || !selectionValid ? (
              <View style={styles.skeletons}>
                <Skeleton height={110} radius={12} />
                <Skeleton height={110} radius={12} />
                <Skeleton height={110} radius={12} />
              </View>
            ) : (rooms ?? []).length === 0 ? (
              <EmptyState icon="door" title="No rooms on this floor yet." />
            ) : (
              // Keyed by floor so switching floors replays the entrance.
              <View key={selectedFloorId ?? 'none'} style={styles.grid}>
                <Typography variant="small" color="textTertiary">
                  {(rooms ?? []).length} {property.isFlat ? 'flats' : 'rooms'} · {occupiedCount}/
                  {bedCount} occupied
                </Typography>
                {gridRows.map((row, rowIndex) => (
                  <Animated.View
                    key={rowIndex}
                    entering={enterItem(rowIndex)}
                    style={styles.gridRow}
                  >
                    {row.map((room) => (
                      <RoomCard
                        key={room.id}
                        room={room}
                        isFlat={property.isFlat}
                        onPress={() => {
                          if (property.isFlat && room.beds[0]) {
                            setSheetBed(room.beds[0]);
                            setSheetRoomNumber(room.number);
                            setSheetOpen(true);
                          } else {
                            router.push(`/(main)/rooms/${room.id}` as any);
                          }
                        }}
                      />
                    ))}
                    {row.length < GRID_COLUMNS &&
                      Array.from({ length: GRID_COLUMNS - row.length }, (_, i) => (
                        <View key={`pad-${i}`} style={styles.gridSpacer} />
                      ))}
                  </Animated.View>
                ))}

                {/* The web floor banner's giant floor number, as a ghost. */}
                <View style={styles.floorGhostRow} pointerEvents="none">
                  <Typography aria-hidden style={styles.floorGhost}>
                    {floorGhostLabel}
                  </Typography>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <BedSheet
        bed={sheetBed}
        roomNumber={sheetRoomNumber}
        isFlat={property.isFlat}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  body: {
    gap: spacing.md,
  },
  skeletons: {
    gap: spacing.md,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  grid: {
    gap: spacing.sm + 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
  },
  gridSpacer: {
    flex: 1,
  },
  floorGhostRow: {
    alignItems: 'flex-end',
    marginTop: -spacing.sm,
    marginRight: -spacing.xs,
  },
  floorGhost: {
    fontSize: 128,
    lineHeight: 128,
    fontFamily: fontFamilies.bold,
    letterSpacing: -6,
    color: 'rgba(44, 48, 64, 0.06)',
    includeFontPadding: false,
  },
});
