import { View, StyleSheet, type ViewProps } from 'react-native';

import { colors, spacing, borderRadius } from '@/theme';

export interface CardProps extends ViewProps {
  /** Removes the soft shadow. Defaults to false. */
  flat?: boolean;
  /** Removes internal padding. Defaults to false. */
  noPadding?: boolean;
}

/**
 * Card component.
 *
 * A container with a white background, rounded corners, and an
 * optional soft shadow. Used to visually group related content.
 *
 * Use `flat` for cards that sit on a white background (border only).
 * Use the default (with shadow) for cards that sit on a gray surface.
 *
 * @example
 * <Card>
 *   <Typography variant="h3">Property Details</Typography>
 * </Card>
 *
 * <Card flat noPadding>
 *   <FlatList ... />
 * </Card>
 */
export function Card({
  flat = false,
  noPadding = false,
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        !flat && styles.shadow,
        flat && styles.flat,
        !noPadding && styles.padded,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

// Both variants now share the Surface look (white, hairline, soft radius) so
// legacy call sites match the grouped-surface design; `flat` is kept for API
// compatibility and drops the barely-visible lift.
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.md,
  },
  shadow: {},
  flat: {},
});
