import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Session } from '@/data/client';
const SESSION_KEY = 'triya.session.v1';
// Browser preview retains credentials in memory; native credentials use OS-backed secure storage.
export const sessionStorage = {
  async read(): Promise<Session | null> {
    if (Platform.OS === 'web') return null;
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  async write(value: Session | null) {
    if (Platform.OS === 'web') return;
    if (value) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(value));
    else await SecureStore.deleteItemAsync(SESSION_KEY);
  },
};
