import type { ReactNode } from 'react';
import { Pressable, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { colors, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';

export interface ListRowProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  /** Leading element (Avatar, icon tile). */
  leading?: ReactNode;
  /** Leading glyph rendered in a soft tile. */
  icon?: IconName;
  iconColor?: string;
  /** Right-side content; a chevron is shown by default when pressable. */
  trailing?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Draws the hairline above this row (all but the first row in a group). */
  divider?: boolean;
  /** Indent the divider past the leading element (iOS/Material inset list). */
  insetDivider?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  /** Hide the default chevron on a pressable row. */
  hideChevron?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * ListRow component.
 *
 * One row inside a Surface: leading visual, title/subtitle, trailing value.
 * Rows separate with inset hairlines and highlight on press — the grouped-list
 * pattern that replaces stacks of individually bordered cards.
 */
export function ListRow({
  title,
  subtitle,
  leading,
  icon,
  iconColor,
  trailing,
  onPress,
  onLongPress,
  divider = false,
  insetDivider = true,
  destructive = false,
  disabled = false,
  hideChevron = false,
  style,
}: ListRowProps) {
  const hasLeading = Boolean(leading || icon);
  const tint = destructive ? colors.error : iconColor ?? colors.text;

  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              haptics.tap();
              onPress();
            }
          : undefined
      }
      onLongPress={onLongPress}
      disabled={disabled || (!onPress && !onLongPress)}
      android_ripple={onPress ? { color: colors.surfacePressed } : undefined}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {divider && (
        <View style={[styles.divider, hasLeading && insetDivider && styles.dividerInset]} />
      )}
      {leading}
      {!leading && icon && (
        <View style={[styles.iconTile, destructive && styles.iconTileDestructive]}>
          <Icon name={icon} size={19} color={tint} />
        </View>
      )}
      <View style={styles.text}>
        {typeof title === 'string' ? (
          <Typography
            variant="bodyMedium"
            colorValue={destructive ? colors.error : colors.text}
            numberOfLines={1}
          >
            {title}
          </Typography>
        ) : (
          title
        )}
        {typeof subtitle === 'string' ? (
          <Typography variant="small" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Typography>
        ) : (
          subtitle
        )}
      </View>
      {trailing}
      {onPress && !hideChevron && trailing === undefined && (
        <Icon name="chevron-right" size={20} color={colors.textTertiary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    minHeight: 56,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  pressed: {
    backgroundColor: colors.canvas,
  },
  disabled: {
    opacity: 0.45,
  },
  divider: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  dividerInset: {
    left: spacing.md + 36 + spacing.sm + 4,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  iconTileDestructive: {
    backgroundColor: colors.errorLight,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
