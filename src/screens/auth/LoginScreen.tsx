import { request } from '@/data/client';
import { useEffect, useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import {
  Button,
  BottomSheet,
  Icon,
  Screen,
  TextInput,
  Typography,
  enterHeader,
  enterUp,
} from '@/components';
import { useAuth } from '@/store';
import { colors, fontFamilies, spacing, borderRadius } from '@/theme';

const DEFAULT_LOGIN_USERS = [
  { name: 'Triya Admin', email: 'admin@triya.local', role: 'ADMIN' },
  { name: 'Joystayz', email: 'joystayz@triya.local', role: 'MANAGER' },
  { name: 'Frieden Co-Living', email: 'frieden@triya.local', role: 'MANAGER' },
  { name: 'Cozy Gowlidoddy', email: 'cozy@triya.local', role: 'MANAGER' },
  { name: 'testing', email: 'testing@triya.local', role: 'MANAGER' },
];

/** Sign in to the real Triya Manager account. */
export function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('admin@triya.local');
  const [users, setUsers] = useState<{ name: string; email: string; role: string }[]>(DEFAULT_LOGIN_USERS);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [manualEmail, setManualEmail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void request<{ users: typeof users }>('login')
      .then(result => {
        if (!cancelled && result?.users?.length) {
          setUsers(result.users);
          setEmail(current => current || result.users[0]?.email || 'admin@triya.local');
        }
      })
      .catch(() => {
        // Default users remain available so the account picker always works
      });
    return () => { cancelled = true; };
  }, []);

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUser = users.find(u => u.email === email) ?? users[0];
  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace('/');
  }

  return (
    <Screen scrollable background={colors.canvas}>
      <View style={styles.container}>
        {/* Brand panel — the web's soft muted panel */}
        <Animated.View entering={enterHeader()} style={styles.hero}>
          <Typography
            aria-hidden
            variant="h1"
            colorValue="rgba(63, 93, 198, 0.05)"
            style={styles.ghost}
          >
            PG
          </Typography>
          <Typography variant="overline" color="textSecondary">
            Property Manager
          </Typography>
          <Typography variant="h1" style={styles.headline}>
            Triya{'\n'}Manager
          </Typography>
          <Typography
            variant="caption"
            color="textSecondary"
            style={styles.tagline}
          >
            Rooms, beds, tenants and payments — organized in one place.
          </Typography>
        </Animated.View>

        {/* Sign-in card */}
        <Animated.View entering={enterUp(80)} style={styles.card}>
          <Typography variant="h2">Sign in</Typography>
          <Typography variant="caption" color="textSecondary" style={styles.cardSubtitle}>
            Welcome back. Enter your credentials to continue.
          </Typography>

          <View style={styles.fieldGroup}>
            {!manualEmail ? (
              <>
                <View style={styles.selectorHeader}>
                  <Typography variant="captionMedium" color="textSecondary">
                    Select Account / PG
                  </Typography>
                  <Typography variant="small" color="textTertiary">
                    Tap to switch PG
                  </Typography>
                </View>
                <Pressable
                  style={styles.selector}
                  accessibilityRole="button"
                  accessibilityLabel="Select user"
                  onPress={() => setPickerOpen(true)}
                >
                  <View style={styles.selectorContent}>
                    <View style={[styles.avatarBadge, selectedUser?.role === 'ADMIN' ? styles.adminAvatar : styles.managerAvatar]}>
                      <Typography variant="small" style={{ fontWeight: '700', color: selectedUser?.role === 'ADMIN' ? '#B45309' : colors.textSecondary }}>
                        {selectedUser?.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
                      </Typography>
                    </View>
                    <Typography variant="bodyMedium" style={styles.selectorText}>
                      {selectedUser?.name ?? 'Select an account'}
                    </Typography>
                    <View style={[styles.roleTag, selectedUser?.role === 'ADMIN' ? styles.adminTag : styles.managerTag]}>
                      <Typography variant="overline" style={selectedUser?.role === 'ADMIN' ? styles.adminTagText : styles.managerTagText}>
                        {selectedUser?.role === 'ADMIN' ? 'Admin' : 'PG Manager'}
                      </Typography>
                    </View>
                  </View>
                  <Icon name="chevron-down" size={20} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => setManualEmail(true)}
                  accessibilityRole="button"
                  style={{ paddingTop: 6, alignSelf: 'flex-start' }}
                >
                  <Typography variant="small" color="primary">Use email instead</Typography>
                </Pressable>
              </>
            ) : (
              <>
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@company.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                />
                <Pressable
                  onPress={() => setManualEmail(false)}
                  accessibilityRole="button"
                  style={{ paddingTop: 6, alignSelf: 'flex-start' }}
                >
                  <Typography variant="small" color="primary">Choose from account list</Typography>
                </Pressable>
              </>
            )}
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
            Use the same account as Triya Manager on the web.
          </Typography>
        </Animated.View>
      </View>

      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Select Account / PG">
        <View style={styles.options}>
          {users.map((user) => {
            const isSelected = email === user.email;
            const isAdmin = user.role === 'ADMIN';
            return (
              <Pressable
                key={user.email}
                style={[styles.optionRow, isSelected && styles.optionSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  setEmail(user.email);
                  setPickerOpen(false);
                }}
              >
                <View style={[styles.avatarBadge, isAdmin ? styles.adminAvatar : styles.managerAvatar]}>
                  <Typography variant="small" style={{ fontWeight: '700', color: isAdmin ? '#B45309' : colors.textSecondary }}>
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </Typography>
                </View>
                <View style={styles.optionText}>
                  <Typography variant="bodyMedium" style={{ fontWeight: '600' }}>
                    {user.name}
                  </Typography>
                </View>
                <View style={[styles.roleTag, isAdmin ? styles.adminTag : styles.managerTag]}>
                  <Typography variant="overline" style={isAdmin ? styles.adminTagText : styles.managerTagText}>
                    {isAdmin ? 'Admin' : 'PG Manager'}
                  </Typography>
                </View>
                {isSelected && <Icon name="check-circle" size={18} color={colors.primary} style={{ marginLeft: 6 }} />}
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
    marginVertical: spacing.xl,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  hero: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
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
    lineHeight: 42,
    letterSpacing: -1.6,
    marginTop: spacing.md,
  },
  tagline: {
    marginTop: spacing.md,
    maxWidth: 260,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.background,
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
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  selectorText: {
    flex: 1,
    fontWeight: '600',
  },
  avatarBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  adminAvatar: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  managerAvatar: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  roleTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  adminTag: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  adminTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  managerTag: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  managerTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
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
    gap: spacing.sm,
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
  },
});
