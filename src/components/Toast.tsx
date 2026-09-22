import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeOutUp, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { borderRadius, colors, elevation, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';

type ToastKind = 'success' | 'warning' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
  duration: number;
}

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(items);
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function show(kind: ToastKind, title: string, options?: { description?: string; duration?: number }) {
  seq += 1;
  const item: ToastItem = {
    id: seq,
    kind,
    title,
    description: options?.description,
    duration: options?.duration ?? (options?.description ? 4500 : 2800),
  };
  // One at a time, newest wins — a phone screen has room for one message.
  items = [item];
  emit();
  if (kind === 'success') haptics.success();
  else if (kind === 'warning') haptics.warning();
  else if (kind === 'error') haptics.error();
}

/**
 * Non-blocking feedback — the mobile counterpart of the web's sonner toasts
 * (`toast.success("Collection recorded", { description })`). Never interrupts
 * the flow the way an Alert would.
 */
export const toast = {
  success: (title: string, options?: { description?: string; duration?: number }) =>
    show('success', title, options),
  warning: (title: string, options?: { description?: string; duration?: number }) =>
    show('warning', title, options),
  error: (title: string, options?: { description?: string; duration?: number }) =>
    show('error', title, options),
  info: (title: string, options?: { description?: string; duration?: number }) =>
    show('info', title, options),
};

const META: Record<ToastKind, { icon: IconName; color: string }> = {
  success: { icon: 'check-circle', color: colors.success },
  warning: { icon: 'alert-circle', color: colors.warning },
  error: { icon: 'close-circle', color: colors.error },
  info: { icon: 'information', color: colors.primary },
};

/** Mount once at the root; renders the active toast above everything. */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<ToastItem[]>(items);

  useEffect(() => {
    const l: Listener = (next) => setCurrent([...next]);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const toastItem = current[current.length - 1];

  useEffect(() => {
    if (!toastItem) return;
    const timer = setTimeout(() => dismiss(toastItem.id), toastItem.duration);
    return () => clearTimeout(timer);
  }, [toastItem]);

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing.sm }]}>
      {toastItem && (
        <Animated.View
          key={toastItem.id}
          entering={SlideInUp.duration(320).easing(Easing.bezier(0.2, 0, 0, 1))}
          exiting={FadeOutUp.duration(200)}
          style={styles.toast}
        >
          <Pressable
            onPress={() => dismiss(toastItem.id)}
            style={styles.inner}
            accessibilityRole="alert"
            accessibilityLabel={`${toastItem.title}. ${toastItem.description ?? ''}`}
          >
            <Icon name={META[toastItem.kind].icon} size={20} color={META[toastItem.kind].color} />
            <View style={styles.text}>
              <Typography variant="captionMedium" colorValue={colors.textInverse}>
                {toastItem.title}
              </Typography>
              {toastItem.description ? (
                <Typography variant="small" colorValue="rgba(255,255,255,0.72)">
                  {toastItem.description}
                </Typography>
              ) : null}
            </View>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  toast: {
    width: '100%',
    maxWidth: 480,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    ...elevation.lg,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
    paddingTop: 1,
  },
});
