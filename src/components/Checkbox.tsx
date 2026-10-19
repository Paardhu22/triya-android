import { Pressable, View, StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { borderRadius, colors, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';

export interface CheckboxRowProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** A full-width tappable checkbox with label and helper text. */
export function CheckboxRow({ checked, onChange, label, description, disabled }: CheckboxRowProps) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onChange(!checked);
      }}
      disabled={disabled}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      aria-checked={checked}
      aria-disabled={disabled}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && (
          <Animated.View entering={ZoomIn.duration(160)}>
            <Icon name="check-bold" size={14} color={colors.textInverse} />
          </Animated.View>
        )}
      </View>
      <View style={styles.text}>
        <Typography variant="captionMedium">{label}</Typography>
        {description ? (
          <Typography variant="small" color="textSecondary">
            {description}
          </Typography>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 4,
    padding: spacing.sm + 4,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pressed: {
    backgroundColor: colors.canvas,
  },
  disabled: {
    opacity: 0.5,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.ring,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
