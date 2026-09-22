import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { borderRadius, colors, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';

export interface MonthOption {
  value: string;
  label: string;
}

export interface MonthPickerProps {
  value: string;
  options: MonthOption[];
  onChange: (value: string) => void;
  /** Spinner while the new month's data loads. */
  loading?: boolean;
  /** Sheet title. Defaults to "Billing month". */
  title?: string;
}

/**
 * MonthPicker — the web's month `<Select>` as a pill trigger plus a sheet of
 * months (newest first) with the current choice checked.
 */
export function MonthPicker({
  value,
  options,
  onChange,
  loading = false,
  title = 'Billing month',
}: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => {
          haptics.tap();
          setOpen(true);
        }}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${selected?.label ?? value}`}
      >
        <Icon name="calendar-month-outline" size={17} color={colors.text} />
        <Typography variant="captionMedium" numberOfLines={1}>
          {selected?.label ?? value}
        </Typography>
        {loading ? (
          <ActivityIndicator size="small" color={colors.textSecondary} style={styles.spinner} />
        ) : (
          <Icon name="chevron-down" size={17} color={colors.textSecondary} />
        )}
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={title}
        scrollable={false}
        maxHeightRatio={0.7}
      >
        <FlatList
          data={options}
          keyExtractor={(o) => o.value}
          showsVerticalScrollIndicator={false}
          initialNumToRender={14}
          renderItem={({ item, index }) => {
            const isSelected = item.value === value;
            return (
              <Pressable
                onPress={() => {
                  haptics.selection();
                  setOpen(false);
                  if (!isSelected) onChange(item.value);
                }}
                style={({ pressed }) => [
                  styles.option,
                  index > 0 && styles.optionDivider,
                  pressed && styles.optionPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Typography variant={isSelected ? 'bodySemibold' : 'body'}>{item.label}</Typography>
                {isSelected && <Icon name="check" size={20} color={colors.text} />}
              </Pressable>
            );
          }}
          ListFooterComponent={<View style={styles.listFooter} />}
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    height: 36,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  triggerPressed: {
    backgroundColor: colors.surfacePressed,
  },
  spinner: {
    transform: [{ scale: 0.7 }],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: spacing.xs,
  },
  optionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  optionPressed: {
    backgroundColor: colors.canvas,
  },
  listFooter: {
    height: spacing.xl,
  },
});
