import { View, StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius } from '@/theme';

export interface ErrorStateProps {
  /** Headline. Defaults to a generic message. */
  title?: string;
  /** Supporting detail, e.g. the error description. */
  message?: string;
  /** Shows a Retry button when provided. */
  onRetry?: () => void;
}

/**
 * ErrorState component.
 *
 * Inline failure placeholder with an optional retry action. Used wherever a
 * data fetch can fail once the app talks to the real backend.
 *
 * @example
 * <ErrorState message="Could not load tenants." onRetry={refetch} />
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Icon name="alert-circle-outline" size={26} color={colors.error} />
      </View>
      <Typography variant="bodyMedium" style={styles.centered}>
        {title}
      </Typography>
      {message && (
        <Typography variant="caption" color="textSecondary" style={styles.centered}>
          {message}
        </Typography>
      )}
      {onRetry && (
        <Button
          title="Try again"
          variant="outline"
          size="sm"
          icon="refresh"
          onPress={onRetry}
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  centered: {
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.sm,
  },
});
