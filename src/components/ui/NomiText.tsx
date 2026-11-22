import { Text, type TextProps } from 'react-native';
import { palettes } from '@/theme/tokens';
import { typography, type NomiTextVariant } from '@/theme/typography';
import { useNomiTheme } from '@/theme/NomiThemeProvider';

export type NomiTextColor = 'text' | 'muted' | 'accent' | 'error' | 'success';

type Props = TextProps & {
  variant?: NomiTextVariant;
  tone?: NomiTextColor;
};

export function NomiText({ variant = 'body', tone = 'text', style, ...props }: Props) {
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  return <Text {...props} style={[typography[variant], { color: colors[tone] }, style]} />;
}
