import { View, type ViewStyle } from 'react-native';
import CompactMark from '../../assets/design-system/nomi-mark-compact.svg';

type Props = { size?: number; accessibilityLabel?: string; style?: ViewStyle };

export function NomiCompactMark({ size = 40, accessibilityLabel = 'Símbolo Nomi de três pintas', style }: Props) {
  return <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={style}><CompactMark width={size} height={size} /></View>;
}
