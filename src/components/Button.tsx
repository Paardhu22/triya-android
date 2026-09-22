import { ActivityIndicator, StyleSheet, type PressableProps } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius } from '@/theme';
import { haptics } from '@/utils/haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  /** Button label text. */
  title: string;
  /** Visual variant. Defaults to 'primary'. */
  variant?: ButtonVariant;
  /** Size preset. Defaults to 'md'. */
  size?: ButtonSize;
  /** Optional leading icon. */
  icon?: IconName;
  /** Shows a spinner and disables interaction. */
  loading?: boolean;
  /** Fully disables the button. */
  disabled?: boolean;
  /**
   * Overrides the label/icon color — for buttons on non-standard surfaces
   * (e.g. an outline button on the ink backdrop).
   */
  textColor?: string;
}

const HEIGHT: Record<ButtonSize, number> = {
  sm: 36,
  md: 48,
  lg: 52,
};

/**
 * Button component.
 *
 * Variants (the web's shadcn button set):
 * - **primary** -- solid ink, white text. The main action.
 * - **secondary** -- warm muted fill. Secondary actions.
 * - **outline** -- white with a hairline border. Tertiary / cancel.
 * - **ghost** -- no chrome. Inline actions.
 * - **destructive** -- solid error red. Deletes and vacates.
 *
 * @example
 * <Button title="Sign In" onPress={handleSignIn} />
 * <Button title="Cancel" variant="outline" onPress={handleCancel} />
 * <Button title="Saving..." variant="primary" loading />
 */
export function Button({
  title,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  textColor: textColorOverride,
  style,
  onPressIn,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const solid = variant === 'primary' || variant === 'destructive';
  const textColor = textColorOverride ?? (solid ? colors.textInverse : colors.text);

  const spinnerColor = solid ? colors.textInverse : (textColorOverride ?? colors.primary);

  return (
    <PressableScale
      style={[
        styles.base,
        { height: HEIGHT[size] },
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        // An outline button on a non-standard surface (e.g. the ink backdrop)
        // stays see-through so its override colour reads.
        variant === 'outline' && textColorOverride !== undefined && styles.outlineClear,
        variant === 'ghost' && styles.ghost,
        variant === 'destructive' && styles.destructive,
        size === 'sm' && styles.small,
        isDisabled && styles.disabled,
        style as import('react-native').ViewStyle,
      ]}
      disabled={isDisabled}
      onPressIn={(e) => {
        haptics.tap();
        onPressIn?.(e);
      }}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <>
          {icon && (
            <Icon
              name={icon}
              size={size === 'sm' ? 16 : 18}
              color={textColor}
              style={styles.icon}
            />
          )}
          <Typography
            variant={size === 'sm' ? 'captionMedium' : 'button'}
            colorValue={textColor}
          >
            {title}
          </Typography>
        </>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
  },
  icon: {
    marginRight: spacing.sm,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
  },
  outline: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlineClear: {
    backgroundColor: 'transparent',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  destructive: {
    backgroundColor: colors.error,
  },
  small: {
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md - 1,
  },
  disabled: {
    opacity: 0.45,
  },
});
