/**
 * Triya Manager -- Typography Scale
 *
 * Inter — the web app's font since its Swiss redesign — for all text. Figures
 * use Inter's tabular numerals (the web's `tabular-nums`), and display sizes
 * are tightened exactly like the web's headings (-0.035em page titles,
 * -0.015em dialog titles). Uppercase section kickers use the web's
 * `text-xs font-semibold tracking-wider uppercase` treatment.
 *
 * Each weight is a separate font family (how expo-google-fonts registers
 * static fonts), so variants set `fontFamily` and never `fontWeight` —
 * mixing the two makes Android synthesize faux weights.
 */

import { Platform, type TextStyle } from 'react-native';

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
} as const;

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

export const typography = {
  /** Page title — the web PageHeader (2.125rem, -0.035em). */
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontFamily: fontFamilies.bold,
    letterSpacing: -1.1,
  },
  h1: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: fontFamilies.bold,
    letterSpacing: -0.7,
  },
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: fontFamilies.bold,
    letterSpacing: -0.35,
  },
  h3: {
    fontSize: 17,
    lineHeight: 23,
    fontFamily: fontFamilies.semibold,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fontFamilies.regular,
    letterSpacing: -0.1,
  },
  bodyMedium: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fontFamilies.medium,
    letterSpacing: -0.15,
  },
  bodySemibold: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fontFamilies.semibold,
    letterSpacing: -0.15,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fontFamilies.regular,
  },
  captionMedium: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fontFamilies.medium,
  },
  small: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontFamilies.regular,
  },
  smallMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontFamilies.medium,
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fontFamilies.semibold,
    letterSpacing: -0.1,
  },
  /** Uppercase section kickers — the web's "CAPACITY OVERVIEW" labels. */
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fontFamilies.semibold,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  /** Big stat figure (web StatCard value, 1.85rem bold tight). */
  figure: {
    fontSize: 26,
    lineHeight: 30,
    fontFamily: fontFamilies.bold,
    letterSpacing: -0.8,
    fontVariant: tabular,
  },
  /** Inline money / counts (web `tabular-nums`). */
  number: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fontFamilies.semibold,
    letterSpacing: -0.2,
    fontVariant: tabular,
  },
  numberSmall: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fontFamilies.medium,
    fontVariant: tabular,
  },
  /** Monospace identifiers (invoice numbers). */
  mono: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontFamilies.medium,
    letterSpacing: 0.2,
    fontVariant: tabular,
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
