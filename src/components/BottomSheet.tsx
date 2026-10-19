import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  StyleSheet,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { borderRadius, colors, spacing } from '@/theme';

export interface BottomSheetProps {
  visible: boolean;
  /** Called when the user dismisses (drag down, backdrop tap, close button, back). */
  onClose: () => void;
  /** Header title. Omit for fully custom content. */
  title?: string;
  /** Muted line under the title (tenant · room, billing month…). */
  subtitle?: string;
  /** Max sheet height as a fraction of the window. Defaults to 0.9. */
  maxHeightRatio?: number;
  /**
   * Wraps children in a ScrollView (default). Disable when the content
   * manages its own scrolling (e.g. a FlatList).
   */
  scrollable?: boolean;
  /**
   * Pinned below the scrolling content — the primary action of a form sheet
   * ("Record Collection") stays in thumb reach however long the form is.
   */
  footer?: ReactNode;
  children: ReactNode;
}

const EASE_OUT = Easing.bezier(0.2, 0, 0, 1);
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 900;

/**
 * BottomSheet component.
 *
 * The app's replacement for the web's dialogs: slides up with the standard
 * decelerate curve, follows the finger when dragged by its handle/header and
 * dismisses past a threshold (or on a flick), dims the screen, and closes on
 * backdrop tap or the hardware back button. Keyboard-aware for forms, with an
 * optional pinned footer for the primary action.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  maxHeightRatio = 0.9,
  scrollable = true,
  footer,
  children,
}: BottomSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(windowHeight);

  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      translateY.set(windowHeight);
      translateY.set(withTiming(0, { duration: 340, easing: EASE_OUT }));
    } else if (mounted) {
      translateY.set(
        withTiming(windowHeight, { duration: 220, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = Gesture.Pan()
    .activeOffsetY(6)
    .onChange((e) => {
      translateY.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        scheduleOnRN(onClose);
      } else {
        translateY.set(withSpring(0, { damping: 22, stiffness: 260, mass: 0.8 }));
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.get(), [0, windowHeight * 0.6], [1, 0], 'clamp'),
  }));

  if (!mounted) return null;

  const bottomPad = insets.bottom + spacing.md;
  const body = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, !footer && { paddingBottom: bottomPad }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fillBody, !footer && { paddingBottom: bottomPad }]}>
      {children}
    </View>
  );

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={styles.fill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.avoider}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[styles.sheet, { maxHeight: windowHeight * maxHeightRatio }, sheetStyle]}
          >
            <GestureDetector gesture={pan}>
              <View style={styles.grabArea}>
                <View style={styles.handle} />
                {title !== undefined && (
                  <View style={styles.header}>
                    <View style={styles.headerText}>
                      <Typography variant="h2" numberOfLines={1}>
                        {title}
                      </Typography>
                      {subtitle ? (
                        <Typography variant="caption" color="textSecondary" numberOfLines={1}>
                          {subtitle}
                        </Typography>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={onClose}
                      hitSlop={10}
                      style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Close"
                    >
                      <Icon name="close" size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                )}
              </View>
            </GestureDetector>
            {body}
            {footer ? (
              <View style={[styles.footer, { paddingBottom: bottomPad }]}>{footer}</View>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  avoider: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  grabArea: {
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.xs,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ring,
    marginBottom: spacing.sm + 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md + 4,
    paddingBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  closePressed: {
    backgroundColor: colors.surfacePressed,
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.sm,
  },
  fillBody: {
    flexShrink: 1,
  },
  footer: {
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.sm + 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
});
