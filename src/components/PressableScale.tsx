import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EASE = Easing.bezier(0.2, 0, 0, 1);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** Scale when fully pressed. Defaults to 0.97. */
  scaleTo?: number;
  /** Opacity when fully pressed. Defaults to 0.9. */
  opacityTo?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pressable with the app's natural press feedback: a quick, eased scale +
 * opacity dip on press-in and a slightly slower release. Used by Button and
 * FAB; use it for any custom tappable card that needs press feedback.
 */
export function PressableScale({
  scaleTo = 0.97,
  opacityTo = 0.9,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      transform: [{ scale: 1 + (scaleTo - 1) * p }],
      opacity: 1 + (opacityTo - 1) * p,
    };
  });

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event) => {
        progress.set(withTiming(1, { duration: 110, easing: EASE }));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        progress.set(withTiming(0, { duration: 200, easing: EASE }));
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    />
  );
}
