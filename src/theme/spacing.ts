/**
 * Triya Manager -- Spacing, Radius & Elevation
 *
 * 4/8px grid. Radii follow the web's `--radius: 0.625rem` scale; grouped
 * surfaces use `lg`, sheets `xl`. Elevation is the web's "very soft,
 * barely-visible" warm-slate shadow — never a hard drop shadow.
 */

import { Platform, type ViewStyle } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Horizontal page gutter on phones. */
export const GUTTER = 16;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 22,
  full: 9999,
} as const;

function shadow(y: number, blur: number, opacity: number, elevation: number): ViewStyle {
  return Platform.select<ViewStyle>({
    android: { elevation, shadowColor: '#2C3040' },
    default: {
      shadowColor: '#2C3040',
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur,
    },
  }) as ViewStyle;
}

export const elevation = {
  none: {} as ViewStyle,
  xs: shadow(1, 2, 0.05, 1),
  sm: shadow(2, 6, 0.06, 2),
  md: shadow(6, 16, 0.08, 6),
  lg: shadow(12, 28, 0.12, 12),
} as const;
