/**
 * Triya Manager -- Color Tokens
 *
 * Light-mode-only palette ported from the web app (globals.css). Warm,
 * strict, neutral "Swiss / International Typographic" scheme: white
 * surfaces, ink foreground, warm tan borders, restrained status tones.
 */

export const colors = {
  // Backgrounds
  background: '#FFFFFF',
  surface: '#F5F5F3', // web --muted / --main-surface
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
  sand: '#D8CEBF', // web --secondary-surface, the editorial sand panels

  // Semantic (web --available / --partial / --occupied + soft tints)
  success: '#4D8A4C',
  successLight: '#E6EFE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#C84B4B',
  errorLight: '#F6E4E1',
  neutral: '#94A3B8',
  neutralLight: '#F1F5F9',

  // Borders & Dividers (web --border / --ring)
  border: '#E5DED4',
  borderLight: '#F0EBE2',
  divider: '#E5DED4',
  ring: '#D8CEBF',

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
  overlay: 'rgba(44, 48, 64, 0.5)',
} as const;

export type ColorToken = keyof typeof colors;
