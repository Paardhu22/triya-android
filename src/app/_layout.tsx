import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, PropertyProvider } from '@/store';
import { ThemeProvider } from '@/theme';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PropertyProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </PropertyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
