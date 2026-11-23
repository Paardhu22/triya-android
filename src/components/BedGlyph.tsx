import { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { BED_VISUAL_STATUS_META, type BedVisualStatus } from '@/constants';
import { colors, fontFamilies } from '@/theme';

export interface BedGlyphProps {
  width: number;
  label: string;
  status: BedVisualStatus;
}

/** Shared schematic bed, rendered inside an SVG in the floor plan or room view. */
export function BedGlyph({ width, label, status }: BedGlyphProps) {
  const height = width * 1.5;
  const { color } = BED_VISUAL_STATUS_META[status];

  return (
    <G>
      <Rect x={-2} y={-3} width={width + 4} height={9} rx={2} fill="#b6a18d" />
      <Rect width={width} height={height} rx={4} fill="#fff" stroke="#b8bdc7" />
      <Rect x={5} y={5} width={width - 10} height={height * 0.2} rx={3} fill="#f9fafb" stroke="#dce0e6" strokeWidth={0.8} />
      <Rect x={2} y={height * 0.4} width={width - 4} height={height * 0.6 - 2} rx={3} fill={color} fillOpacity={0.16} />
      <Path d={`M 2 ${height * 0.4} h ${width - 4}`} stroke={color} strokeWidth={4} />
      <Circle cx={width / 2} cy={height * 0.7} r={3} fill={color} />
      <SvgText x={width / 2} y={height + 13} textAnchor="middle" fontSize={11} fontFamily={fontFamilies.semibold} fill={colors.textSecondary}>
        {label}
      </SvgText>
    </G>
  );
}
