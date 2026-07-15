import { StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius } from '@/theme';

export interface FABProps {
  /** Icon glyph. Defaults to 'plus'. */
  icon?: IconName;
  /** Extended variant with a text label. */
  label?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

/**
 * FAB (Floating Action Button) component.
 *
 * The screen's single primary creation action (e.g. new complaint, new
 * expense). Render as a sibling of the scrolling content, never inside it.
 *
 * @example
 * <FAB label="Add expense" onPress={openForm} />
 * <FAB icon="plus" onPress={openForm} accessibilityLabel="New complaint" />
 */
export function FAB({ icon = 'plus', label, onPress, accessibilityLabel }: FABProps) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      style={[styles.fab, label ? styles.extended : styles.round]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Icon name={icon} size={24} color={colors.textInverse} />
      {label && (
        <Typography variant="captionMedium" colorValue={colors.textInverse}>
          {label}
        </Typography>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  round: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
  },
  extended: {
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
  },
});
