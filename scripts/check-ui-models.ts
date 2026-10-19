import { floorPlanLayout, planRoomPosition, ROOM_WIDTH, CORRIDOR_HEIGHT } from '../src/utils/floorPlan';
import { uploadError, DEFAULT_UPLOAD_POLICY } from '../src/utils/uploadPolicy';

let checks = 0;
function check(value: unknown, message: string) { if (!value) throw new Error(message); checks++; }
for (const count of [0, 1, 5, 10, 14, 70]) {
  const layout = floorPlanLayout(count, 3);
  check(layout.width > 0 && layout.height > 0, `Positive bounds for ${count} rooms`);
  for (let i = 0; i < count; i++) {
    const position = planRoomPosition(i, layout);
    check(position.x + ROOM_WIDTH <= layout.width && position.y + layout.roomHeight <= layout.height, `Room ${i} remains inside the floor plan`);
    if (i >= layout.columns) {
      const above = planRoomPosition(i - layout.columns, layout);
      check(position.y >= above.y + layout.roomHeight + (position.bottomDoor ? 0 : CORRIDOR_HEIGHT), 'Rooms face a corridor without overlap');
    }
  }
}
const policy = { ...DEFAULT_UPLOAD_POLICY, maxFileBytes: 2 * 1024 * 1024 };
check(uploadError({ mimeType: 'application/pdf', size: policy.maxFileBytes }, policy) === null, 'Configured file-size boundary accepted');
check(!!uploadError({ mimeType: 'application/pdf', size: policy.maxFileBytes + 1 }, policy), 'Backend size limit enforced on mobile');
check(!!uploadError({ mimeType: 'image/svg+xml', size: 100 }, policy), 'Unsupported storage type rejected before upload');
check(!!uploadError({ mimeType: 'image/png', size: 0 }, policy), 'Empty files rejected');
check(uploadError({ mimeType: 'image/heic', size: 100 }, policy) === null, 'HEIC matches backend storage support');
console.log(`UI/storage model checks: ${checks} passed.`);
