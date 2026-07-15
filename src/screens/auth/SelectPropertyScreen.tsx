import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, PropertyCard, Screen, Typography } from '@/components';
import { getPropertyStats } from '@/mocks';
import { useAuth, useProperty } from '@/store';
import { spacing } from '@/theme';

/**
 * SelectPropertyScreen
 *
 * Post-login property choice (mirrors the web /select-property page).
 * Managers scoped to one property never see this — PropertyProvider
 * auto-selects for them; admins choose which PG to manage and can switch
 * later from the dashboard header.
 */
export function SelectPropertyScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { properties, selectProperty } = useProperty();

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <View style={styles.header}>
          <Typography variant="captionMedium" color="primary" style={styles.brand}>
            TRIYA MANAGER
          </Typography>
          <Typography variant="h1">Select a property</Typography>
          <Typography variant="body" color="textSecondary">
            Choose which PG you want to manage. You can switch anytime from the
            dashboard header.
          </Typography>
        </View>

        {properties.length === 0 ? (
          <View style={styles.emptyBox}>
            <Typography variant="body" color="textSecondary" style={styles.emptyText}>
              No properties are available for your account. Contact an
              administrator.
            </Typography>
          </View>
        ) : (
          <View style={styles.list}>
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                stats={getPropertyStats(property.id)}
                onPress={() => {
                  selectProperty(property);
                  router.replace('/');
                }}
              />
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Typography variant="caption" color="textTertiary">
            Signed in as {user?.name ?? '—'}
          </Typography>
          <Button
            title="Sign out"
            variant="outline"
            size="sm"
            icon="logout"
            onPress={() => {
              signOut();
              router.replace('/(auth)/login' as any);
            }}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  brand: {
    letterSpacing: 2,
  },
  list: {
    gap: spacing.sm + 4,
  },
  emptyBox: {
    paddingVertical: spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
});
