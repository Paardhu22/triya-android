/**
 * Triya Manager -- Typography Scale
 *
 * Manrope — the web app's font since its Portfolio2 refresh — for all text.
 * Figures use tabular numerals (the web's `tabular-nums`). Headings are
 * semibold and tightened like the web (-0.045em page titles, -0.04em stat
 * figures); labels are sentence case `text-xs font-medium`, no uppercase.
 *
 * Each weight is a separate font family (how expo-google-fonts registers
 * static fonts), so variants set `fontFamily` and never `fontWeight` —
 * mixing the two makes Android synthesize faux weights.
 */

import { Platform, type TextStyle } from 'react-native';

export const fontFamilies = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
} as const;

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

export const typography = {
  /** Page title — the web PageHeader (1.75rem semibold, -0.045em). */
  display: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: fontFamilies.semibold,
    letterSpacing: -1.25,
  },
  h1: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: fontFamilies.semibold,
    letterSpacing: -1,
  },
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: fontFamilies.semibold,
    letterSpacing: -0.5,
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
  /** Small labels — the web's sentence-case `text-xs font-medium` (StatCard label). */
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontFamilies.medium,
  },
  /** Section heading — the web's `text-sm font-semibold tracking-[-0.015em]`. */
  section: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fontFamilies.semibold,
    letterSpacing: -0.2,
  },
  /** Big stat figure (web StatCard value, 2rem semibold, -0.04em). */
  figure: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: fontFamilies.semibold,
    letterSpacing: -1.1,
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
