import { View, type ViewStyle } from 'react-native';
import AppIcon from '../../assets/design-system/nomi-app-icon-front.svg';

type Props = { size?: number; accessibilityLabel?: string; style?: ViewStyle };

export function NomiAppIcon({ size = 40, accessibilityLabel = 'Nomi', style }: Props) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[{ width: size, height: size, borderRadius: size * 0.21, overflow: 'hidden' }, style]}
    >
      <AppIcon width={size} height={size} />
    </View>
  );
}
