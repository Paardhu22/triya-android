import Constants from 'expo-constants';
import { setDevelopmentApiUrl } from '@/data/client';
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastHost } from '@/components/Toast';
import { StartupIntro } from '@/components/StartupIntro';
import { AuthProvider, PropertyProvider, useAuth } from '@/store';
import { ThemeProvider } from '@/theme';

// Follow the same host as Metro for local development; an explicit API URL always wins.
if (__DEV__ && Constants.expoConfig?.hostUri) {
  try { setDevelopmentApiUrl(`http://${new URL(`http://${Constants.expoConfig.hostUri}`).hostname}:3000`); } catch { /* Explicit configuration remains available. */ }
}
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // Manrope — the web app's typeface since its Portfolio2 refresh.
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <AuthProvider>
          <PropertyProvider>
            <AppNavigator />
            <ToastHost />
          </PropertyProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function AppNavigator() {
  const { isRestoring } = useAuth();
  const [introFinished, setIntroFinished] = useState(false);
  const [revealScreen, setRevealScreen] = useState(false);
  const finishIntro = useCallback(() => setIntroFinished(true), []);
  const reveal = useCallback(() => setRevealScreen(true), []);
  return (
    <View style={styles.root}>
      {revealScreen && <Stack screenOptions={{ headerShown: false }} />}
      {!introFinished && (
        <View style={StyleSheet.absoluteFill}>
          <StartupIntro ready={!isRestoring} onReveal={reveal} onFinish={finishIntro} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121110',
  },
});
