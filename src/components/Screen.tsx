import {
  View,
  ScrollView,
  StyleSheet,
  type ViewProps,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

export interface ScreenProps extends ViewProps {
  /** Wraps content in a ScrollView. Defaults to false. */
  scrollable?: boolean;
  /** Adds horizontal padding to the content. Defaults to true. */
  padded?: boolean;
  /**
   * Enables KeyboardAvoidingView so the screen content adjusts
   * when the software keyboard is visible. Defaults to true.
   */
  keyboardAvoiding?: boolean;
}

/**
 * Screen component.
 *
 * A full-screen wrapper that provides:
 * - Safe area insets (avoids notches, status bar, navigation bar)
 * - White background
 * - Optional scrolling
 * - Optional horizontal padding
 * - Keyboard avoidance for forms
 *
 * Every route screen should be wrapped in this component.
 *
 * @example
 * <Screen scrollable>
 *   <Typography variant="h1">Settings</Typography>
 * </Screen>
 *
 * <Screen keyboardAvoiding>
 *   <TextInput label="Email" />
 * </Screen>
 */
export function Screen({
  scrollable = false,
  padded = true,
  keyboardAvoiding = true,
  style,
  children,
  ...rest
}: ScreenProps) {
  const contentStyle = [
    styles.content,
    padded && styles.padded,
    style,
  ];

  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, ...contentStyle]} {...rest}>
      {children}
    </View>
  );

  const wrappedContent = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {wrappedContent}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fill: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
});
