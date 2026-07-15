import { View, StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius } from '@/theme';

export interface EmptyStateProps {
  /** Icon shown above the title. Defaults to 'inbox-outline'. */
  icon?: IconName;
  title: string;
  message?: string;
  /** Optional call to action below the message. */
  action?: { label: string; onPress: () => void };
}

/**
 * EmptyState component.
 *
 * Dashed-border placeholder for lists with no content. Distinguish "no data
 * at all" from "filters matched nothing" with different titles, as the web
 * app does.
 *
 * @example
 * <EmptyState title="No active tenants found for this property." />
 * <EmptyState
 *   icon="filter-variant"
 *   title="No complaints match your filters."
 *   action={{ label: 'Clear filters', onPress: reset }}
 * />
 */
export function EmptyState({
  icon = 'inbox-outline',
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={32} color={colors.textTertiary} />
      <Typography variant="bodyMedium" color="textSecondary" style={styles.centered}>
        {title}
      </Typography>
      {message && (
        <Typography variant="caption" color="textTertiary" style={styles.centered}>
          {message}
        </Typography>
      )}
      {action && (
        <Button
          title={action.label}
          variant="outline"
          size="sm"
          onPress={action.onPress}
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
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  centered: {
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.sm,
  },
});
