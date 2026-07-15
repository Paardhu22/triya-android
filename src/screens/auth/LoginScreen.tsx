import { useMemo, useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import {
  BottomSheet,
  Button,
  Icon,
  Screen,
  TextInput,
  Typography,
  enterHeader,
  enterUp,
} from '@/components';
import { listLoginUsers, type LoginUser } from '@/mocks';
import { useAuth } from '@/store';
import { colors, fontFamilies, spacing, borderRadius } from '@/theme';

/**
 * LoginScreen
 *
 * The mobile take on the web login page: the ink backdrop and editorial
 * hero (overline, headline, ghost "PG" glyph) above the white sign-in
 * card. Same workflow as login-form.tsx — pick a staff account, enter the
 * password, sign in. Property selection happens after auth, exactly as on
 * the web.
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
    <Screen scrollable background={colors.primary}>
      <View style={styles.container}>
        {/* Editorial hero — the web's sand-panel composition on ink */}
        <Animated.View entering={enterHeader()} style={styles.hero}>
          <Typography
            aria-hidden
            variant="h1"
            colorValue="rgba(255, 255, 255, 0.05)"
            style={styles.ghost}
          >
            PG
          </Typography>
          <Typography variant="overline" colorValue={colors.sand}>
            Property Manager
          </Typography>
          <Typography variant="h1" colorValue={colors.textInverse} style={styles.headline}>
            Triya{'\n'}Manager
          </Typography>
          <Typography
            variant="caption"
            colorValue="rgba(255, 255, 255, 0.7)"
            style={styles.tagline}
          >
            Rooms, beds, tenants and payments — organized on one precise grid.
          </Typography>
        </Animated.View>

        {/* Sign-in card */}
        <Animated.View entering={enterUp(80)} style={styles.card}>
          <Typography variant="h2">Sign in</Typography>
          <Typography variant="caption" color="textSecondary" style={styles.cardSubtitle}>
            Welcome back. Enter your credentials to continue.
          </Typography>

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
            title="Sign in"
            variant="primary"
            size="lg"
            icon="login"
            disabled={!canSubmit}
            loading={submitting}
            onPress={onSubmit}
            style={styles.signInButton}
          />

          <Typography variant="small" color="textTertiary" style={styles.cardFooter}>
            Select your account, then enter its password to continue.
          </Typography>
        </Animated.View>
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
    paddingVertical: spacing.xl,
  },
  hero: {
    marginBottom: spacing.xl,
    paddingTop: spacing.xl,
  },
  ghost: {
    position: 'absolute',
    right: -spacing.sm,
    bottom: -spacing.xl,
    fontSize: 148,
    lineHeight: 148,
    fontFamily: fontFamilies.bold,
    letterSpacing: -6,
    includeFontPadding: false,
  },
  headline: {
    fontSize: 36,
    lineHeight: 38,
    marginTop: spacing.md,
  },
  tagline: {
    marginTop: spacing.md,
    maxWidth: 260,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  cardSubtitle: {
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
    borderColor: colors.ring,
  },
  selectorText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  signInButton: {
    marginTop: spacing.lg,
  },
  cardFooter: {
    marginTop: spacing.md,
    textAlign: 'center',
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
