import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/theme';

/** Authentication flow: login -> (admins) select property. Ink backdrop. */
export default function AuthLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.primary },
          animation: 'fade',
        }}
      />
    </>
  );
}
