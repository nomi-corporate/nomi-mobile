import { View, type ViewStyle } from 'react-native';
import LogoDark from '../../assets/design-system/logo-dark-122.svg';
import LogoLight from '../../assets/design-system/logo-light-122.svg';
import LogoDarkCompact from '../../assets/design-system/logo-dark-110.svg';
import LogoLightCompact from '../../assets/design-system/logo-light-110.svg';
import { useNomiTheme } from '@/theme/NomiThemeProvider';

type Props = { width?: number; accessibilityLabel?: string; style?: ViewStyle };

export function NomiLogo({ width = 122, accessibilityLabel = 'Nomi', style }: Props) {
  const { colorScheme } = useNomiTheme();
  const dark = colorScheme === 'dark';
  const Logo = width === 110 ? (dark ? LogoDarkCompact : LogoLightCompact) : (dark ? LogoDark : LogoLight);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={style}>
      <Logo width={width} height={width * 40 / 122} />
    </View>
  );
}
