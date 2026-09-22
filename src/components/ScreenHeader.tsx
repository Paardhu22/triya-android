import type { ReactNode } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { PropertySelector } from '@/components/PropertySelector';
import { Typography } from '@/components/Typography';
import { useUnreadNotificationCount } from '@/hooks/useQueries';
import { useProperty } from '@/store';
import { colors, spacing, GUTTER } from '@/theme';
import { haptics } from '@/utils/haptics';

/** Scroll distance over which the large title hands over to the compact one. */
const COLLAPSE = 44;

/**
 * Scroll tracking for a tab screen's collapsing header. Pass `onScroll` to an
 * Animated.ScrollView / Animated.FlatList (with scrollEventThrottle={16}) and
 * `scrollY` to TopBar + LargeTitle.
 */
export function useScrollHeader() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  return { scrollY, onScroll };
}

export interface TopBarProps {
  /** The screen title, shown compact once the large title scrolls away. */
  title: string;
  scrollY: SharedValue<number>;
  /** Hides the property switcher (e.g. on More). Defaults to true. */
  showPropertySelector?: boolean;
  /** Extra trailing action before the bell. */
  action?: ReactNode;
}

/**
 * TopBar — the fixed bar of every tab screen: the property switcher (the web
 * top bar's picker) cross-fading into the compact title as content scrolls,
 * and the notifications bell. A hairline fades in once content passes under.
 */
export function TopBar({ title, scrollY, showPropertySelector = true, action }: TopBarProps) {
  const router = useRouter();
  const { property, properties, selectProperty } = useProperty();
  const { data: unread } = useUnreadNotificationCount(property?.id ?? '');

  const selectorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [0, COLLAPSE * 0.6], [1, 0], 'clamp'),
    transform: [{ translateY: interpolate(scrollY.get(), [0, COLLAPSE], [0, -6], 'clamp') }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [COLLAPSE * 0.5, COLLAPSE], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(scrollY.get(), [COLLAPSE * 0.5, COLLAPSE], [6, 0], 'clamp') }],
  }));
  const hairlineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [COLLAPSE * 0.6, COLLAPSE * 1.2], [0, 1], 'clamp'),
  }));

  return (
    <View style={styles.bar}>
      <View style={styles.leading}>
        {showPropertySelector && (
          <Animated.View style={[styles.layer, selectorStyle]}>
            <PropertySelector
              properties={properties}
              selectedId={property?.id ?? null}
              onSelect={selectProperty}
            />
          </Animated.View>
        )}
        <Animated.View style={[styles.layer, titleStyle]} pointerEvents="none">
          <Typography variant="h3" numberOfLines={1}>
            {title}
          </Typography>
        </Animated.View>
      </View>
      <View style={styles.actions}>
        {action}
        <Pressable
          onPress={() => {
            haptics.tap();
            router.push('/(main)/notifications' as never);
          }}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ''}`}
        >
          <Icon name="bell-outline" size={21} color={colors.text} />
          {Boolean(unread) && <View style={styles.unreadDot} />}
        </Pressable>
      </View>
      <Animated.View style={[styles.hairline, hairlineStyle]} />
    </View>
  );
}

export interface LargeTitleProps {
  title: string;
  /** Muted line under the title (web PageHeader description). */
  subtitle?: string;
  scrollY: SharedValue<number>;
  /** Right-aligned element on the title row (e.g. a month picker). */
  right?: ReactNode;
}

/**
 * LargeTitle — the web PageHeader (2.125rem, -0.035em) at the top of the
 * scroll content. Lifts and fades as it scrolls under the TopBar.
 */
export function LargeTitle({ title, subtitle, scrollY, right }: LargeTitleProps) {
  const style = useAnimatedStyle(() => {
    const y = scrollY.get();
    return {
      opacity: interpolate(y, [0, COLLAPSE], [1, 0], 'clamp'),
      transform: [
        { translateY: interpolate(y, [-80, 0, COLLAPSE], [8, 0, -4], 'clamp') },
        { scale: interpolate(y, [-120, 0], [1.06, 1], 'clamp') },
      ],
    };
  });

  return (
    <Animated.View style={[styles.large, style]}>
      <View style={styles.largeRow}>
        <Typography variant="display" numberOfLines={1} adjustsFontSizeToFit style={styles.largeText}>
          {title}
        </Typography>
        {right}
      </View>
      {subtitle ? (
        <Typography variant="caption" color="textSecondary" numberOfLines={2}>
          {subtitle}
        </Typography>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: GUTTER,
    backgroundColor: colors.canvas,
    zIndex: 10,
  },
  leading: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  iconButtonPressed: {
    backgroundColor: colors.surfacePressed,
  },
  unreadDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  large: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.md + 4,
    gap: 4,
  },
  largeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  largeText: {
    flexShrink: 1,
  },
});
