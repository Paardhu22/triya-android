import { View, StyleSheet, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { borderRadius, colors } from '@/theme';

export interface SurfaceProps extends ViewProps {
  /** Inner padding. Defaults to none — rows and grids bring their own. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Surface component.
 *
 * The one container shape of the app: a white grouped surface on the warm
 * canvas with a hairline edge and soft radius. Content inside separates with
 * hairlines (rows, stat grids), never with nested boxes — the web's
 * `border bg-card divide-y` sections, adapted for a phone.
 */
export function Surface({ padded = false, style, children, ...rest }: SurfaceProps) {
  return (
    <View style={[styles.surface, padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  padded: {
    padding: 16,
  },
});
