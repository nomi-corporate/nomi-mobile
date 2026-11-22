import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { NomiTabIcon } from './NomiTabIcon';
import { NomiText } from './NomiText';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { palettes } from '@/theme/tokens';

type Props = {
  title: string;
  /** Accessible label of the back button. */
  backLabel?: string;
  /** Where to go when there is no history (deep link). */
  fallbackHref?: Href;
};

export function NomiScreenHeader({ title, backLabel = 'Voltar ao menu', fallbackHref = '/menu' }: Props) {
  const router = useRouter();
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={() => (router.canGoBack() ? router.back() : router.replace(fallbackHref))}
        style={styles.back}
      >
        <NomiTabIcon name="back" color={colors.accent} />
      </Pressable>
      <NomiText accessibilityRole="header" variant="title" style={[styles.title, { color: colors.text }]}>{title}</NomiText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1 },
});
