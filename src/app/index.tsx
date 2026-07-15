import { Redirect } from 'expo-router';

import { useAuth, useProperty } from '@/store';

/**
 * Entry gate: unauthenticated users land on the login screen, authenticated
 * users without a property selection pick one (admins), and everyone else
 * goes straight to the dashboard.
 */
export default function Index() {
  const { user } = useAuth();
  const { property } = useProperty();

  if (!user) return <Redirect href={"/(auth)/login" as any} />;
  if (!property) return <Redirect href={"/(auth)/select-property" as any} />;
  return <Redirect href={"/(main)/(tabs)/dashboard" as any} />;
}
