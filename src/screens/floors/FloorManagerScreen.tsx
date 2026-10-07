import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  EmptyState,
  FilterChips,
  LargeTitle,
  RoomCard,
  Screen,
  SegmentedControl,
  Skeleton,
  TopBar,
  Typography,
  enterItem,
  useScrollHeader,
} from '@/components';
import { BED_VISUAL_STATUSES, BED_VISUAL_STATUS_META, bedVisualStatus } from '@/constants';
import { useFloorLayout, useFloorNavigation } from '@/hooks';
import { useActiveProperty } from '@/store';
import { borderRadius, colors, fontFamilies, spacing, GUTTER } from '@/theme';
import { BedSheet } from './BedSheet';

const GRID_COLUMNS = 3;

/**
 * FloorManagerScreen
 *
 * The web Floor Manager for touch: block selector (only with more than one
 * block — the web rule), floor chips, a live legend of the floor's bed states
 * and the room grid with one status dot per bed. Tapping a room opens its
 * beds; flat properties open the unit sheet directly. The web floor banner's
 * giant numeral sits behind the grid as a ghost.
 */
export function FloorManagerScreen() {
  const router = useRouter();
  const property = useActiveProperty();
  const { data: nav, isLoading: navLoading } = useFloorNavigation(property.id);
  const { scrollY, onScroll } = useScrollHeader();

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
  // stops being valid — first load and property switches.
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

  const { data: rooms, isLoading: layoutLoading, isRefreshing, refresh } =
    useFloorLayout(selectedFloorId);

  // Flat properties open the unit sheet straight from the tile.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetRoomId, setSheetRoomId] = useState<string | null>(null);
  const sheetRoom = rooms?.find((r) => r.id === sheetRoomId) ?? null;

  const showBlocks = Boolean(nav?.hasBlocks && nav.blocks.length > 1);

  const activeFloor = floors.find((floor) => floor.id === selectedFloorId) ?? null;
  const floorGhostLabel =
    activeFloor === null
      ? ''
      : activeFloor.number < 0
        ? `B${Math.abs(activeFloor.number)}`
        : String(activeFloor.number).padStart(2, '0');

  const stats = useMemo(() => {
    const counts = { paid: 0, pending: 0, overdue: 0, vacant: 0 };
    let beds = 0;
    for (const room of rooms ?? []) {
      for (const bed of room.beds) {
        counts[bedVisualStatus(bed)] += 1;
        beds += 1;
      }
    }
    return { counts, beds, occupied: beds - counts.vacant };
  }, [rooms]);

  const gridRows = useMemo(() => {
    const list = rooms ?? [];
    const chunks: (typeof list)[] = [];
    for (let i = 0; i < list.length; i += GRID_COLUMNS) chunks.push(list.slice(i, i + GRID_COLUMNS));
    return chunks;
  }, [rooms]);

  const blockOptions = nav?.blocks.map((b) => ({ value: b.id, label: `Block ${b.name}` })) ?? [];

  return (
    <Screen edges={['top']} padded={false} keyboardAvoiding={false} background={colors.canvas}>
      <TopBar title="Floor Manager" scrollY={scrollY} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
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
        <LargeTitle
          title="Floor Manager"
          subtitle={
            rooms && activeFloor
              ? `${activeFloor.name ?? `Floor ${activeFloor.number}`} · ${rooms.length} ${property.isFlat ? 'flats' : 'rooms'} · ${stats.occupied}/${stats.beds} occupied`
              : 'Rooms and beds, floor by floor.'
          }
          scrollY={scrollY}
        />

        {navLoading || !nav ? (
          <View style={styles.skeletons}>
            <Skeleton height={34} radius={17} width="70%" />
            <Skeleton height={240} radius={borderRadius.lg} />
          </View>
        ) : (
          <View style={styles.body}>
            {showBlocks &&
              (blockOptions.length <= 4 ? (
                <SegmentedControl
                  options={blockOptions}
                  value={selectedBlockId ?? ''}
                  onChange={(blockId) => {
                    setSelectedBlockId(blockId);
                    const block = nav.blocks.find((b) => b.id === blockId);
                    setSelectedFloorId(block?.floors[0]?.id ?? null);
                  }}
                />
              ) : (
                <FilterChips
                  inset={GUTTER}
                  options={blockOptions}
                  value={selectedBlockId ?? ''}
                  onChange={(blockId) => {
                    setSelectedBlockId(blockId);
                    const block = nav.blocks.find((b) => b.id === blockId);
                    setSelectedFloorId(block?.floors[0]?.id ?? null);
                  }}
                />
              ))}

            <FilterChips
              inset={GUTTER}
              options={floors.map((floor) => ({
                value: floor.id,
                label: floor.name ?? `Floor ${floor.number}`,
              }))}
              value={selectedFloorId ?? ''}
              onChange={setSelectedFloorId}
            />

            {/* Legend — generated from the same map the dots use (web WIP). */}
            <View style={styles.legend}>
              {BED_VISUAL_STATUSES.map((status) => (
                <View key={status} style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: BED_VISUAL_STATUS_META[status].color }]}
                  />
                  <Typography variant="small" color="textSecondary">
                    {BED_VISUAL_STATUS_META[status].label}
                    {rooms ? (
                      <Typography variant="smallMedium"> {stats.counts[status]}</Typography>
                    ) : null}
                  </Typography>
                </View>
              ))}
            </View>

            {layoutLoading || !selectionValid ? (
              <View style={styles.skeletons}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={styles.gridRow}>
                    <Skeleton height={104} radius={borderRadius.lg} style={styles.flex} />
                    <Skeleton height={104} radius={borderRadius.lg} style={styles.flex} />
                    <Skeleton height={104} radius={borderRadius.lg} style={styles.flex} />
                  </View>
                ))}
              </View>
            ) : (rooms ?? []).length === 0 ? (
              <EmptyState icon="door" title="No rooms on this floor yet." />
            ) : (
              // Keyed by floor so switching floors replays the entrance.
              <Animated.View key={selectedFloorId ?? 'none'} entering={FadeIn.duration(160)} style={styles.grid}>
                {gridRows.map((row, rowIndex) => (
                  <Animated.View key={rowIndex} entering={enterItem(rowIndex, 40)} style={styles.gridRow}>
                    {row.map((room) => (
                      <RoomCard
                        key={room.id}
                        room={room}
                        isFlat={property.isFlat}
                        onPress={() => {
                          if (property.isFlat && room.beds[0]) {
                            setSheetRoomId(room.id);
                            setSheetOpen(true);
                          } else {
                            router.push(`/(main)/rooms/${room.id}` as never);
                          }
                        }}
                      />
                    ))}
                    {row.length < GRID_COLUMNS &&
                      Array.from({ length: GRID_COLUMNS - row.length }, (_, i) => (
                        <View key={`pad-${i}`} style={styles.flex} />
                      ))}
                  </Animated.View>
                ))}

                <View style={styles.floorGhostRow} pointerEvents="none">
                  <Typography aria-hidden style={styles.floorGhost}>
                    {floorGhostLabel}
                  </Typography>
                </View>
              </Animated.View>
            )}
          </View>
        )}
      </Animated.ScrollView>

      <BedSheet
        bed={sheetRoom?.beds[0] ?? null}
        roomNumber={sheetRoom?.number ?? ''}
        isFlat={property.isFlat}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: GUTTER,
    paddingBottom: spacing.xxl,
  },
  body: {
    gap: spacing.md,
  },
  skeletons: {
    gap: spacing.sm + 4,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: 6,
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
  grid: {
    gap: spacing.sm + 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
  },
  flex: {
    flex: 1,
  },
  floorGhostRow: {
    alignItems: 'flex-end',
    marginTop: -spacing.xs,
    marginRight: -spacing.xs,
  },
  floorGhost: {
    fontSize: 132,
    lineHeight: 132,
    fontFamily: fontFamilies.extrabold,
    letterSpacing: -7,
    color: 'rgba(40, 43, 48, 0.05)',
    includeFontPadding: false,
  },
});
