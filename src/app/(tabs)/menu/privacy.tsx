import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiButton, NomiOptionCard, NomiScreenHeader, NomiText } from '@/components';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/menu/profile'));

  return <ScrollView
    style={{ backgroundColor: colors.background }}
    contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(112, insets.bottom + 80) }]}
    showsVerticalScrollIndicator={false}
  >
    <NomiScreenHeader title="Privacidade" backLabel="Voltar" fallbackHref="/menu/profile" />

    <NomiText variant="supporting" tone="muted">Controle o uso e o compartilhamento dos seus dados.</NomiText>

    <View style={styles.options}>
      <NomiOptionCard eyebrow="CAPTURA" title="Microfone sob seu controle" detail="A gravação só começa quando você toca." />
      <NomiOptionCard eyebrow="COMPARTILHAMENTO" title="Privado por padrão" detail="Você confirma cada envio ao grupo." />
      <NomiOptionCard eyebrow="CONTA" title="Exportar ou excluir seus dados" detail="Ainda não disponível no app." disabled={true} />
    </View>

    <View style={styles.spacer} />

    <NomiButton label="Voltar aos ajustes" onPress={goBack} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, gap: 14 },
  options: { gap: 14 },
  spacer: { flex: 1 },
});
