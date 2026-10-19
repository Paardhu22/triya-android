import { FloorPlan } from './FloorPlan';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated from 'react-native-reanimated';

import {
  EmptyState,
  ErrorState,
  FilterChips,
  LargeTitle,
  Screen,
  SegmentedControl,
  Skeleton,
  TopBar,
  Typography,
  useScrollHeader,
} from '@/components';
import { BED_VISUAL_STATUSES, BED_VISUAL_STATUS_META, bedVisualStatus } from '@/constants';
import { useFloorLayout, useFloorNavigation } from '@/hooks';
import type { FloorRoom } from '@/data';
import { useActiveProperty } from '@/store';
import { borderRadius, colors, spacing, GUTTER } from '@/theme';
import { BedSheet } from './BedSheet';



/**
 * FloorManagerScreen
 *
 * The web Floor Manager for touch: block selector (only with more than one
 * block — the web rule), floor chips, a live legend of the floor's bed states
 * and the shared schematic floor plan. Tapping a bed opens its tenant sheet;
 * tapping a room opens its details. Flat properties open the unit directly.
 */
export function FloorManagerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ floor?: string; block?: string }>();
  const property = useActiveProperty();
  const { data: nav, isLoading: navLoading, error: navError, refetch: reloadNav } = useFloorNavigation(property.id);
  const { scrollY, onScroll } = useScrollHeader();

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(params.block ?? null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(params.floor ?? null);

  const routeSelection = `${params.block ?? ''}:${params.floor ?? ''}`;
  const [lastRouteSelection, setLastRouteSelection] = useState(routeSelection);
  if (routeSelection !== lastRouteSelection) {
    setLastRouteSelection(routeSelection);
    if (params.floor) { setSelectedBlockId(params.block ?? null); setSelectedFloorId(params.floor); }
  }

  const floors = useMemo(() => {
    if (!nav) return [];
    return nav.hasBlocks
      ? nav.blocks.find((b) => b.id === selectedBlockId)?.floors ?? []
      : nav.floors;
  }, [nav, selectedBlockId]);

  const selectionValid = floors.some((floor) => floor.id === selectedFloorId);

  // Adjust only when navigation changes; preserve a still-valid floor on refresh.
  const [lastNav, setLastNav] = useState(nav);
  if (nav !== lastNav) {
    setLastNav(nav);
    if (nav && !selectionValid) {
      const block = nav.hasBlocks ? nav.blocks.find(b => b.id === selectedBlockId) ?? nav.blocks[0] : null;
      setSelectedBlockId(block?.id ?? null);
      setSelectedFloorId((block?.floors ?? nav.floors)[0]?.id ?? null);
    }
  }

  const { data: rooms, isLoading: layoutLoading, error: layoutError, refetch: reloadLayout, isRefreshing, refresh } =
    useFloorLayout(selectedFloorId);

  // Both rooms and flats can open a bed directly from the floor plan.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetRoomId, setSheetRoomId] = useState<string | null>(null);
  const [sheetBedId, setSheetBedId] = useState<string | null>(null);
  const sheetRoom = rooms?.find((r) => r.id === sheetRoomId) ?? null;
  const openBed = useCallback((room: FloorRoom, bedId: string) => {
    setSheetRoomId(room.id); setSheetBedId(bedId); setSheetOpen(true);
  }, []);
  const openRoom = useCallback((room: FloorRoom) => {
    if (property.isFlat && room.beds[0]) openBed(room, room.beds[0].id);
    else router.push(`/(main)/rooms/${room.id}` as never);
  }, [property.isFlat, router, openBed]);

  const showBlocks = Boolean(nav?.hasBlocks && nav.blocks.length > 1);

  const activeFloor = floors.find((floor) => floor.id === selectedFloorId) ?? null;
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

        {!navLoading && !nav ? <ErrorState message={navError ?? 'Floor navigation unavailable'} onRetry={reloadNav} /> : navLoading || !nav ? (
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

            {/* Legend and schematic beds share the same status map. */}
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

            {layoutError && !rooms ? <ErrorState message={layoutError} onRetry={reloadLayout} /> : !selectedFloorId ? <EmptyState title="No floors configured for this property." icon="stairs" /> : layoutLoading || !selectionValid ? (
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
              <FloorPlan key={selectedFloorId} rooms={rooms ?? []} isFlat={property.isFlat}
                floorLabel={`${activeFloor?.name ?? `Floor ${activeFloor?.number ?? ''}`}${selectedBlockId ? ` · Block ${nav.blocks.find(b => b.id === selectedBlockId)?.name ?? ''}` : ''}`}
                onRoom={openRoom}
                onBed={openBed} />
            )}
          </View>
        )}
      </Animated.ScrollView>

      <BedSheet
        bed={sheetRoom?.beds.find(b => b.id === sheetBedId) ?? null}
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
  gridRow: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
  },
  flex: {
    flex: 1,
  },
});
