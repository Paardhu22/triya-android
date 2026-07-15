import { Image } from 'expo-image';
import { View, StyleSheet } from 'react-native';

import { Typography } from '@/components/Typography';
import { borderRadius, colors, fontFamilies } from '@/theme';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  /** Full name used to derive the initials. */
  name: string;
  /** Optional remote image URI. Falls back to initials when absent. */
  uri?: string | null;
  /** Size preset. Defaults to 'md'. */
  size?: AvatarSize;
}

const DIMENSION: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
};

const FONT_SIZE: Record<AvatarSize, number> = {
  sm: 12,
  md: 14,
  lg: 20,
  xl: 26,
};

/**
 * Soft, readable tints cycled deterministically per name — restricted to the
 * app's warm palette family so avatars never introduce off-brand hues.
 */
const TINTS = [
  { background: '#EFEAE2', text: '#7A5C3E' }, // warm tan
  { background: '#E6EFE5', text: '#4D8A4C' }, // sage
  { background: '#FEF3C7', text: '#B45309' }, // amber
  { background: '#F6E4E1', text: '#A84343' }, // clay
  { background: '#E8E9EF', text: '#2C3040' }, // ink
  { background: '#F5F5F3', text: '#6B7280' }, // stone
] as const;

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? '?';
  const second = words.length > 1 ? words[words.length - 1][0] : '';
  return `${first}${second}`.toUpperCase();
}

function tintOf(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length];
}

/**
 * Avatar component.
 *
 * Shows the person's photo when a URI is available, otherwise deterministic
 * initials on a soft tinted background (same name -> same tint everywhere).
 *
 * @example
 * <Avatar name="Ananya Reddy" />
 * <Avatar name={tenant.fullName} uri={tenant.photoUri} size="lg" />
 */
export function Avatar({ name, uri, size = 'md' }: AvatarProps) {
  const dimension = DIMENSION[size];
  const tint = tintOf(name);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: dimension, height: dimension }]}
        accessibilityLabel={name}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: dimension,
          height: dimension,
          backgroundColor: tint.background,
        },
      ]}
      accessibilityLabel={name}
    >
      <Typography
        colorValue={tint.text}
        style={{ fontSize: FONT_SIZE[size], fontFamily: fontFamilies.semibold }}
      >
        {initialsOf(name)}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  fallback: {
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
