import { createElement, memo, useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, Pattern, Rect, Text as SvgText } from 'react-native-svg';
import { Icon, Typography } from '@/components';
import { BED_VISUAL_STATUS_META, bedVisualStatus } from '@/constants';
import type { FloorRoom } from '@/data';
import { colors, fontFamilies, spacing } from '@/theme';
import { CORRIDOR_HEIGHT, PLAN_MARGIN, ROOM_WIDTH, floorPlanLayout, planRoomPosition } from '@/utils/floorPlan';

export const FloorPlan = memo(function FloorPlan({ rooms, isFlat, floorLabel, onRoom, onBed }: {
  rooms: FloorRoom[]; isFlat: boolean; floorLabel: string;
  onRoom: (room: FloorRoom) => void; onBed: (room: FloorRoom, bedId: string) => void;
}) {
  const [width, setWidth] = useState(340);
  const [zoom, setZoom] = useState(1);
  const id = `wood${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const layout = floorPlanLayout(rooms.length, Math.max(0, ...rooms.map(r => r.beds.length)), width >= 640 ? 3 : 2);
  const scale = Math.min(1, width / layout.width) * zoom;
  const available = rooms.reduce((n, r) => n + r.beds.filter(b => bedVisualStatus(b) === 'vacant').length, 0);
  return <View style={styles.board} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
    <View style={styles.toolbar}>
      <View style={styles.flex}>
        <Typography variant="captionMedium">{floorLabel}</Typography>
        <Typography variant="small" color="textSecondary">{rooms.length} {isFlat ? 'flats' : 'rooms'} · {available} available</Typography>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Zoom out floor plan" disabled={zoom <= 1} onPress={() => setZoom(z => Math.max(1, z - 0.5))} style={styles.zoom}>
        <Icon name="minus" size={19} color={zoom <= 1 ? colors.textTertiary : colors.primary} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Reset floor plan zoom" onPress={() => setZoom(1)} style={styles.zoom}>
        <Typography variant="smallMedium">{Math.round(zoom * 100)}%</Typography>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Zoom in floor plan" disabled={zoom >= 2.5} onPress={() => setZoom(z => Math.min(2.5, z + 0.5))} style={styles.zoom}>
        <Icon name="plus" size={19} color={zoom >= 2.5 ? colors.textTertiary : colors.primary} />
      </Pressable>
    </View>
    <ScrollView horizontal nestedScrollEnabled bounces={false} style={styles.viewport}>
      <ScrollView nestedScrollEnabled style={{ width: Math.max(width, layout.width * scale), maxHeight: 460 }} contentContainerStyle={{ alignItems: 'center' }}>
        <Svg width={layout.width * scale} height={layout.height * scale} viewBox={`0 0 ${layout.width} ${layout.height}`}>
          <Defs><Pattern id={id} width={32} height={16} patternUnits="userSpaceOnUse">
            <Rect width={32} height={16} fill="#f7f3ed" />
            <Path d="M0 0h32M0 16h32M16 0v16" stroke="#e9e2d9" strokeWidth={0.6} />
          </Pattern></Defs>
          <Rect x={PLAN_MARGIN - 5} y={PLAN_MARGIN - 5} width={layout.width - PLAN_MARGIN * 2 + 10} height={layout.height - PLAN_MARGIN * 2 + 10} rx={5} fill="#e9ecf1" stroke="#b8bec9" strokeWidth={2} />
          {Array.from({ length: Math.ceil(layout.rows / 2) }, (_, pair) => {
            const y = PLAN_MARGIN + pair * (layout.roomHeight * 2 + CORRIDOR_HEIGHT) + layout.roomHeight;
            return <G key={pair}>
              <Rect x={PLAN_MARGIN} y={y} width={layout.columns * ROOM_WIDTH} height={CORRIDOR_HEIGHT} fill="#edf0f5" />
              <Path d={`M ${PLAN_MARGIN + 12} ${y + CORRIDOR_HEIGHT / 2} h ${layout.columns * ROOM_WIDTH - 24}`} stroke="#c7cedb" strokeWidth={1} strokeDasharray="4 8" />
              <Rect x={layout.width / 2 - 36} y={y + 10} width={72} height={18} rx={9} fill="#edf0f5" />
              <SvgText x={layout.width / 2} y={y + 23} textAnchor="middle" fontSize={10} fontFamily={fontFamilies.medium} fill="#8b95a6">CORRIDOR</SvgText>
            </G>;
          })}
          {rooms.map((room, index) => <PlanRoom key={room.id} room={room} {...planRoomPosition(index, layout)} height={layout.roomHeight}
            pattern={id} isFlat={isFlat} onRoom={() => onRoom(room)} onBed={bedId => onBed(room, bedId)} />)}
        </Svg>
      </ScrollView>
    </ScrollView>
    <Typography variant="small" color="textSecondary" style={styles.hint}>Tap a bed to manage its tenant. Scroll to explore or zoom for a closer view.</Typography>
  </View>;
});
/** RN Web replaces SVG groups with HTML buttons when accessibilityRole is set. */
function PlanAction({ children, transform, label, onPress }: {
  children: ReactNode; transform?: string; label: string; onPress: () => void;
}) {
  if (Platform.OS === 'web') return createElement('g', {
    transform, role: 'button', 'aria-label': label, tabIndex: 0, onClick: onPress,
    style: { cursor: 'pointer' },
    onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onPress(); }
    },
  }, children);
  return <G transform={transform} onPress={onPress} accessible accessibilityRole="button" accessibilityLabel={label}>{children}</G>;
}
function PlanRoom({ room, x, y, height, bottomDoor, pattern, isFlat, onRoom, onBed }: {
  room: FloorRoom; x: number; y: number; height: number; bottomDoor: boolean; pattern: string; isFlat: boolean;
  onRoom: () => void; onBed: (id: string) => void;
}) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(room.beds.length)));
  const rows = Math.max(1, Math.ceil(room.beds.length / columns));
  const cellWidth = (ROOM_WIDTH - 32) / columns;
  const cellHeight = (height - 72) / rows;
  const bedWidth = Math.min(46, cellWidth - 16, (cellHeight - 14) / 1.5);
  const bedHeight = bedWidth * 1.5;
  const doorY = bottomDoor ? height : 0;
  const direction = bottomDoor ? -1 : 1;
  const free = room.beds.filter(b => bedVisualStatus(b) === 'vacant').length;
  return <G transform={`translate(${x} ${y})`}>
    <PlanAction onPress={onRoom} label={`${isFlat ? 'Flat' : 'Room'} ${room.number}, ${free} available`}>
      <Rect x={3} y={3} width={ROOM_WIDTH - 6} height={height - 6} rx={3} fill={`url(#${pattern})`} stroke="#a4aab6" strokeWidth={5} />
      <SvgText x={16} y={25} fill={colors.text} fontSize={18} fontFamily={fontFamilies.semibold}>{room.number}</SvgText>
      <SvgText x={16} y={height - 13} fill={colors.textSecondary} fontSize={11} fontFamily={fontFamilies.regular}>{free} available · {room.beds.length} {isFlat ? 'unit' : 'beds'}</SvgText>
      <Rect x={72} y={bottomDoor ? 0 : height - 5} width={68} height={5} rx={1} fill="#e7f1fa" stroke="#99b7ce" />
      <Path d={`M ${ROOM_WIDTH - 60} ${doorY} h 30`} stroke="#f0f1f4" strokeWidth={7} />
      <Path d={`M ${ROOM_WIDTH - 60} ${doorY} v ${direction * 30}`} stroke="#8d94a0" strokeWidth={2} />
      <Path d={`M ${ROOM_WIDTH - 60} ${doorY + direction * 30} a 30 30 0 0 ${bottomDoor ? 1 : 0} 30 ${-direction * 30}`} fill="none" stroke="#b5bbc5" strokeDasharray="3 2" />
      {!room.beds.length && <SvgText x={ROOM_WIDTH / 2} y={height / 2} textAnchor="middle" fill={colors.textSecondary} fontSize={12}>No beds configured</SvgText>}
    </PlanAction>
    {room.beds.map((bed, index) => {
      const status = bedVisualStatus(bed), meta = BED_VISUAL_STATUS_META[status];
      const row = Math.floor(index / columns), inRow = Math.min(columns, room.beds.length - row * columns);
      const bx = (ROOM_WIDTH - inRow * cellWidth) / 2 + index % columns * cellWidth + (cellWidth - bedWidth) / 2;
      const by = 38 + row * cellHeight + (cellHeight - bedHeight - 12) / 2;
      return <PlanAction key={bed.id} transform={`translate(${bx} ${by})`} onPress={() => onBed(bed.id)}
        label={`${isFlat ? 'Flat' : 'Room'} ${room.number}, bed ${bed.label}: ${meta.label}${bed.tenancy ? `, ${bed.tenancy.tenant.fullName}` : ', assign tenant'}`}>
        <Rect x={-10} y={-8} width={bedWidth + 20} height={bedHeight + 26} fill="transparent" />
        <Rect x={-2} y={-3} width={bedWidth + 4} height={9} rx={2} fill="#b6a18d" />
        <Rect width={bedWidth} height={bedHeight} rx={4} fill="#fff" stroke="#b8bdc7" />
        <Rect x={5} y={5} width={bedWidth - 10} height={bedHeight * 0.2} rx={3} fill="#f9fafb" stroke="#dce0e6" strokeWidth={0.8} />
        <Rect x={2} y={bedHeight * 0.4} width={bedWidth - 4} height={bedHeight * 0.6 - 2} rx={3} fill={meta.color} fillOpacity={0.16} />
        <Path d={`M 2 ${bedHeight * 0.4} h ${bedWidth - 4}`} stroke={meta.color} strokeWidth={4} />
        <Circle cx={bedWidth / 2} cy={bedHeight * 0.7} r={3} fill={meta.color} />
        <SvgText x={bedWidth / 2} y={bedHeight + 13} textAnchor="middle" fontSize={11} fontFamily={fontFamilies.semibold} fill={colors.textSecondary}>{bed.label}</SvgText>
      </PlanAction>;
    })}
  </G>;
}
const styles = StyleSheet.create({
  board: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.background },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  flex: { flex: 1, gap: 3 }, zoom: { minWidth: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  viewport: { backgroundColor: '#f6f7f9' }, hint: { padding: spacing.sm + 4, lineHeight: 18 },
});
