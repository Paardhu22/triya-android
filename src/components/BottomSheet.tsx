import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius } from '@/theme';

export interface BottomSheetProps {
  visible: boolean;
  /** Called when the user dismisses (backdrop tap, close button, back). */
  onClose: () => void;
  /** Header title. Omit for fully custom content. */
  title?: string;
  /** Max sheet height as a fraction of the window. Defaults to 0.85. */
  maxHeightRatio?: number;
  /**
   * Wraps children in a ScrollView (default). Disable when the content
   * manages its own scrolling (e.g. a FlatList).
   */
  scrollable?: boolean;
  children: ReactNode;
}

/**
 * BottomSheet component.
 *
 * The app's replacement for the web's dialogs and side panels: slides up from
 * the bottom with a drag handle, dims the screen, and dismisses on backdrop
 * tap or the hardware back button. Content is keyboard-aware for forms.
 *
 * @example
 * <BottomSheet visible={open} onClose={() => setOpen(false)} title="Room 301">
 *   <BedList beds={room.beds} />
 * </BottomSheet>
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  maxHeightRatio = 0.85,
  scrollable = true,
  children,
}: BottomSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress]);

  if (!mounted) return null;

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [windowHeight, 0],
  });

  const body = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, { paddingBottom: insets.bottom + spacing.lg }]}>
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
      <View style={styles.fill}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable style={styles.fill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.avoider}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              { maxHeight: windowHeight * maxHeightRatio, transform: [{ translateY }] },
            ]}
          >
            <View style={styles.handle} />
            {title !== undefined && (
              <View style={styles.header}>
                <Typography variant="h3" style={styles.headerTitle} numberOfLines={1}>
                  {title}
                </Typography>
                <Pressable
                  onPress={onClose}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Icon name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>
            )}
            {body}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
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
    borderTopLeftRadius: borderRadius.xl + 4,
    borderTopRightRadius: borderRadius.xl + 4,
    paddingTop: spacing.sm,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
