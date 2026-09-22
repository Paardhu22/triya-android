import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

import { borderRadius, colors, spacing } from '@/theme';

export interface GroupedItemProps {
  index: number;
  count: number;
  children: ReactNode;
  /** Left inset of the hairline between rows. */
  dividerInset?: number;
}

/**
 * GroupedItem — lets a virtualized FlatList render as ONE grouped surface:
 * the first row carries the top corners, the last the bottom corners, and
 * rows in between separate with inset hairlines. Long lists keep the clean
 * Surface look without nesting a whole list inside a box.
 */
export function GroupedItem({ index, count, children, dividerInset = spacing.md }: GroupedItemProps) {
  const first = index === 0;
  const last = index === count - 1;
  return (
    <View style={[styles.item, first && styles.first, last && styles.last]}>
      {!first && <View style={[styles.divider, { left: dividerInset }]} />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: colors.background,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  first: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  last: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  divider: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    zIndex: 1,
  },
});
