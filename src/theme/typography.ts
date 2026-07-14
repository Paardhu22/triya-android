/**
 * Triya Manager -- Typography Scale
 *
 * Uses system fonts (Roboto on Android). Each entry is a complete
 * fontSize + lineHeight + fontWeight combination that can be spread
 * directly into a StyleSheet definition.
 */

import { TextStyle } from 'react-native';

export const typography = {
  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  captionMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  small: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
