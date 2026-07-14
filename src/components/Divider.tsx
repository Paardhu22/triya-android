import { View, StyleSheet, type ViewProps } from 'react-native';

import { colors, spacing } from '@/theme';

export interface DividerProps extends ViewProps {
  /** Vertical spacing above and below the line. Defaults to 'md' (16). */
  verticalSpacing?: keyof typeof spacing;
}

/**
 * Divider component.
 *
 * A thin horizontal line used to separate content sections.
 * Uses the theme's border color for consistency.
 *
 * @example
 * <Divider />
 * <Divider verticalSpacing="lg" />
 */
export function Divider({
  verticalSpacing = 'md',
  style,
  ...rest
}: DividerProps) {
  return (
    <View
      style={[
        styles.line,
        { marginVertical: spacing[verticalSpacing] },
        style,
      ]}
      accessibilityRole="none"
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    width: '100%',
  },
});
