/**
 * The dashboard's "technical blueprint" visual kit, ported from the web
 * dashboard page: grid-paper zones with FIG.NN annotations, mono `>` kickers,
 * giant tabular figures, pseudo-code footers and uppercase enum chips.
 *
 * Scoped to the dashboard — the rest of the app uses the plain warm design
 * system, exactly like the web.
 */

import { memo, useEffect, useState, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Typography } from '@/components';
import { useCountUp } from '@/hooks';
import { colors, fontFamilies, spacing, borderRadius } from '@/theme';

/** The four blueprint accents used by the web dashboard (Tailwind tones). */
export const BLUEPRINT_ACCENTS = {
  blue: {
    line: 'rgba(14, 165, 233, 0.08)',
    bg: 'rgba(14, 165, 233, 0.015)',
    bar: '#3B82F6',
    track: 'rgba(59, 130, 246, 0.10)',
  },
  purple: {
    line: 'rgba(168, 85, 247, 0.08)',
    bg: 'rgba(168, 85, 247, 0.015)',
    bar: '#A855F7',
    track: 'rgba(168, 85, 247, 0.10)',
  },
  emerald: {
    line: 'rgba(16, 185, 129, 0.08)',
    bg: 'rgba(16, 185, 129, 0.015)',
    bar: '#10B981',
    track: 'rgba(16, 185, 129, 0.10)',
  },
  rose: {
    line: 'rgba(244, 63, 94, 0.08)',
    bg: 'rgba(244, 63, 94, 0.015)',
    bar: '#F43F5E',
    track: 'rgba(244, 63, 94, 0.10)',
  },
} as const;

export type BlueprintAccent = keyof typeof BLUEPRINT_ACCENTS;

const GRID_CELL = 14;

/** 14px grid-paper backdrop (the web's blueprint backgroundImage). */
export const BlueprintGrid = memo(function BlueprintGrid({
  accent,
}: {
  accent: BlueprintAccent;
}) {
  const { line, bg } = BLUEPRINT_ACCENTS[accent];
  const [size, setSize] = useState({ width: 0, height: 0 });
  const cols = Math.floor(size.width / GRID_CELL);
  const rows = Math.floor(size.height / GRID_CELL);

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: bg }]}
      pointerEvents="none"
      onLayout={(e) => setSize(e.nativeEvent.layout)}
    >
      {Array.from({ length: cols }, (_, i) => (
        <View
          key={`v${i}`}
          style={[styles.gridLineV, { left: (i + 1) * GRID_CELL, backgroundColor: line }]}
        />
      ))}
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={`h${i}`}
          style={[styles.gridLineH, { top: (i + 1) * GRID_CELL, backgroundColor: line }]}
        />
      ))}
    </View>
  );
});

/** Mono `> LABEL` kicker with an optional FIG.NN annotation on the right. */
export function Kicker({ label, fig }: { label: string; fig?: string }) {
  return (
    <View style={styles.kickerRow}>
      <Typography variant="mono" color="textSecondary" style={styles.kickerText}>
        {'> '}
        {label.toUpperCase()}
      </Typography>
      {fig !== undefined && <FigTag fig={fig} />}
    </View>
  );
}

export function FigTag({ fig }: { fig: string }) {
  return (
    <Typography variant="mono" color="textTertiary" style={styles.figText}>
      {fig}
    </Typography>
  );
}

/** Inline mono emphasis inside a description line (the web's `code` chips). */
export function CodeText({ children }: { children: ReactNode }) {
  return (
    <Typography variant="mono" style={styles.codeText}>
      {children}
    </Typography>
  );
}

/** Small explanatory line under a kicker. */
export function Desc({ children }: { children: ReactNode }) {
  return (
    <Typography variant="small" color="textSecondary" style={styles.descText}>
      {children}
    </Typography>
  );
}

/** Pseudo-code hairline footer, e.g. `status = "active"`. */
function CodeFooter({ left, right }: { left: string; right?: string }) {
  return (
    <View style={styles.codeFooter}>
      <Typography variant="mono" color="textTertiary" style={styles.footerText}>
        {left}
      </Typography>
      {right !== undefined ? (
        <Typography variant="mono" color="textTertiary" style={styles.footerText}>
          {right}
        </Typography>
      ) : (
        <View style={styles.footerDots}>
          <View style={styles.footerDot} />
          <View style={styles.footerDot} />
        </View>
      )}
    </View>
  );
}

/** Progress bar that animates its fill on mount / data change. */
export function AnimatedBar({
  pct,
  accent,
  height = 5,
}: {
  pct: number;
  accent: BlueprintAccent;
  height?: number;
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(
        150,
        withTiming(clamped, { duration: 600, easing: Easing.bezier(0.2, 0, 0, 1) }),
      ),
    );
  }, [clamped, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.get()}%` }));

  return (
    <View
      style={[styles.barTrack, { height, backgroundColor: BLUEPRINT_ACCENTS[accent].track }]}
    >
      <Animated.View
        style={[styles.barFill, { backgroundColor: BLUEPRINT_ACCENTS[accent].bar }, fillStyle]}
      />
    </View>
  );
}

export interface BlueprintStatCardProps {
  /** FIG.NN annotation in the grid zone. */
  fig: string;
  /** Mono kicker under the grid zone (rendered uppercase, `>`-prefixed). */
  kicker: string;
  /** Raw figure — animated with a count-up, then formatted. */
  rawValue: number;
  /** Formats the in-flight counter value. Defaults to String. */
  format?: (value: number) => string;
  /** Font size of the big figure. Default 30 (use ~24 for money). */
  valueSize?: number;
  accent: BlueprintAccent;
  /** Renders an animated occupancy bar at the bottom of the grid zone. */
  progressPct?: number;
  /** Explanatory line — compose with CodeText for mono emphasis. */
  description: ReactNode;
  /** Pseudo-code footer, e.g. `status = "active"`. */
  footer: string;
}

/**
 * The web dashboard's blueprint stat card: grid-paper figure zone on top,
 * mono kicker + description + pseudo-code footer below.
 */
export function BlueprintStatCard({
  fig,
  kicker,
  rawValue,
  format = String,
  valueSize = 30,
  accent,
  progressPct,
  description,
  footer,
}: BlueprintStatCardProps) {
  const counted = useCountUp(rawValue);

  return (
    <View style={styles.card}>
      <View style={styles.figureZone}>
        <BlueprintGrid accent={accent} />
        <View style={styles.figTag}>
          <FigTag fig={fig} />
        </View>
        <Typography
          style={[styles.figure, { fontSize: valueSize }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {format(counted)}
        </Typography>
        {progressPct !== undefined && (
          <View style={styles.figureBar}>
            <AnimatedBar pct={progressPct} accent={accent} />
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Kicker label={kicker} />
        <Desc>{description}</Desc>
        <CodeFooter left={footer} />
      </View>
    </View>
  );
}

export interface BlueprintPanelProps {
  fig: string;
  kicker: string;
  accent: BlueprintAccent;
  footerLeft: string;
  footerRight: string;
  children: ReactNode;
}

/** Bordered panel with a grid-paper header strip — the recent-activity cards. */
export function BlueprintPanel({
  fig,
  kicker,
  accent,
  footerLeft,
  footerRight,
  children,
}: BlueprintPanelProps) {
  return (
    <View style={styles.card}>
      <View style={styles.panelHeader}>
        <BlueprintGrid accent={accent} />
        <Typography variant="mono" style={styles.panelKicker}>
          {'> '}
          {kicker.toUpperCase()}
        </Typography>
        <FigTag fig={fig} />
      </View>
      <View style={styles.panelBody}>
        {children}
        <CodeFooter left={footerLeft} right={footerRight} />
      </View>
    </View>
  );
}

/** Uppercase mono enum chip (PAID / OVERDUE / HIGH …) with a tinted border. */
export function EnumChip({
  label,
  color,
  softColor,
}: {
  label: string;
  color: string;
  softColor: string;
}) {
  return (
    <View style={[styles.enumChip, { backgroundColor: softColor, borderColor: `${color}33` }]}>
      <Typography variant="mono" colorValue={color} style={styles.enumChipText}>
        {label.toUpperCase().replace(/\s+/g, '_')}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  figureZone: {
    height: 92,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  figTag: {
    position: 'absolute',
    top: spacing.sm + 2,
    right: spacing.sm + 2,
  },
  figure: {
    fontFamily: fontFamilies.bold,
    color: colors.text,
    letterSpacing: -1,
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
  },
  figureBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.sm + 2,
  },
  cardBody: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  kickerText: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
  },
  figText: {
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 0.8,
  },
  codeText: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.text,
  },
  descText: {
    lineHeight: 16,
  },
  codeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 0.4,
  },
  footerDots: {
    flexDirection: 'row',
    gap: 3,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
  },
  barTrack: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  panelHeader: {
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  panelKicker: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
    color: colors.text,
    fontWeight: 'bold',
  },
  panelBody: {
    padding: spacing.md,
    gap: spacing.sm + 4,
  },
  enumChip: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  enumChipText: {
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 0.5,
  },
});
