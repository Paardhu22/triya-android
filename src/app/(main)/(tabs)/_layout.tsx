import { Tabs } from 'expo-router';

import { TabBar, type TabMeta } from '@/components/TabBar';
import { useUnreadNotificationCount } from '@/hooks';
import { useActiveProperty } from '@/store';
import { colors } from '@/theme';

/**
 * Bottom tab navigation — the five everyday destinations. The web sidebar's
 * remaining entries (Reports, Complaints, Expense Tracker, Settings) live
 * under More, keeping the tab bar within thumb reach.
 */
export default function TabsLayout() {
  const property = useActiveProperty();
  const { data: unread } = useUnreadNotificationCount(property.id);

  const meta: Record<string, TabMeta> = {
    dashboard: { icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    floors: { icon: 'office-building-outline', activeIcon: 'office-building' },
    tenants: { icon: 'account-group-outline', activeIcon: 'account-group' },
    collections: { icon: 'wallet-outline', activeIcon: 'wallet' },
    more: {
      icon: 'dots-horizontal-circle-outline',
      activeIcon: 'dots-horizontal-circle',
      badge: unread ?? 0,
    },
  };

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} meta={meta} />}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="floors" options={{ title: 'Floors' }} />
      <Tabs.Screen name="tenants" options={{ title: 'Tenants' }} />
      <Tabs.Screen name="collections" options={{ title: 'Collections' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
