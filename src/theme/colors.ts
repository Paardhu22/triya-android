/**
 * Triya Manager -- Color Tokens
 *
 * Light-mode-only palette ported from the web app (globals.css). Warm,
 * strict, neutral "Swiss / International Typographic" scheme: white
 * surfaces, ink foreground, warm tan hairlines, restrained status tones.
 *
 * Mobile adaptation: screens sit on the web's `--main-surface` canvas and
 * group content on white surfaces, so sections separate by tone and hairline
 * instead of stacks of bordered boxes.
 */

export const colors = {
  // Backgrounds
  background: '#FFFFFF',
  /** Screen canvas behind grouped surfaces (web --main-surface). */
  canvas: '#F5F5F3',
  surface: '#F5F5F3', // web --muted
  surfacePressed: '#EFEAE2', // web --hover / --accent

  // Text
  text: '#2C3040', // web --foreground
  textSecondary: '#6B7280', // web --muted-foreground
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Brand — the ink itself is the primary, exactly like the web app.
  primary: '#2C3040',
  primaryLight: '#EFEAE2', // web --accent, behind selected/active elements
  primaryDark: '#20242F', // pressed state of primary surfaces
  sand: '#D8CEBF', // web --secondary-surface

  // Semantic (web --available / --partial / --occupied + soft tints)
  success: '#4D8A4C',
  successLight: '#E6EFE5',
  warning: '#C79A3E', // web status amber (status.ts TONE.amber)
  warningLight: '#FBF3E2',
  error: '#C84B4B',
  errorLight: '#F6E4E1',
  neutral: '#9CA3AF', // web status neutral
  neutralLight: '#F1F2F4',

  // Borders & Dividers (web --border / --ring)
  border: '#E5DED4',
  borderLight: '#EEE9E1',
  divider: '#EAE4DA',
  ring: '#D8CEBF',

  // Muted, on-brand data colours (web --chart-1..5)
  chart1: '#2C3040',
  chart2: '#6B7280',
  chart3: '#8A8F9C',
  chart4: '#D8CEBF',
  chart5: '#C84B4B',

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
  overlay: 'rgba(28, 31, 42, 0.42)',
  shadow: '#2C3040',
} as const;

export type ColorToken = keyof typeof colors;
