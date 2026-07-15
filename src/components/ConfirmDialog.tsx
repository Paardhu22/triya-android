import type { ReactNode } from 'react';
import { Modal, View, StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius } from '@/theme';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  /** Plain string or rich content (e.g. amounts in bold). */
  message?: string | ReactNode;
  /** Defaults to 'Confirm'. */
  confirmLabel?: string;
  /** Defaults to 'Cancel'. */
  cancelLabel?: string;
  /** Styles the confirm action as destructive (red). */
  destructive?: boolean;
  /** Disables both actions and shows a spinner on confirm. */
  loading?: boolean;
  /** Extra content between message and actions (e.g. a method picker). */
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * ConfirmDialog component.
 *
 * Centered two-action dialog for confirmations that must interrupt
 * (payments, deletions, vacating a bed). For pickers and forms use
 * BottomSheet instead.
 *
 * @example
 * <ConfirmDialog
 *   visible={open}
 *   title="Confirm Payment"
 *   message={`Has ₹8,500 been received from ${name}?`}
 *   confirmLabel="Confirm Payment"
 *   loading={saving}
 *   onConfirm={submit}
 *   onCancel={() => setOpen(false)}
 * />
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={() => !loading && onCancel()}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Typography variant="h3">{title}</Typography>
          {typeof message === 'string' ? (
            <Typography variant="caption" color="textSecondary" style={styles.message}>
              {message}
            </Typography>
          ) : message ? (
            <View style={styles.message}>{message}</View>
          ) : null}
          {children}
          <View style={styles.actions}>
            <Button
              title={cancelLabel}
              variant="outline"
              disabled={loading}
              onPress={onCancel}
              style={styles.action}
            />
            <Button
              title={confirmLabel}
              loading={loading}
              onPress={onConfirm}
              style={[styles.action, destructive && styles.destructive]}
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
  },
  message: {
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
    marginTop: spacing.lg,
  },
  action: {
    flex: 1,
  },
  destructive: {
    backgroundColor: colors.error,
  },
});
