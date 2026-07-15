import { useMemo, useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import {
  BottomSheet,
  Button,
  Card,
  Divider,
  Icon,
  Screen,
  SectionHeader,
  TextInput,
  Typography,
} from '@/components';
import { listLoginUsers, type LoginUser } from '@/mocks';
import { useAuth } from '@/store';
import { colors, spacing, borderRadius } from '@/theme';

/**
 * LoginScreen
 *
 * Mirrors the web login workflow (login-form.tsx): pick a staff account from
 * the user dropdown, enter the password, sign in. Property selection happens
 * after auth — automatically for property-scoped managers, via the picker
 * for admins — exactly as on the web.
 *
 * Auth is mocked against the seeded staff accounts; the submit handler is
 * the only thing that changes when the real credentials endpoint is wired.
 */
export function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const users = useMemo(() => listLoginUsers(), []);
  const [selectedUser, setSelectedUser] = useState<LoginUser | null>(users[0] ?? null);
  const [password, setPassword] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = selectedUser !== null && password.length > 0 && !submitting;

  async function onSubmit() {
    if (!selectedUser) return;
    setSubmitting(true);
    setError(null);
    const result = await signIn(selectedUser.email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace('/');
  }

  return (
    <Screen scrollable>
      <View style={styles.container}>
        {/* Branding */}
        <View style={styles.branding}>
          <Typography variant="h1">Triya Manager</Typography>
          <Typography variant="body" color="textSecondary" style={styles.tagline}>
            Property management, simplified.
          </Typography>
        </View>

        {/* Login Card */}
        <Card>
          <SectionHeader
            title="Sign In"
            subtitle="Select your account and enter your password."
          />

          <Divider verticalSpacing="sm" />

          {/* User selector (as on the web login form) */}
          <View style={styles.fieldGroup}>
            <Typography
              variant="captionMedium"
              color="textSecondary"
              style={styles.fieldLabel}
            >
              User
            </Typography>
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => [styles.selector, pressed && styles.selectorPressed]}
              accessibilityRole="button"
              accessibilityLabel="Select user"
            >
              <Typography
                variant="body"
                color={selectedUser ? 'text' : 'textTertiary'}
                style={styles.selectorText}
                numberOfLines={1}
              >
                {selectedUser?.name ?? 'Select a user'}
              </Typography>
              <Icon name="chevron-down" size={20} color={colors.textTertiary} />
            </Pressable>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <TextInput
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(null);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              error={error ?? undefined}
              onSubmitEditing={() => canSubmit && onSubmit()}
            />
          </View>

          <Button
            title="Sign In"
            variant="primary"
            size="lg"
            icon="login"
            disabled={!canSubmit}
            loading={submitting}
            onPress={onSubmit}
            style={styles.signInButton}
          />
        </Card>

        <Typography variant="small" color="textTertiary" style={styles.footer}>
          Demo build — sign in with a seeded account{'\n'}e.g. Triya Admin / Admin@12345
        </Typography>
      </View>

      {/* User picker */}
      <BottomSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select user"
      >
        <View style={styles.options}>
          {users.map((user) => {
            const isSelected = selectedUser?.email === user.email;
            return (
              <Pressable
                key={user.email}
                onPress={() => {
                  setSelectedUser(user);
                  setPickerOpen(false);
                }}
                style={({ pressed }) => [
                  styles.optionRow,
                  isSelected && styles.optionSelected,
                  pressed && !isSelected && styles.optionPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.optionText}>
                  <Typography variant="bodyMedium">{user.name}</Typography>
                  <Typography variant="small" color="textSecondary">
                    {user.email} · {user.role.toLowerCase()}
                  </Typography>
                </View>
                {isSelected && <Icon name="check-circle" size={20} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  branding: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  tagline: {
    marginTop: spacing.xs,
  },
  fieldGroup: {
    marginTop: spacing.md,
  },
  fieldLabel: {
    marginBottom: spacing.xs,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  selectorPressed: {
    borderColor: colors.primary,
  },
  selectorText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  signInButton: {
    marginTop: spacing.lg,
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  options: {
    gap: spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionPressed: {
    backgroundColor: colors.surfacePressed,
  },
  optionText: {
    flex: 1,
    gap: 1,
  },
});
