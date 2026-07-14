/**
 * Triya Manager -- Color Tokens
 *
 * Light-mode-only palette designed for a professional B2B property management
 * application. White backgrounds, neutral grays, single blue accent.
 */

export const colors = {
  // Backgrounds
  background: '#FFFFFF',
  surface: '#F8F9FA',
  surfacePressed: '#F1F3F5',

  // Text
  text: '#1A1A2E',
  textSecondary: '#6C757D',
  textTertiary: '#ADB5BD',
  textInverse: '#FFFFFF',

  // Brand
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  primaryDark: '#1D4ED8',

  // Semantic
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',

  // Borders & Dividers
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  divider: '#E5E7EB',
} as const;

export type ColorToken = keyof typeof colors;
