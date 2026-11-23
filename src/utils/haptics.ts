/**
 * Haptic feedback for action outcomes (money recorded, delete refused).
 * Routine taps, navigation, and selection changes use visual feedback only.
 * Fire-and-forget; no-ops on web and wherever the platform has no haptics engine.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

function safe(run: () => Promise<void>) {
  if (!enabled) return;
  run().catch(() => {});
}

export const haptics = {
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
