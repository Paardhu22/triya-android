import { useEffect, useMemo, useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Typography } from '@/components/Typography';
import { colors, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';

const EASE = Easing.bezier(0.2, 0, 0, 1);

/** Axis ticks drop trailing zeros so they never wrap: "₹25.00L" → "₹25L". */
const tidy = (label: string) => label.replace(/\.0+(?=[A-Za-z]|$)/, '').replace(/(\.\d)0(?=[A-Za-z])/, '$1');

/** Round an axis maximum up to a "nice" number (1, 2, 2.5, 5 × 10ⁿ). */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = 10 ** exp;
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (value <= step * base) return step * base;
  }
  return 10 * base;
}

// ---------------------------------------------------------------------------
// Vertical bars (grouped series per column)
// ---------------------------------------------------------------------------

export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

export interface BarDatum {
  label: string;
  values: Record<string, number>;
}

function GrowBar({
  height,
  color,
  width,
  delay,
  dimmed,
}: {
  height: number;
  color: string;
  width: number;
  delay: number;
  dimmed: boolean;
}) {
  const h = useSharedValue(0);
  const o = useSharedValue(1);
  useEffect(() => {
    h.set(withDelay(delay, withTiming(height, { duration: 620, easing: EASE })));
  }, [delay, h, height]);
  useEffect(() => {
    o.set(withTiming(dimmed ? 0.28 : 1, { duration: 180 }));
  }, [dimmed, o]);
  const style = useAnimatedStyle(() => ({ height: h.get(), opacity: o.get() }));
  return (
    <Animated.View
      style={[{ width, backgroundColor: color, borderTopLeftRadius: 3, borderTopRightRadius: 3 }, style]}
    />
  );
}

export interface BarChartProps {
  data: BarDatum[];
  series: BarSeries[];
  /** Formats axis ticks and the selected values (e.g. formatINRCompact). */
  format: (value: number) => string;
  /** Formats the selected column's values in the readout (e.g. formatINR). */
  formatValue?: (value: number) => string;
  height?: number;
  /** Column selected on mount. Defaults to the last (current) one. */
  initialIndex?: number;
}

/**
 * BarChart — the web's grouped "Collections against expenses" chart. Columns
 * are tappable: the chosen month's figures read out above the plot and the
 * other months dim, so every number is reachable without a hover.
 */
export function BarChart({
  data,
  series,
  format,
  formatValue = format,
  height = 168,
  initialIndex,
}: BarChartProps) {
  const [selected, setSelected] = useState(initialIndex ?? data.length - 1);
  const max = useMemo(
    () => niceMax(Math.max(0, ...data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0)))),
    [data, series],
  );
  const ticks = [max, max / 2, 0];
  const barWidth = series.length > 1 ? 11 : 18;
  const current = data[selected];

  return (
    <View style={styles.chart}>
      {/* Readout */}
      <View style={styles.readout}>
        <Typography variant="overline" color="textSecondary">
          {current?.label ?? ''}
        </Typography>
        <View style={styles.readoutValues}>
          {series.map((s) => (
            <View key={s.key} style={styles.readoutItem}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Typography variant="small" color="textSecondary">
                {s.label}
              </Typography>
              <Typography variant="numberSmall">
                {formatValue(current?.values[s.key] ?? 0)}
              </Typography>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.plotRow}>
        {/* Y axis */}
        <View style={[styles.axis, { height }]}>
          {ticks.map((t, i) => (
            <Typography key={i} variant="small" color="textTertiary" style={styles.tick}>
              {tidy(format(t))}
            </Typography>
          ))}
        </View>

        <View style={[styles.plot, { height }]}>
          {/* Gridlines */}
          {ticks.map((_, i) => (
            <View key={i} style={[styles.grid, { top: (height * i) / (ticks.length - 1) }]} />
          ))}
          <View style={styles.columns}>
            {data.map((d, i) => (
              <Pressable
                key={d.label + i}
                style={styles.column}
                onPress={() => {
                  if (i !== selected) haptics.selection();
                  setSelected(i);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${d.label}: ${series
                  .map((s) => `${s.label} ${formatValue(d.values[s.key] ?? 0)}`)
                  .join(', ')}`}
              >
                <View style={styles.barGroup}>
                  {series.map((s, si) => (
                    <GrowBar
                      key={s.key}
                      height={Math.max(2, ((d.values[s.key] ?? 0) / max) * height)}
                      color={s.color}
                      width={barWidth}
                      delay={i * 50 + si * 30}
                      dimmed={i !== selected}
                    />
                  ))}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* X labels */}
      <View style={styles.xRow}>
        <View style={styles.axisSpacer} />
        {data.map((d, i) => (
          <Typography
            key={d.label + i}
            variant={i === selected ? 'smallMedium' : 'small'}
            colorValue={i === selected ? colors.text : colors.textTertiary}
            style={styles.xLabel}
            numberOfLines={1}
          >
            {data.length > 8 ? d.label.slice(0, 1) : d.label}
          </Typography>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Horizontal stacked bars (occupied vs available)
// ---------------------------------------------------------------------------

export interface StackRow {
  label: string;
  occupied: number;
  available: number;
}

function Segment({ flex, color, delay }: { flex: number; color: string; delay: number }) {
  const f = useSharedValue(0);
  useEffect(() => {
    f.set(withDelay(delay, withTiming(flex, { duration: 650, easing: EASE })));
  }, [delay, f, flex]);
  const style = useAnimatedStyle(() => ({ flexGrow: f.get() }));
  return <Animated.View style={[styles.segment, { backgroundColor: color }, style]} />;
}

/**
 * OccupancyBars — the web's horizontal stacked "occupied / available" chart.
 * Each bar's full length is that group's capacity; the tip carries
 * `occupied/total` so no figure hides behind a hover.
 */
export function OccupancyBars({ rows }: { rows: StackRow[] }) {
  return (
    <View style={styles.stackList}>
      {rows.map((r, i) => {
        const total = r.occupied + r.available;
        return (
          <View key={r.label} style={styles.stackRow}>
            <Typography variant="small" color="textSecondary" style={styles.stackLabel} numberOfLines={1}>
              {r.label}
            </Typography>
            <View style={styles.stackTrack}>
              {r.occupied > 0 && <Segment flex={r.occupied} color={colors.chart1} delay={i * 60} />}
              {r.available > 0 && (
                <Segment flex={r.available} color={colors.chart4} delay={i * 60 + 40} />
              )}
            </View>
            <Typography variant="numberSmall" color="textSecondary" style={styles.stackTip}>
              {r.occupied}/{total}
            </Typography>
          </View>
        );
      })}
      <View style={styles.legend}>
        <LegendItem color={colors.chart1} label="Occupied" />
        <LegendItem color={colors.chart4} label="Available" />
      </View>
    </View>
  );
}

export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Typography variant="small" color="textSecondary">
        {label}
      </Typography>
    </View>
  );
}

const AXIS_WIDTH = 46;

const styles = StyleSheet.create({
  chart: {
    gap: spacing.sm,
  },
  readout: {
    gap: 6,
  },
  readoutValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: 4,
  },
  readoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  plotRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  axis: {
    width: AXIS_WIDTH,
    justifyContent: 'space-between',
    paddingRight: 6,
  },
  tick: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'right',
    marginVertical: -6,
    fontVariant: ['tabular-nums'],
  },
  plot: {
    flex: 1,
  },
  grid: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  columns: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  xRow: {
    flexDirection: 'row',
  },
  axisSpacer: {
    width: AXIS_WIDTH,
  },
  xLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
  },
  stackList: {
    gap: spacing.sm + 4,
  },
  stackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  stackLabel: {
    width: 76,
  },
  stackTrack: {
    flex: 1,
    height: 14,
    flexDirection: 'row',
    gap: 2,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
  },
  segment: {
    height: '100%',
    flexBasis: 0,
  },
  stackTip: {
    minWidth: 44,
    textAlign: 'right',
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingLeft: 76 + spacing.sm + 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
