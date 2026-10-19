/** Same room, door and corridor geometry as triya-manager's schematic floor plan. */
export const ROOM_WIDTH = 212;
export const CORRIDOR_HEIGHT = 38;
export const PLAN_MARGIN = 20;
export function floorPlanLayout(roomCount: number, maxBeds: number, columns = 2) {
  const count = Math.max(0, roomCount);
  const cols = Math.max(1, Math.min(columns, count || 1));
  const rows = Math.ceil(count / cols);
  const roomHeight = Math.max(184, 76 + Math.ceil(Math.sqrt(Math.max(0, maxBeds))) * 52);
  return { columns: cols, rows, roomHeight, width: cols * ROOM_WIDTH + PLAN_MARGIN * 2,
    height: rows * roomHeight + Math.ceil(rows / 2) * CORRIDOR_HEIGHT + PLAN_MARGIN * 2 };
}
export function planRoomPosition(index: number, layout: ReturnType<typeof floorPlanLayout>) {
  const row = Math.floor(index / layout.columns);
  return { x: PLAN_MARGIN + index % layout.columns * ROOM_WIDTH,
    y: PLAN_MARGIN + Math.floor(row / 2) * (layout.roomHeight * 2 + CORRIDOR_HEIGHT) + row % 2 * (layout.roomHeight + CORRIDOR_HEIGHT),
    bottomDoor: row % 2 === 0 };
}
