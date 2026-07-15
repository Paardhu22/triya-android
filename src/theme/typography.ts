/**
 * Triya Manager -- Typography Scale
 *
 * Sora (the web app's brand font) for all text, with the platform monospace
 * for figures that the web renders `font-mono tabular-nums` (stat values,
 * invoice numbers, money columns).
 *
 * Each weight is a separate font family (how expo-google-fonts registers
 * static fonts), so variants set `fontFamily` and never `fontWeight` —
 * mixing the two makes Android synthesize faux weights.
 */

import { Platform, type TextStyle } from 'react-native';

export const fontFamilies = {
  regular: 'Sora_400Regular',
  medium: 'Sora_500Medium',
  semibold: 'Sora_600SemiBold',
  bold: 'Sora_700Bold',
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
} as const;

export const typography = {
  h1: {
    fontSize: 26,
    lineHeight: 34,
    fontFamily: fontFamilies.bold,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 21,
    lineHeight: 28,
    fontFamily: fontFamilies.semibold,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 17,
    lineHeight: 24,
    fontFamily: fontFamilies.semibold,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fontFamilies.regular,
  },
  bodyMedium: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fontFamilies.medium,
  },
  caption: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fontFamilies.regular,
  },
  captionMedium: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fontFamilies.medium,
  },
  small: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: fontFamilies.regular,
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fontFamilies.semibold,
  },
  /** Uppercase section labels — the Swiss-style "OVERVIEW" kickers. */
  overline: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: fontFamilies.semibold,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  /** Monospace figures (web: font-mono tabular-nums). */
  mono: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fontFamilies.mono,
    fontVariant: ['tabular-nums'],
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
