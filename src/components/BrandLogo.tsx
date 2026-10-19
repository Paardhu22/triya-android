import { Image } from 'expo-image';
export function BrandLogo({ width = 136 }: { width?: number }) {
  return <Image source={require('../../assets/images/triya-logo.png')} contentFit="contain" accessibilityLabel="Triya Group of Hospitality" style={{ width, height: width / 3 }} />;
}
