import type { ReactNode } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius } from '@/theme';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Leading icon rendered in a soft square. */
  icon?: IconName;
  /** Accent for the leading icon. Defaults to the primary color. */
  iconColor?: string;
  /** Right-side element; defaults to a chevron when onPress is set. */
  right?: ReactNode;
  onPress?: () => void;
  /** Renders title (and icon tint) in the error color, e.g. "Sign out". */
  destructive?: boolean;
  disabled?: boolean;
}

/**
 * ListItem component.
 *
 * A tappable settings/menu row: leading icon in a tinted square, title with
 * optional subtitle, trailing element or chevron. 56px minimum touch target.
 *
 * @example
 * <ListItem icon="bell-outline" title="Notifications" subtitle="3 unread" onPress={open} />
 * <ListItem icon="logout" title="Sign out" destructive onPress={signOut} />
 */
export function ListItem({
  title,
  subtitle,
  icon,
  iconColor,
  right,
  onPress,
  destructive = false,
  disabled = false,
}: ListItemProps) {
  const tint = destructive ? colors.error : iconColor ?? colors.primary;
  const showChevron = right === undefined && onPress !== undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {icon && (
        <View
          style={[
            styles.iconBox,
            { backgroundColor: destructive ? colors.errorLight : colors.primaryLight },
          ]}
        >
          <Icon name={icon} size={20} color={tint} />
        </View>
      )}
      <View style={styles.textArea}>
        <Typography
          variant="bodyMedium"
          colorValue={destructive ? colors.error : colors.text}
          numberOfLines={1}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Typography>
        )}
      </View>
      {showChevron ? (
        <Icon name="chevron-right" size={22} color={colors.textTertiary} />
      ) : (
        right
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    flex: 1,
    gap: 1,
  },
});
