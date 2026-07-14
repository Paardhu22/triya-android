/**
 * Triya Manager -- Spacing & Border Radius
 *
 * Based on an 8px grid system. Provides consistent, predictable
 * padding and margin values across the application.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;
