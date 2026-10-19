import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { BottomSheet, EmptyState, FilterChips, ListRow, SearchBar, SectionHeader, Typography } from '@/components';
import { getOccupancyDirectory } from '@/data/queries';
import { useAsyncData } from '@/hooks';
import { useActiveProperty } from '@/store';
import type { BedStatus } from '@/types';
import { spacing } from '@/theme';

export function OccupancyDirectory({ status, onClose }: { status: BedStatus | null; onClose: () => void }) {
  const property = useActiveProperty();
  const router = useRouter();
  const { data } = useAsyncData(() => getOccupancyDirectory(property.id), [property.id], { enabled: status !== null });
  const [search, setSearch] = useState('');
  const [floor, setFloor] = useState('ALL');
  const occupied = status === 'OCCUPIED';
  const entries = useMemo(() => (data ?? []).filter(e => e.status === status), [data, status]);
  const floors = [...new Map(entries.map(e => [e.floorId, { value: e.floorId, label: `${e.blockName ? `Block ${e.blockName} · ` : ''}${e.floorName}` }])).values()];
  const filtered = entries.filter(e => (floor === 'ALL' || e.floorId === floor) && (!search.trim() || `${e.tenant?.fullName ?? ''} ${e.roomNumber} ${e.floorName} ${e.blockName ?? ''} ${e.bedLabel}`.toLowerCase().includes(search.trim().toLowerCase())));
  const groups = new Map<string, typeof filtered>();
  for (const entry of filtered) groups.set(entry.floorId, [...(groups.get(entry.floorId) ?? []), entry]);
  const unit = property.isFlat ? 'flats' : 'beds';
  function close() { setSearch(''); setFloor('ALL'); onClose(); }
  return <BottomSheet visible={status !== null} onClose={close} title={`${occupied ? 'Occupied' : 'Available'} ${unit}`}>
    <View style={{ gap: spacing.md }}>
      <SearchBar value={search} onChangeText={setSearch} placeholder={occupied ? 'Search by name or room' : 'Search by room or floor'} />
      {floors.length > 1 && <FilterChips value={floor} onChange={setFloor} options={[{ value: 'ALL', label: 'All floors' }, ...floors]} />}
      <Typography variant="small" color="textSecondary">{filtered.length} of {entries.length} {unit}</Typography>
      {!filtered.length && <EmptyState icon="bed-outline" title={entries.length ? `No matching ${unit}.` : `No ${occupied ? 'occupied' : 'available'} ${unit} yet.`} />}
      {[...groups].map(([floorId, rows]) => {
        const grouped = new Map<string, { entry: typeof rows[number]; beds: string[] }>();
        for (const entry of rows) {
          const key = occupied ? entry.id : entry.roomId;
          const group = grouped.get(key);
          if (group) group.beds.push(entry.bedLabel); else grouped.set(key, { entry, beds: [entry.bedLabel] });
        }
        return <View key={floorId}>
          <SectionHeader title={`${rows[0].blockName ? `Block ${rows[0].blockName} · ` : ''}${rows[0].floorName}`} />
          {[...grouped.values()].map(({ entry, beds }, i) => <ListRow key={entry.id} divider={i > 0}
            title={occupied && entry.tenant ? entry.tenant.fullName : `${property.isFlat ? 'Flat' : 'Room'} ${entry.roomNumber}`}
            subtitle={occupied ? `${property.isFlat ? 'Flat' : 'Room'} ${entry.roomNumber}${property.isFlat ? '' : ` · Bed ${entry.bedLabel}`}` : property.isFlat ? 'Available' : `${beds.length === 1 ? 'Bed' : 'Beds'} ${beds.join(', ')}`}
            onPress={() => {
              close();
              if (occupied && entry.tenant) router.push(`/(main)/tenants/${entry.tenant.id}` as never);
              else router.navigate({ pathname: '/(main)/(tabs)/floors', params: { floor: entry.floorId, ...(entry.blockId ? { block: entry.blockId } : {}) } } as never);
            }} />)}
        </View>;
      })}
    </View>
  </BottomSheet>;
}
