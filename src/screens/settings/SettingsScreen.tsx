import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import {
  ConfirmDialog,
  KeyValue,
  ListRow,
  Screen,
  SectionHeader,
  Surface,
  enterItem,
  toast,
} from '@/components';
import { useAuth, useActiveProperty } from '@/store';
import { colors, spacing, GUTTER } from '@/theme';
import { ChangePasswordSheet } from './ChangePasswordSheet';
import { EditPropertySheet } from './EditPropertySheet';

function capitalize(value: string): string {
  return value ? value.charAt(0) + value.slice(1).toLowerCase() : value;
}

/**
 * SettingsScreen
 *
 * The web Settings page on mobile: the Account card (read-only staff
 * identity), Security (change password), and the current property's
 * details — editable for ADMIN only, exactly the web permission rule.
 */
export function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const property = useActiveProperty();

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const canManageProperty = user?.role === 'ADMIN';

  return (
    <Screen edges={['bottom']} padded={false} background={colors.canvas}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={enterItem(0)}>
          <SectionHeader title="Account" subtitle="Your authenticated staff identity and access level." />
          <Surface padded style={styles.facts}>
            <KeyValue label="Name" value={user?.name ?? 'Not set'} />
            <KeyValue label="Email" value={user?.email ?? 'Not set'} divider />
            <KeyValue label="Role" value={capitalize(user?.role ?? '')} divider />
          </Surface>
        </Animated.View>

        <Animated.View entering={enterItem(1)}>
          <SectionHeader title="Security" subtitle="Change the password used for credentials login." />
          <Surface>
            <ListRow icon="lock-outline" title="Change password" onPress={() => setPasswordOpen(true)} />
            <ListRow
              divider
              icon="account-outline"
              title="Profile"
              onPress={() => router.push('/(main)/settings/profile' as never)}
            />
          </Surface>
        </Animated.View>

        <Animated.View entering={enterItem(2)}>
          <SectionHeader
            title="Property"
            subtitle={
              canManageProperty
                ? 'Details for the currently selected property.'
                : 'Details for the currently selected property. Only admins can edit.'
            }
          />
          <Surface>
            <Surface padded style={styles.inner}>
              <KeyValue label="Name" value={property.name} />
              <KeyValue label="Address" value={property.address ?? 'Not set'} divider />
              <KeyValue label="City" value={property.city ?? 'Not set'} divider />
              <KeyValue label="Phone" value={property.phone ?? 'Not set'} divider />
              <KeyValue label="House rules" value={property.rulesText ? 'Set' : 'Not set'} divider />
            </Surface>
            {canManageProperty && (
              <ListRow
                divider
                insetDivider={false}
                icon="pencil-outline"
                title="Edit property"
                onPress={() => setPropertyOpen(true)}
              />
            )}
          </Surface>
        </Animated.View>

        <Animated.View entering={enterItem(3)}>
          <Surface>
            <ListRow
              icon="information-outline"
              title="About Triya Manager"
              subtitle="Version 1.0.0 · the native companion to the web app"
              hideChevron
              onPress={() => toast.info('Triya Manager 1.0.0', { description: 'The native companion to the Triya Manager web app.' })}
            />
            <ListRow divider icon="logout" title="Sign out" destructive hideChevron onPress={() => setSignOutOpen(true)} />
          </Surface>
        </Animated.View>
      </ScrollView>

      <ConfirmDialog
        visible={signOutOpen}
        title="Sign out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        destructive
        onConfirm={() => {
          setSignOutOpen(false);
          signOut();
          router.replace('/(auth)/login' as never);
        }}
        onCancel={() => setSignOutOpen(false)}
      />
      <ChangePasswordSheet visible={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <EditPropertySheet visible={propertyOpen} property={property} onClose={() => setPropertyOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: GUTTER,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  facts: {
    paddingVertical: spacing.xs,
  },
  inner: {
    borderWidth: 0,
    borderRadius: 0,
    paddingVertical: spacing.xs,
  },
});
