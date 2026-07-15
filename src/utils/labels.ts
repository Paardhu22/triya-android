/**
 * Display-label rules shared across screens.
 *
 * The flat/PG wording rule comes from the backend Property.isFlat flag:
 * flat properties rent self-contained units, so the UI says "Flat 101"
 * instead of "Room 101 · Bed A" everywhere.
 */

/** "Room 301 · Bed A" — or "Flat 301" for flat properties. */
export function bedLocationLabel(
  roomNumber: string,
  bedLabel: string,
  isFlat: boolean,
): string {
  return isFlat ? `Flat ${roomNumber}` : `Room ${roomNumber} · Bed ${bedLabel}`;
}

/** "301 · A" — compact list form; just the number for flats. */
export function bedLocationShort(
  roomNumber: string,
  bedLabel: string,
  isFlat: boolean,
): string {
  return isFlat ? roomNumber : `${roomNumber} · ${bedLabel}`;
}

/** "Room 301" / "Flat 301". */
export function roomLabel(roomNumber: string, isFlat: boolean): string {
  return `${isFlat ? 'Flat' : 'Room'} ${roomNumber}`;
}
