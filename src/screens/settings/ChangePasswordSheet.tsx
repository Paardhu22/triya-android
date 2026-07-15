import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { BottomSheet, Button, TextInput, Typography } from '@/components';
import { useAction } from '@/hooks';
import { changePassword } from '@/mocks';
import { useAuth } from '@/store';
import { colors, spacing } from '@/theme';

export interface ChangePasswordSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * ChangePasswordSheet
 *
 * The web Settings "Security" card as a sheet: current password, new
 * password (min 8 chars — the backend rule), and a confirmation field.
 */
export function ChangePasswordSheet({ visible, onClose }: ChangePasswordSheetProps) {
  const { user } = useAuth();
  const { busy, run } = useAction();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setError(null);
      setDone(false);
    }
  }, [visible]);

  async function onSubmit() {
    if (!user) return;
    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    setError(null);
    const result = await run(() => changePassword(user.email, current, next));
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Change password">
      {done ? (
        <View style={styles.doneBox}>
          <Typography variant="h3">Password updated</Typography>
          <Typography variant="caption" color="textSecondary" style={styles.doneText}>
            Use the new password the next time you sign in.
          </Typography>
          <Button title="Done" onPress={onClose} style={styles.doneButton} />
        </View>
      ) : (
        <View style={styles.form}>
          <TextInput
            label="Current password"
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            value={current}
            onChangeText={setCurrent}
          />
          <TextInput
            label="New password"
            placeholder="At least 8 characters"
            secureTextEntry
            autoCapitalize="none"
            value={next}
            onChangeText={setNext}
          />
          <TextInput
            label="Confirm new password"
            placeholder="Repeat the new password"
            secureTextEntry
            autoCapitalize="none"
            value={confirm}
            onChangeText={setConfirm}
          />
          {error && (
            <Typography variant="caption" colorValue={colors.error}>
              {error}
            </Typography>
          )}
          <Button
            title="Update password"
            icon="lock-outline"
            loading={busy}
            disabled={!current || next.length < 8 || !confirm}
            onPress={onSubmit}
          />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  doneBox: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  doneText: {
    textAlign: 'center',
  },
  doneButton: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
});
