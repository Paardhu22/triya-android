import { Redirect, Stack } from 'expo-router';

import { useAuth, useProperty } from '@/store';
import { colors } from '@/theme';

/**
 * Authenticated app shell. Guards against missing session/property (deep
 * links included) and hosts the tab navigator plus every pushed detail
 * screen with a native header.
 */
export default function MainLayout() {
  const { user } = useAuth();
  const { property } = useProperty();

  if (!user) return <Redirect href={"/(auth)/login" as any} />;
  if (!property) return <Redirect href={"/(auth)/select-property" as any} />;

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600', color: colors.text },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="rooms/[id]" options={{ title: '' }} />
      <Stack.Screen name="tenants/[id]" options={{ title: 'Tenant profile' }} />
      <Stack.Screen name="complaints/index" options={{ title: 'Complaints' }} />
      <Stack.Screen name="complaints/[id]" options={{ title: 'Complaint' }} />
      <Stack.Screen name="expenses/index" options={{ title: 'Expense Tracker' }} />
      <Stack.Screen name="expenses/[id]" options={{ title: 'Expense' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
      <Stack.Screen name="settings/profile" options={{ title: 'Profile' }} />
    </Stack>
  );
}
