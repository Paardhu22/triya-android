import { Text, type TextProps } from 'react-native';

import {
  colors,
  typography as typographyTokens,
  type ColorToken,
  type TypographyVariant,
} from '@/theme';

export interface TypographyProps extends TextProps {
  /** Typography variant from the design system scale. */
  variant?: TypographyVariant;
  /** Color token from the design system palette. Defaults to 'text'. */
  color?: ColorToken;
  /** Direct color override. Takes precedence over the color token. */
  colorValue?: string;
}

/**
 * Typography component.
 *
 * Renders a styled `<Text>` using design system tokens.
 * Every piece of visible text in the app should use this component
 * instead of raw `<Text>` to ensure typographic consistency.
 *
 * @example
 * <Typography variant="h1">Dashboard</Typography>
 * <Typography variant="caption" color="textSecondary">Last updated 5m ago</Typography>
 */
export function Typography({
  variant = 'body',
  color = 'text',
  colorValue,
  style,
  ...rest
}: TypographyProps) {
  return (
    <Text
      style={[
        typographyTokens[variant],
        { color: colorValue ?? colors[color] },
        style,
      ]}
      {...rest}
    />
  );
}
