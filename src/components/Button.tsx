import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
} from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';
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
}

const HEIGHT: Record<ButtonSize, number> = {
  sm: 36,
  md: 48,
  lg: 56,
};

/**
 * Button component.
 *
 * Three variants:
 * - **primary** -- solid blue background, white text. Use for the main action.
 * - **secondary** -- light gray background, dark text. Use for secondary actions.
 * - **outline** -- transparent with border. Use for tertiary/cancel actions.
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
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const textColor =
    variant === 'primary' ? colors.textInverse : colors.text;

  const spinnerColor =
    variant === 'primary' ? colors.textInverse : colors.primary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        { height: HEIGHT[size] },
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style as import('react-native').ViewStyle,
      ]}
      disabled={isDisabled}
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
    </Pressable>
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
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
});
