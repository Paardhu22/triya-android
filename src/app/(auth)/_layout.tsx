import { Stack } from 'expo-router';

/** Authentication flow: login -> (admins) select property. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
