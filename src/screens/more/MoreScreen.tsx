import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import {
  Avatar,
  LargeTitle,
  ListRow,
  Screen,
  SectionHeader,
  Surface,
  TopBar,
  Typography,
  enterItem,
  useScrollHeader,
} from '@/components';
import { useUnreadNotificationCount } from '@/hooks';
import { useAuth, useActiveProperty } from '@/store';
import { colors, spacing, GUTTER } from '@/theme';

/**
 * MoreScreen — the rest of the web sidebar: Reports, Complaints and the
 * Expense Tracker for the active property, then notifications, settings and
 * the signed-in account.
 */
export function MoreScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const property = useActiveProperty();
  const { data: unread } = useUnreadNotificationCount(property.id);
  const { scrollY, onScroll } = useScrollHeader();

  return (
    <Screen edges={['top']} padded={false} background={colors.canvas}>
      <TopBar title="More" scrollY={scrollY} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LargeTitle title="More" scrollY={scrollY} />

        {user && (
          <Animated.View entering={enterItem(0)}>
            <Surface>
              <ListRow
                leading={<Avatar name={user.name} size="md" />}
                title={user.name}
                subtitle={`${user.email} · ${user.role.charAt(0)}${user.role.slice(1).toLowerCase()}`}
                onPress={() => router.push('/(main)/settings/profile' as never)}
              />
            </Surface>
          </Animated.View>
        )}

        <Animated.View entering={enterItem(1)}>
          <SectionHeader title="Property" meta={property.name} />
          <Surface>
            <ListRow
              icon="chart-bar"
              title="Reports"
              subtitle="Expected vs collected by floor, room and tenant"
              onPress={() => router.push('/(main)/reports' as never)}
            />
            <ListRow
              divider
              icon="alert-circle-outline"
              title="Complaints"
              subtitle="Tickets raised by tenants and staff"
              onPress={() => router.push('/(main)/complaints' as never)}
            />
            <ListRow
              divider
              icon="receipt"
              title="Expense Tracker"
              subtitle="Operational spend by category"
              onPress={() => router.push('/(main)/expenses' as never)}
            />
          </Surface>
        </Animated.View>

        <Animated.View entering={enterItem(2)}>
          <SectionHeader title="Application" />
          <Surface>
            <ListRow
              icon="bell-outline"
              title="Notifications"
              trailing={
                unread ? (
                  <View style={styles.count}>
                    <Typography variant="smallMedium" colorValue={colors.textInverse}>
                      {unread}
                    </Typography>
                  </View>
                ) : undefined
              }
              onPress={() => router.push('/(main)/notifications' as never)}
            />
            <ListRow
              divider
              icon="cog-outline"
              title="Settings"
              subtitle="Property details, house rules, password"
              onPress={() => router.push('/(main)/settings' as never)}
            />
          </Surface>
        </Animated.View>

        <Typography variant="small" color="textTertiary" style={styles.footnote}>
          Bulk spreadsheet import and staff administration stay on the web app.
        </Typography>
      </Animated.ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: GUTTER,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  count: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
  },
  footnote: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
