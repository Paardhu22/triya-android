import { Modal, View, StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius } from '@/theme';

export interface SuccessDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  /** Main follow-up action (e.g. "Send Invoice"). */
  primaryAction: { label: string; onPress: () => void };
  /** Optional dismiss-style action (e.g. "Later"). */
  secondaryAction?: { label: string; onPress: () => void };
  /** Back-button / backdrop dismissal target. Defaults to the secondary action. */
  onRequestClose?: () => void;
}

/**
 * SuccessDialog component.
 *
 * Celebratory confirmation with a follow-up decision — mirrors the web's
 * post-payment flow ("Payment recorded. Send the invoice now?").
 *
 * @example
 * <SuccessDialog
 *   visible={recorded}
 *   title="Payment recorded"
 *   message="Would you like to send the invoice now?"
 *   primaryAction={{ label: 'Send Invoice', onPress: openInvoice }}
 *   secondaryAction={{ label: 'Later', onPress: close }}
 * />
 */
export function SuccessDialog({
  visible,
  title,
  message,
  primaryAction,
  secondaryAction,
  onRequestClose,
}: SuccessDialogProps) {
  const close = onRequestClose ?? secondaryAction?.onPress ?? primaryAction.onPress;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Icon name="check-circle" size={34} color={colors.success} />
          </View>
          <Typography variant="h3" style={styles.centered}>
            {title}
          </Typography>
          {message && (
            <Typography variant="caption" color="textSecondary" style={styles.centered}>
              {message}
            </Typography>
          )}
          <View style={styles.actions}>
            {secondaryAction && (
              <Button
                title={secondaryAction.label}
                variant="outline"
                onPress={secondaryAction.onPress}
                style={styles.action}
              />
            )}
            <Button
              title={primaryAction.label}
              onPress={primaryAction.onPress}
              style={styles.action}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  centered: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
  action: {
    flex: 1,
  },
});
