import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { colors } from '@/theme';

/** Every valid MaterialCommunityIcons glyph name (fully typed). */
export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface IconProps {
  name: IconName;
  /** Icon size in px. Defaults to 20. */
  size?: number;
  /** Color value. Defaults to the primary text color. */
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Icon component.
 *
 * Single icon family for the whole app (Material Community Icons) so
 * iconography stays consistent. Always use this wrapper instead of
 * importing @expo/vector-icons directly.
 *
 * @example
 * <Icon name="bed-outline" />
 * <Icon name="check-circle" color={colors.success} size={24} />
 */
export function Icon({ name, size = 20, color = colors.text, style }: IconProps) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
}
