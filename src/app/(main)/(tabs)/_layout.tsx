import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components';
import { useUnreadNotificationCount } from '@/hooks';
import { useActiveProperty } from '@/store';
import { colors } from '@/theme';

function tabIcon(focusedName: IconName, name: IconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Icon name={focused ? focusedName : name} size={24} color={color as string} />
  );
}

/**
 * Bottom tab navigation — the five everyday destinations. The web sidebar's
 * remaining entries (Complaints, Expense Tracker, Settings) live under More,
 * keeping the tab bar within thumb reach.
 */
export default function TabsLayout() {
  const property = useActiveProperty();
  const { data: unread } = useUnreadNotificationCount(property.id);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.borderLight,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: tabIcon('view-dashboard', 'view-dashboard-outline'),
        }}
      />
      <Tabs.Screen
        name="floors"
        options={{
          title: 'Floors',
          tabBarIcon: tabIcon('office-building', 'office-building-outline'),
        }}
      />
      <Tabs.Screen
        name="tenants"
        options={{
          title: 'Tenants',
          tabBarIcon: tabIcon('account-group', 'account-group-outline'),
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: 'Collections',
          tabBarIcon: tabIcon('cash-multiple', 'cash-multiple'),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: tabIcon('dots-horizontal-circle', 'dots-horizontal-circle-outline'),
          tabBarBadge: unread ? unread : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.error,
            color: colors.textInverse,
            fontSize: 10,
          },
        }}
      />
    </Tabs>
  );
}
