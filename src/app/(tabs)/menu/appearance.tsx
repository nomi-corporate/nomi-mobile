import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiButton, NomiFeedback, NomiOptionCard, NomiScreenHeader, NomiText } from '@/components';
import { useProfile } from '@/features/profile/ProfileProvider';

const options = [
  { eyebrow: '01', title: 'Claro', detail: 'Fundos suaves, contraste lilás', value: 'light' },
  { eyebrow: '02', title: 'Escuro', detail: 'Tons profundos, luz delicada', value: 'dark' },
  { eyebrow: '03', title: 'Acompanhar o sistema', detail: 'Segue a preferência do dispositivo', value: 'system' },
] as const;

export default function AppearanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme, mode } = useNomiTheme();
  const colors = palettes[colorScheme];
  const { profile, loading, saving, error, saveTheme, reload } = useProfile();
  const disabled = loading || saving || !profile;

  const status = saving
    ? 'Salvando preferência…'
    : loading
      ? 'Carregando preferência…'
      : profile
        ? undefined
        : 'Carregue seu perfil para salvar a aparência.';

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/menu/profile'));

  return <ScrollView
    style={{ backgroundColor: colors.background }}
    contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: spacing.xl }]}
    showsVerticalScrollIndicator={false}
  >
    <NomiScreenHeader title="Aparência" backLabel="Voltar" fallbackHref="/menu/profile" />

    <NomiText variant="supporting" tone="muted">Sua preferência de aparência será salva no perfil.</NomiText>

    <View accessibilityRole="radiogroup" accessibilityLabel="Aparência do aplicativo" style={styles.options}>
      {options.map((option) => (
        <NomiOptionCard
          key={option.value}
          eyebrow={option.eyebrow}
          title={option.title}
          detail={option.detail}
          selected={mode === option.value}
          disabled={disabled}
          onPress={() => void saveTheme(option.value)}
        />
      ))}
    </View>

    {status ? <NomiText variant="caption" tone="muted" accessibilityLiveRegion="polite">{status}</NomiText> : null}

    {error ? <>
      <NomiFeedback kind="error" title="Não foi possível salvar" message={error} />
      <NomiButton label="Tentar novamente" variant="secondary" onPress={() => void reload()} />
    </> : null}

    <View style={styles.spacer} />

    <NomiButton label="Concluir" onPress={goBack} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, gap: 14 },
  options: { gap: 14 },
  spacer: { flex: 1 },
});
