import { useState } from 'react';
import {
  TextInput as RNTextInput,
  View,
  Pressable,
  StyleSheet,
  type TextInputProps as RNTextInputProps,
} from 'react-native';

import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius, typography } from '@/theme';

export interface TextInputProps extends RNTextInputProps {
  /** Label displayed above the input. */
  label?: string;
  /** Error message displayed below the input. Triggers error styling. */
  error?: string;
  /** Hint text displayed below the input when there is no error. */
  hint?: string;
}

/**
 * TextInput component.
 *
 * A styled text input with optional label, error state, and hint text.
 * Supports all standard React Native TextInput props including
 * `secureTextEntry` for password fields.
 *
 * When `secureTextEntry` is true, a show/hide toggle button is
 * automatically rendered on the right side of the input.
 *
 * @example
 * <TextInput label="Email" placeholder="you@example.com" />
 * <TextInput label="Password" secureTextEntry />
 * <TextInput label="Name" error="Name is required" />
 */
export function TextInput({
  label,
  error,
  hint,
  secureTextEntry,
  style,
  ...rest
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPassword = secureTextEntry !== undefined && secureTextEntry;
  const effectiveSecure = isPassword && !isPasswordVisible;

  const inputContainerStyles = [
    styles.inputContainer,
    isFocused && styles.inputFocused,
    error && styles.inputError,
  ];

  return (
    <View style={styles.wrapper}>
      {label && (
        <Typography
          variant="captionMedium"
          color="textSecondary"
          style={styles.label}
        >
          {label}
        </Typography>
      )}

      <View style={inputContainerStyles}>
        <RNTextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={effectiveSecure}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />

        {isPassword && (
          <Pressable
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            style={styles.toggleButton}
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
          >
            <Typography variant="caption" color="primary">
              {isPasswordVisible ? 'Hide' : 'Show'}
            </Typography>
          </Pressable>
        )}
      </View>

      {error && (
        <Typography variant="small" colorValue={colors.error} style={styles.message}>
          {error}
        </Typography>
      )}

      {!error && hint && (
        <Typography variant="small" color="textTertiary" style={styles.message}>
          {hint}
        </Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    height: 48,
    justifyContent: 'center',
  },
  message: {
    marginTop: spacing.xs,
  },
});
