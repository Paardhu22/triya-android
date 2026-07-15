import {
  TextInput as RNTextInput,
  Pressable,
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
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
 * A rounded search field with a leading search icon and a clear button that
 * appears while there is a query. Used at the top of list screens.
 *
 * @example
 * <SearchBar value={query} onChangeText={setQuery} placeholder="Search name or phone" />
 */
export function SearchBar({ value, onChangeText, placeholder = 'Search', style }: SearchBarProps) {
  return (
    <View style={[styles.container, style]}>
      <Icon name="magnify" size={20} color={colors.textTertiary} />
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
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Icon name="close-circle" size={18} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
    ...typography.body,
    color: colors.text,
  },
});
