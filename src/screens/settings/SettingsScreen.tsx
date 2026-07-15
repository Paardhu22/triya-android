import { useState } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Divider } from '@/components/Divider';
import { ListItem } from '@/components/ListItem';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Typography } from '@/components/Typography';
import { enterItem } from '@/components/motion';
import { useAuth, useActiveProperty } from '@/store';
import { spacing } from '@/theme';
import { ChangePasswordSheet } from './ChangePasswordSheet';
import { EditPropertySheet } from './EditPropertySheet';

/**
 * SettingsScreen
 *
 * The web Settings page on mobile: the Account card (read-only staff
 * identity), Security (change password), and the current property's
 * details — editable in place for ADMIN, exactly the web permission rule.
 */
export function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const property = useActiveProperty();

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [propertyOpen, setPropertyOpen] = useState(false);

  const canManageProperty = user?.role === 'ADMIN';

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          signOut();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  return (
    <Screen edges={['bottom']} scrollable>
      {/* Account */}
      <Animated.View entering={enterItem(0)} style={styles.section}>
        <SectionHeader
          title="Account"
          subtitle="Your authenticated staff identity and access level."
        />
        <Card flat>
          <InfoRow label="Name" value={user?.name ?? 'Not set'} />
          <Divider verticalSpacing="sm" />
          <InfoRow label="Email" value={user?.email ?? 'Not set'} />
          <Divider verticalSpacing="sm" />
          <InfoRow label="Role" value={capitalize(user?.role ?? '')} />
        </Card>
      </Animated.View>

      {/* Security */}
      <Animated.View entering={enterItem(1)} style={styles.section}>
        <SectionHeader
          title="Security"
          subtitle="Change the password used for credentials login."
        />
        <Card flat noPadding>
          <ListItem
            title="Change password"
            icon="lock-outline"
            onPress={() => setPasswordOpen(true)}
          />
          <Divider style={styles.zeroDivider} />
          <ListItem
            title="Profile"
            icon="account-outline"
            onPress={() => router.push('/(main)/settings/profile' as any)}
          />
        </Card>
      </Animated.View>

      {/* Property */}
      <Animated.View entering={enterItem(2)} style={styles.section}>
        <SectionHeader
          title="Property"
          subtitle={
            canManageProperty
              ? 'Details for the currently selected property.'
              : 'Details for the currently selected property. Only admins can edit.'
          }
        />
        <Card flat>
          <InfoRow label="Name" value={property.name} />
          <Divider verticalSpacing="sm" />
          <InfoRow label="Address" value={property.address ?? 'Not set'} />
          <Divider verticalSpacing="sm" />
          <InfoRow label="City" value={property.city ?? 'Not set'} />
          <Divider verticalSpacing="sm" />
          <InfoRow label="Phone" value={property.phone ?? 'Not set'} />
          <Divider verticalSpacing="sm" />
          <InfoRow
            label="House rules"
            value={property.rulesText ? 'Set' : 'Not set'}
          />
          {canManageProperty && (
            <Button
              title="Edit property"
              variant="outline"
              size="sm"
              icon="pencil-outline"
              onPress={() => setPropertyOpen(true)}
              style={styles.editButton}
            />
          )}
        </Card>
      </Animated.View>

      {/* App */}
      <Animated.View entering={enterItem(3)} style={styles.section}>
        <Card flat noPadding>
          <ListItem
            title="About Triya Manager"
            icon="information-outline"
            onPress={() =>
              Alert.alert(
                'Triya Manager',
                'Version 1.0.0\nThe native companion to the Triya Manager web app.',
              )
            }
          />
          <Divider style={styles.zeroDivider} />
          <ListItem title="Sign out" icon="logout" destructive onPress={handleSignOut} />
        </Card>
      </Animated.View>

      <ChangePasswordSheet visible={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <EditPropertySheet
        visible={propertyOpen}
        property={property}
        onClose={() => setPropertyOpen(false)}
      />
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="captionMedium" style={styles.infoValue} numberOfLines={2}>
        {value}
      </Typography>
    </View>
  );
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const styles = StyleSheet.create({
  section: {
    paddingTop: spacing.lg,
  },
  zeroDivider: {
    marginVertical: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
  },
  editButton: {
    marginTop: spacing.md,
  },
});
