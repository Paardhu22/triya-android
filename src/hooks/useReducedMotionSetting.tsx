import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

const ReducedMotionContext = createContext<boolean | null>(null);

/** One native subscription shared by all navigation and loading animations. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const initialSetting = useReducedMotion();
  const [reducedMotion, setReducedMotion] = useState(initialSetting);

  useEffect(() => {
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      changed = true;
      setReducedMotion(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { if (active && !changed) setReducedMotion(enabled); })
      .catch(() => {});
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return <ReducedMotionContext.Provider value={reducedMotion}>{children}</ReducedMotionContext.Provider>;
}

/** Keep navigation and native animations in sync with accessibility settings. */
export function useReducedMotionSetting() {
  const setting = useContext(ReducedMotionContext);
  const initialSetting = useReducedMotion();
  return setting ?? initialSetting;
}
