import type { ComponentProps } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import type { Tabs } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { colors, fontFamilies } from '@/theme';
import { haptics } from '@/utils/haptics';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export interface TabMeta {
  icon: IconName;
  activeIcon: IconName;
  badge?: number;
}

const EASE = Easing.bezier(0.2, 0, 0, 1);

function TabItem({
  label,
  meta,
  focused,
  onPress,
  onLongPress,
}: {
  label: string;
  meta: TabMeta;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const pill = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0, { duration: 200, easing: EASE }),
    transform: [{ scaleX: withTiming(focused ? 1 : 0.55, { duration: 260, easing: EASE }) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, pill]} />
        <Icon
          name={focused ? meta.activeIcon : meta.icon}
          size={22}
          color={focused ? colors.primary : colors.textTertiary}
        />
        {meta.badge ? (
          <View style={styles.badge}>
            <Typography variant="smallMedium" colorValue={colors.textInverse} style={styles.badgeText}>
              {meta.badge > 9 ? '9+' : meta.badge}
            </Typography>
          </View>
        ) : null}
      </View>
      <Typography
        variant="small"
        colorValue={focused ? colors.text : colors.textTertiary}
        style={[styles.label, focused && styles.labelActive]}
        numberOfLines={1}
      >
        {label}
      </Typography>
    </Pressable>
  );
}

/**
 * TabBar — the app's bottom navigation. A Material-3-style blue-tint indicator
 * springs behind the active icon, selection ticks a haptic, and the bar sits
 * on white with a single hairline, matching the web's quiet sidebar.
 */
export function TabBar({
  state,
  descriptors,
  navigation,
  insets,
  meta,
}: TabBarProps & { meta: Record<string, TabMeta> }) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const label = typeof options.title === 'string' ? options.title : route.name;
        const routeMeta = meta[route.name];
        if (!routeMeta) return null;

        return (
          <TabItem
            key={route.key}
            label={label}
            meta={routeMeta}
            focused={focused}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                haptics.selection();
                navigation.navigate(route.name, route.params);
              }
            }}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 8,
    backgroundColor: colors.navigation,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  iconWrap: {
    width: 58,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 10,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
  },
  labelActive: {
    fontFamily: fontFamilies.semibold,
  },
});
