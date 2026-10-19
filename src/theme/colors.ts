/**
 * Triya Manager -- Color Tokens
 *
 * Light-mode-only palette ported from the web app (globals.css). The
 * Portfolio2-inspired scheme: near-white canvas, cool grey panels, a
 * restrained blue accent and quiet status tones.
 *
 * Mobile adaptation: screens sit on the web's `--main-surface` canvas and
 * group content on white surfaces, so sections separate by tone and hairline
 * instead of stacks of bordered boxes.
 */

export const colors = {
  // Backgrounds
  background: '#FFFFFF', // web --card
  /** Screen canvas behind grouped surfaces (web --main-surface). */
  canvas: '#FCFCFD',
  surface: '#F3F4F6', // web --muted
  navigation: '#F7F7F9', // web --sidebar
  surfacePressed: '#ECEEF4', // web --hover / --accent

  // Text
  text: '#282B30', // web --foreground
  textSecondary: '#666B75', // web --muted-foreground
  textTertiary: '#9A9FA9',
  textInverse: '#FFFFFF',

  // Brand — the web's restrained blue accent.
  primary: '#3F5DC6',
  primaryLight: '#DFE6FF', // web --grid-accent / ::selection, behind selected elements
  primaryDark: '#2A439C', // web --primary-hover, pressed state of primary surfaces

  // Semantic (web --available / --partial / --occupied + soft tints)
  success: '#4D8A4C',
  successLight: '#E6EFE5',
  warning: '#C79A3E', // web status amber (status.ts TONE.amber)
  warningLight: '#FBF3E2',
  error: '#C84B4B',
  errorLight: '#F6E4E1',
  neutral: '#9CA3AF', // web status neutral
  neutralLight: '#F1F2F4',

  // Borders & Dividers (web --border / --input / --ring)
  border: '#E7E8EC',
  borderLight: '#EEEFF2',
  divider: '#E7E8EC',
  ring: '#D4D6DD', // web --input; focus uses primary like the web --ring

  // Blue carries the main series; secondary data stays quiet (web --chart-1..5)
  chart1: '#3F5DC6',
  chart2: '#858B97',
  chart3: '#B4BAC8',
  chart4: '#DFE6FF',
  chart5: '#C4777D',

  // Floor Manager bed-status accents. Kept distinct from the semantic tones
  // above (used app-wide) — these are the exact web --bed-* tones, scoped to
  // the Floor Manager; soft variants mirror the web's 10% alpha fills.
  bedPaid: '#22C55E',
  bedPaidSoft: 'rgba(34, 197, 94, 0.10)',
  bedPending: '#F59E0B',
  bedPendingSoft: 'rgba(245, 158, 11, 0.10)',
  bedVacant: '#94A3B8',
  bedVacantSoft: 'rgba(148, 163, 184, 0.10)',
  bedOverdue: '#EF4444',
  bedOverdueSoft: 'rgba(239, 68, 68, 0.10)',

  // Overlays
  overlay: 'rgba(28, 30, 34, 0.42)',
  shadow: '#282B30',
} as const;

export type ColorToken = keyof typeof colors;
