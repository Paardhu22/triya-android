import { Pressable, View, StyleSheet } from 'react-native';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import type { PropertyStats } from '@/mocks';
import { colors, spacing, borderRadius } from '@/theme';
import type { Property } from '@/types';

export interface PropertyCardProps {
  property: Property;
  stats?: PropertyStats;
  selected?: boolean;
  onPress: () => void;
}

/**
 * PropertyCard component.
 *
 * A property choice card for the select-property screen: name, address and
 * live occupancy. Flat properties count units (rooms); PGs count beds.
 *
 * @example
 * <PropertyCard property={property} stats={stats} onPress={() => choose(property)} />
 */
export function PropertyCard({ property, stats, selected = false, onPress }: PropertyCardProps) {
  const totalUnits = property.isFlat ? stats?.totalRooms : stats?.totalBeds;
  const occupancy =
    stats && totalUnits ? Math.round((stats.occupiedBeds / totalUnits) * 100) : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={property.name}
      accessibilityState={{ selected }}
    >
      <View style={styles.iconBox}>
        <Icon name="home-city-outline" size={22} color={colors.primary} />
      </View>

      <View style={styles.body}>
        <Typography variant="bodyMedium" numberOfLines={1}>
          {property.name}
        </Typography>
        <Typography variant="small" color="textSecondary" numberOfLines={1}>
          {[property.address, property.city].filter(Boolean).join(', ')}
        </Typography>
        {stats && (
          <Typography variant="small" color="textTertiary" numberOfLines={1}>
            {property.isFlat
              ? `${stats.occupiedBeds}/${stats.totalRooms} flats occupied`
              : `${stats.occupiedBeds}/${stats.totalBeds} beds occupied`}
            {occupancy !== null ? ` · ${occupancy}%` : ''}
          </Typography>
        )}
      </View>

      <Icon
        name={selected ? 'check-circle' : 'chevron-right'}
        size={22}
        color={selected ? colors.primary : colors.textTertiary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
});
