import { View } from 'react-native';
import { StoredImage } from './StoredImage';
import { Icon } from './Icon';
import type { Property } from '@/types';
import { colors } from '@/theme';
export function PropertyLogo({ property, size = 44 }: { property: Property; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: 9, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    <StoredImage storageKey={property.logoKey} logoPropertyId={property.id} contentFit="contain"
      style={{ width: size - 8, height: size - 8 }} accessibilityLabel={`${property.name} logo`}
      fallback={<Icon name="home-city-outline" size={Math.round(size * 0.5)} color={colors.primary} />} />
  </View>;
}
