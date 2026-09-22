/**
 * Haptic feedback, fire-and-forget. Light taps confirm selection changes,
 * notifications confirm outcomes (money recorded, delete refused). No-ops on
 * web and wherever the platform has no haptics engine.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

function safe(run: () => Promise<void>) {
  if (!enabled) return;
  run().catch(() => {});
}

export const haptics = {
  /** Selection changed (chips, segments, tabs). */
  selection: () => safe(() => Haptics.selectionAsync()),
  /** A light physical tap (opening a sheet, pressing a row). */
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
