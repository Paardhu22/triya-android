import { View, StyleSheet, type ViewProps } from 'react-native';

import { Typography } from '@/components/Typography';
import { spacing } from '@/theme';

export interface SectionHeaderProps extends ViewProps {
  /** Section title text. */
  title: string;
  /** Optional subtitle displayed below the title. */
  subtitle?: string;
}

/**
 * SectionHeader component.
 *
 * A title and optional subtitle used to introduce a content section.
 * Provides consistent vertical spacing below the header.
 *
 * @example
 * <SectionHeader title="Properties" subtitle="Select your property" />
 * <SectionHeader title="Account Settings" />
 */
export function SectionHeader({
  title,
  subtitle,
  style,
  ...rest
}: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]} {...rest}>
      <Typography variant="h3">{title}</Typography>
      {subtitle && (
        <Typography
          variant="caption"
          color="textSecondary"
          style={styles.subtitle}
        >
          {subtitle}
        </Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
});
