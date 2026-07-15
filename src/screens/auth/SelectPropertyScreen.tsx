import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import {
  Button,
  PropertyCard,
  Screen,
  Typography,
  enterHeader,
  enterItem,
  enterUp,
} from '@/components';
import { getPropertyStats } from '@/mocks';
import { useAuth, useProperty } from '@/store';
import { colors, spacing, borderRadius } from '@/theme';

/**
 * SelectPropertyScreen
 *
 * Post-login property choice (mirrors the web /select-property page: ink
 * backdrop, sand overline, white headline, white property cards).
 * Managers scoped to one property never see this — PropertyProvider
 * auto-selects for them; admins choose which PG to manage and can switch
 * later from the dashboard header.
 */
export function SelectPropertyScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { properties, selectProperty } = useProperty();

  return (
    <Screen scrollable background={colors.primary}>
      <View style={styles.container}>
        <Animated.View entering={enterHeader()} style={styles.header}>
          <Typography variant="overline" colorValue={colors.sand}>
            Triya Manager
          </Typography>
          <Typography variant="h1" colorValue={colors.textInverse} style={styles.headline}>
            Select a property
          </Typography>
          <Typography variant="caption" colorValue="rgba(255, 255, 255, 0.6)">
            Choose which PG you want to manage. You can switch anytime from the
            dashboard header.
          </Typography>
        </Animated.View>

        {properties.length === 0 ? (
          <Animated.View entering={enterItem(0)} style={styles.emptyBox}>
            <Typography
              variant="caption"
              colorValue="rgba(255, 255, 255, 0.6)"
              style={styles.emptyText}
            >
              No properties are available for your account. Contact an
              administrator.
            </Typography>
          </Animated.View>
        ) : (
          <View style={styles.list}>
            {properties.map((property, index) => (
              <Animated.View key={property.id} entering={enterItem(index + 1)}>
                <PropertyCard
                  property={property}
                  stats={getPropertyStats(property.id)}
                  onPress={() => {
                    selectProperty(property);
                    router.replace('/');
                  }}
                />
              </Animated.View>
            ))}
          </View>
        )}

        <Animated.View entering={enterUp(160)} style={styles.footer}>
          <Typography variant="caption" colorValue="rgba(255, 255, 255, 0.6)">
            Signed in as {user?.name ?? '—'}
          </Typography>
          <Button
            title="Sign out"
            variant="outline"
            size="sm"
            icon="logout"
            style={styles.signOut}
            textColor={colors.textInverse}
            onPress={() => {
              signOut();
              router.replace('/(auth)/login' as any);
            }}
          />
        </Animated.View>
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
  headline: {
    marginTop: spacing.xs,
  },
  list: {
    gap: spacing.sm + 4,
  },
  emptyBox: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  emptyText: {
    textAlign: 'center',
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  signOut: {
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
});
