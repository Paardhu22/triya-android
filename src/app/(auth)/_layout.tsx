import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useReducedMotionSetting } from '@/hooks/useReducedMotionSetting';
import { colors } from '@/theme';

/** Authentication flow: login -> (admins) select property. Light canvas. */
export default function AuthLayout() {
  const reducedMotion = useReducedMotionSetting();
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
          animation: reducedMotion ? 'none' : 'fade',
          animationDuration: 180,
        }}
      />
    </>
  );
}
