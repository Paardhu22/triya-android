import { useEffect, useId, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Triya Manager's standalone logo intro, once per app launch. */
export function StartupIntro({ ready, onReveal, onFinish }: {
  ready: boolean; onReveal?: () => void; onFinish: () => void;
}) {
  const { width } = useWindowDimensions();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const cardWidth = Math.min(width - 64, 360) / 1.15;
  const haloSize = Math.min(width * 1.4, 550);
  const [entrance] = useState(() => new Animated.Value(0));
  const [halo] = useState(() => new Animated.Value(0));
  const [exit] = useState(() => new Animated.Value(0));
  const [laidOut, setLaidOut] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(value => { if (active) setReduceMotion(value); })
      .catch(() => { if (active) setReduceMotion(false); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (!laidOut || !imageReady || reduceMotion === null) return;
    entrance.setValue(0);
    halo.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(entrance, {
        toValue: 1, duration: reduceMotion ? 180 : 1250,
        easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true,
      }),
      Animated.timing(halo, {
        toValue: 1, duration: reduceMotion ? 300 : 1800,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
    ]);
    // The custom intro is painted and its bundled logo is decoded before the
    // native splash disappears. Session restoration runs behind this screen.
    const frame = requestAnimationFrame(() => {
      void SplashScreen.hideAsync().catch(() => {});
      animation.start(({ finished }) => { if (finished) setIntroFinished(true); });
    });
    return () => { cancelAnimationFrame(frame); animation.stop(); };
  }, [laidOut, imageReady, reduceMotion, entrance, halo]);

  useEffect(() => {
    if (!introFinished || !ready) return;
    onReveal?.();
    const animation = Animated.timing(exit, {
      toValue: 1, duration: reduceMotion ? 150 : 700,
      easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true,
    });
    animation.start(({ finished }) => { if (finished) onFinish(); });
    return () => animation.stop();
  }, [introFinished, ready, reduceMotion, exit, onReveal, onFinish]);

  return (
    <Animated.View testID="startup-intro" onLayout={() => setLaidOut(true)} style={[
      styles.screen,
      { opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, reduceMotion ? 1 : 0.96] }) }] },
    ]}>
      <StatusBar hidden />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id={`background${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0" stopColor="#181614" />
            <Stop offset="0.5" stopColor="#121110" />
            <Stop offset="1" stopColor="#0c0b0a" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#background${id})`} />
      </Svg>
      <Pressable style={styles.stage} onPress={() => setIntroFinished(true)}
        accessibilityRole="button" accessibilityLabel="Skip opening animation">
        <Animated.View pointerEvents="none" style={[
          styles.halo, { width: haloSize, height: haloSize,
            opacity: halo.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.65, 0.45] }),
            transform: [{ scale: halo.interpolate({ inputRange: [0, 0.5, 1], outputRange: reduceMotion ? [1, 1, 1] : [0.85, 1.15, 1] }) }] },
        ]}>
          <Svg width={haloSize} height={haloSize}>
            <Defs>
              <RadialGradient id={`halo${id}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#d4af62" stopOpacity={0.6} />
                <Stop offset="0.4" stopColor="#b4873c" stopOpacity={0.25} />
                <Stop offset="1" stopColor="#b4873c" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width={haloSize} height={haloSize} fill={`url(#halo${id})`} />
          </Svg>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[
          styles.card, { width: cardWidth, opacity: entrance,
            transform: [
              { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 1.15 : 1.85, 1.15] }) },
              { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : 15, 0] }) },
            ] },
        ]}>
          <Image source={require('../../assets/images/triya-logo.png')}
            accessibilityLabel="Triya Group of Hospitality" contentFit="contain"
            onLoad={() => setImageReady(true)} onError={() => setImageReady(true)}
            style={{ width: cardWidth - 48, height: (cardWidth - 48) / 3 }} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#121110', overflow: 'hidden' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
  card: {
    padding: 24, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(252, 211, 77, 0.3)',
    backgroundColor: '#fafaf9', shadowColor: '#d4af62', shadowOpacity: 0.45,
    shadowRadius: 32, shadowOffset: { width: 0, height: 20 }, elevation: 16,
  },
});
