import { Pressable, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { Icon, PropertySelector, Typography } from '@/components';
import { useUnreadNotificationCount } from '@/hooks';
import { useProperty } from '@/store';
import { colors, spacing, borderRadius } from '@/theme';

export interface TabHeaderProps {
  title: string;
  /** Hides the property switcher (e.g. on More). Defaults to true. */
  showPropertySelector?: boolean;
}

/**
 * TabHeader
 *
 * Shared header for the five tab screens: title, the property switcher
 * (the mobile counterpart of the web top bar) and the notification bell
 * with an unread dot.
 */
export function TabHeader({ title, showPropertySelector = true }: TabHeaderProps) {
  const router = useRouter();
  const { property, properties, selectProperty } = useProperty();
  const { data: unread } = useUnreadNotificationCount(property?.id ?? '');

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {showPropertySelector ? (
          <PropertySelector
            properties={properties}
            selectedId={property?.id ?? null}
            onSelect={selectProperty}
          />
        ) : (
          <View />
        )}
        <Pressable
          onPress={() => router.push('/(main)/notifications' as any)}
          style={({ pressed }) => [styles.bell, pressed && styles.bellPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ''}`}
        >
          <Icon name="bell-outline" size={22} color={colors.text} />
          {Boolean(unread) && <View style={styles.unreadDot} />}
        </Pressable>
      </View>
      <Typography variant="h1">{title}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm + 4,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  bellPressed: {
    backgroundColor: colors.surfacePressed,
  },
  unreadDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});
