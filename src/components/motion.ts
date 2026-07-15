/**
 * Shared Reanimated presets — one place defines the app's motion language.
 *
 * Quick fades with slight vertical travel, 200–350ms, standard decelerate
 * easing, capped stagger. Subtle by design: motion confirms hierarchy and
 * responsiveness, it never performs. Factories (not shared builder
 * instances) because the builder chain mutates state.
 */

import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  LinearTransition,
} from 'react-native-reanimated';

const EASE = Easing.bezier(0.2, 0, 0, 1);

/** Whole-screen content entrance. */
export const enterScreen = () => FadeIn.duration(240).easing(EASE);

/** Header / hero blocks: fade in with slight downward travel. */
export const enterHeader = (delay = 0) =>
  FadeInDown.duration(300).delay(delay).easing(EASE);

/**
 * Card/list-row entrance with capped stagger — pass the item's index.
 * The cap keeps long lists from queuing animations far off-screen.
 */
export const enterItem = (index = 0, step = 45) =>
  FadeInDown.duration(280)
    .delay(Math.min(index * step, 360))
    .easing(EASE);

/** Rising entrance for footers, sticky actions and sheet content. */
export const enterUp = (delay = 0) =>
  FadeInUp.duration(280).delay(delay).easing(EASE);

/** Layout transition for filtering/reordering lists. */
export const layoutTransition = () => LinearTransition.duration(200).easing(EASE);
