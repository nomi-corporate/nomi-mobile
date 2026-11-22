import { StyleSheet, View, type ViewProps } from 'react-native';
import { palettes } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';

type Props = ViewProps & { tone?: 'surface' | 'tint' | 'success' | 'error'; padding?: number };

export function NomiCard({ tone = 'surface', padding = 20, style, ...props }: Props) {
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const backgroundColor = tone === 'tint' ? colors.tint : tone === 'success' ? colors.successBackground : tone === 'error' ? colors.errorBackground : colors.surface;
  return <View {...props} style={[styles.card, { backgroundColor, borderColor: colors.border, padding }, style]} />;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 20 } });
