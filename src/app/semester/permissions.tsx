import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NomiButton, NomiCard, NomiScreenHeader, NomiText } from '@/components';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';

/** Figma 02.01 "Permissões": explains when the microphone is used. Permission is only requested when the user starts recording. */
export default function SemesterPermissionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.lg) }]}
      showsVerticalScrollIndicator={false}
    >
      <NomiScreenHeader title="Permissões" />
      <NomiText variant="supporting" tone="muted">
        O microfone só é usado quando você inicia uma gravação. Você também pode digitar.
      </NomiText>

      <View style={styles.cards}>
        <NomiCard accessibilityLabel="Microfone: permissão pedida só quando você gravar" style={styles.card}>
          <NomiText variant="caption" tone="accent">MICROFONE</NomiText>
          <NomiText variant="heading">Fale suas matérias</NomiText>
          <NomiText variant="supporting" tone="muted">Permissão pedida só quando você gravar.</NomiText>
        </NomiCard>
        <NomiCard accessibilityLabel="Notificações: solicitadas ao ativar lembretes" style={styles.card}>
          <NomiText variant="caption" tone="accent">NOTIFICAÇÕES</NomiText>
          <NomiText variant="heading">Lembretes no momento certo</NomiText>
          <NomiText variant="supporting" tone="muted">Permissão solicitada ao ativar lembretes.</NomiText>
        </NomiCard>
      </View>

      <View style={styles.spacer} />

      <View style={styles.actions}>
        <NomiButton
          label="Continuar com voz"
          accessibilityHint="Abre a tela para falar as matérias do semestre."
          onPress={() => router.push('/semester/listen')}
        />
        <NomiButton
          label="Prefiro digitar"
          variant="secondary"
          onPress={() => router.push('/semester/listen?mode=text')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  cards: { gap: 14 },
  card: { gap: spacing.xs },
  spacer: { flexGrow: 1, minHeight: spacing.lg },
  actions: { gap: spacing.sm },
});
