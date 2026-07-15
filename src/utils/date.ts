/**
 * Small date helpers (no external dependency). Dates travel through the app
 * as ISO-8601 strings; parse once at the display boundary with these helpers.
 */

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function startOfDay(value: string | Date): Date {
  const d = toDate(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfMonth(value: string | Date): Date {
  const d = toDate(value);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(value: string | Date): Date {
  const d = toDate(value);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function addDays(value: string | Date, days: number): Date {
  const d = toDate(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, d.getHours(), d.getMinutes());
}

export function addMonths(value: string | Date, months: number): Date {
  const d = toDate(value);
  return new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
}

/** Set the day-of-month, clamped to the length of that month. */
export function setDayOfMonth(value: string | Date, day: number): Date {
  const d = toDate(value);
  const lastDay = endOfMonth(d).getDate();
  return new Date(d.getFullYear(), d.getMonth(), Math.min(day, lastDay));
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function differenceInCalendarDays(to: string | Date, from: string | Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

export function isSameMonth(a: string | Date, b: string | Date): boolean {
  const da = toDate(a);
  const db = toDate(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth();
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** "12 Mar 2026" */
export function formatFullDate(value: string | Date): string {
  const d = toDate(value);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "12 Mar" */
export function formatDayMonth(value: string | Date): string {
  const d = toDate(value);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "Mar 2026" */
export function formatShortMonthYear(value: string | Date): string {
  const d = toDate(value);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "March 2026" */
export function formatMonthYear(value: string | Date): string {
  const d = toDate(value);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** "12.03.2026" — dense numeric form used in activity feeds. */
export function formatDotted(value: string | Date): string {
  const d = toDate(value);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** "5th", "21st", "2nd" ... */
export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/** Relative label for feeds: "Just now", "5m ago", "3h ago", "2d ago", else "12 Mar". */
export function formatRelative(value: string | Date, now: Date = new Date()): string {
  const d = toDate(value);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDayMonth(d);
}

/** Date-only ISO string ("YYYY-MM-DD") for form defaults. */
export function toISODateOnly(value: string | Date = new Date()): string {
  const d = toDate(value);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
