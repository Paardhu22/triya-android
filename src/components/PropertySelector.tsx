import { useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { colors, spacing, borderRadius } from '@/theme';
import type { Property } from '@/types';

export interface PropertySelectorProps {
  properties: Property[];
  selectedId: string | null;
  onSelect: (property: Property) => void;
}

/**
 * PropertySelector component.
 *
 * The header control for switching the active property (the mobile
 * counterpart of the web top bar's property picker). Renders the current
 * property name; tapping opens a bottom sheet with every property the
 * signed-in user can manage. Hides its chevron when there is no choice.
 *
 * @example
 * <PropertySelector properties={properties} selectedId={property.id} onSelect={switchProperty} />
 */
export function PropertySelector({ properties, selectedId, onSelect }: PropertySelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = properties.find((p) => p.id === selectedId) ?? null;
  const canSwitch = properties.length > 1;

  return (
    <>
      <Pressable
        onPress={() => canSwitch && setOpen(true)}
        disabled={!canSwitch}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        accessibilityRole="button"
        accessibilityLabel="Switch property"
      >
        <Icon name="home-city-outline" size={18} color={colors.primary} />
        <Typography variant="captionMedium" numberOfLines={1} style={styles.triggerLabel}>
          {selected?.name ?? 'Select property'}
        </Typography>
        {canSwitch && <Icon name="chevron-down" size={18} color={colors.textSecondary} />}
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title="Switch property">
        <View style={styles.list}>
          {properties.map((property) => {
            const isSelected = property.id === selectedId;
            return (
              <Pressable
                key={property.id}
                onPress={() => {
                  setOpen(false);
                  if (!isSelected) onSelect(property);
                }}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  pressed && !isSelected && styles.optionPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.optionText}>
                  <Typography variant="bodyMedium" numberOfLines={1}>
                    {property.name}
                  </Typography>
                  {(property.address || property.city) && (
                    <Typography variant="caption" color="textSecondary" numberOfLines={1}>
                      {[property.address, property.city].filter(Boolean).join(', ')}
                    </Typography>
                  )}
                </View>
                {isSelected && <Icon name="check-circle" size={22} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2,
    height: 38,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    maxWidth: 230,
  },
  triggerPressed: {
    opacity: 0.8,
  },
  triggerLabel: {
    flexShrink: 1,
  },
  list: {
    gap: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionPressed: {
    backgroundColor: colors.surfacePressed,
  },
  optionText: {
    flex: 1,
    gap: 1,
  },
});
