import type { ReactNode } from 'react';
import { Pressable, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Typography } from '@/components/Typography';
import { colors, spacing } from '@/theme';

export interface SectionHeaderProps {
  /** Uppercase kicker — the web's "CAPACITY OVERVIEW" section label. */
  title: string;
  /** Right-aligned meta, e.g. "12 Rooms Total" or "82% Realization". */
  meta?: string | ReactNode;
  /** Makes the meta a link-style action ("See all"). */
  onMetaPress?: () => void;
  /** Muted sentence-case line under the kicker. */
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * SectionHeader component.
 *
 * The Swiss section label that sits above a Surface: uppercase, tracked,
 * muted, with an optional right-hand figure. Mirrors the web dashboard's
 * `text-xs font-semibold tracking-wider uppercase` headers.
 */
export function SectionHeader({ title, meta, onMetaPress, subtitle, style }: SectionHeaderProps) {
  const metaNode =
    typeof meta === 'string' ? (
      <Typography
        variant="small"
        colorValue={onMetaPress ? colors.text : colors.textSecondary}
        style={onMetaPress ? styles.link : undefined}
        numberOfLines={1}
      >
        {meta}
      </Typography>
    ) : (
      meta
    );

  return (
    <View style={[styles.row, style]}>
      <View style={styles.title}>
        <Typography variant="overline" color="textSecondary" numberOfLines={1}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="small" color="textTertiary" numberOfLines={2}>
            {subtitle}
          </Typography>
        ) : null}
      </View>
      {metaNode !== undefined &&
        (onMetaPress ? (
          <Pressable onPress={onMetaPress} hitSlop={10} accessibilityRole="button">
            {metaNode}
          </Pressable>
        ) : (
          metaNode
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: 4,
    marginBottom: spacing.sm + 2,
  },
  title: {
    flexShrink: 1,
    gap: 2,
  },
  link: {
    fontFamily: 'Inter_600SemiBold',
  },
});
