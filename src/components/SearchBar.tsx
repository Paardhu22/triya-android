import {
  TextInput as RNTextInput,
  Pressable,
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
  Platform,
} from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, spacing, borderRadius, typography } from '@/theme';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  /** Placeholder text. Defaults to 'Search'. */
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * SearchBar component.
 *
 * A soft search field with a leading glyph and a clear button while there is
 * a query. Sits on the canvas, so it reads as a surface, not an outlined box.
 */
export function SearchBar({ value, onChangeText, placeholder = 'Search', style }: SearchBarProps) {
  return (
    <View style={[styles.container, style]}>
      <Icon name="magnify" size={19} color={colors.textTertiary} />
      <RNTextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityRole="search"
        selectionColor={colors.primary}
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Icon name="close-circle" size={17} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

// The browser focus ring doubles the field's own focus border on web.
const webNoOutline = Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : {};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 42,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: borderRadius.md + 2,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
    ...typography.body,
    color: colors.text,
    ...webNoOutline,
  },
});
