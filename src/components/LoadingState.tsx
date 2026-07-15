import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { Typography } from '@/components/Typography';
import { colors, spacing } from '@/theme';

export interface LoadingStateProps {
  /** Optional label under the spinner. */
  label?: string;
  /** Expands to fill the available space. Defaults to true. */
  fill?: boolean;
}

/**
 * LoadingState component.
 *
 * Centered spinner for whole-screen or whole-section loading. For list
 * placeholders that mimic the final layout, prefer the Skeleton components.
 *
 * @example
 * <LoadingState label="Loading dashboard…" />
 */
export function LoadingState({ label, fill = true }: LoadingStateProps) {
  return (
    <View style={[styles.container, fill && styles.fill]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label && (
        <Typography variant="caption" color="textSecondary">
          {label}
        </Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  fill: {
    flex: 1,
  },
});
