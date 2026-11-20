import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { OptionCard } from '@/components/OptionCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useNomiTheme();

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
    >
      <View style={styles.topSection}>
        <ScreenHeader
          title="Configurações"
          onBack={() => router.back()}
          showNotifications
          onNotificationsPress={() => router.push('/menu/reminders')}
        />

        <OptionCard
          eyebrow="APARÊNCIA"
          title="Claro / Escuro / Sistema"
          description="Escolha o tema que combina com você"
          onPress={() => router.push('/menu/appearance')}
        />

        <OptionCard
          eyebrow="LEMBRETES"
          title="Notificações e antecedência"
          description="Preferências e permissão do aparelho"
          onPress={() => router.push('/menu/reminders')}
        />

        <OptionCard
          eyebrow="SEUS DADOS"
          title="Privacidade e permissões"
          description="Você escolhe o que guardar"
          onPress={() => router.push('/menu/privacy')}
        />
      </View>

      <View style={styles.bottomActions}>
        <Button
          label="Mudar aparência"
          variant="primary"
          onPress={() => router.push('/menu/appearance')}
        />
        <Button
          label="Privacidade"
          variant="secondary"
          onPress={() => router.push('/menu/privacy')}
        />
        <Button
          label="Sair da conta"
          variant="secondary"
          disabled
        />
        <Text style={[styles.disabledHint, { color: colors.muted }]}>
          Saída da conta depende da integração de sessão (HU-103).
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.screenPadding,
    gap: spacing.blockGap,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    gap: spacing.blockGap,
  },
  bottomActions: {
    gap: spacing.blockGap,
    paddingTop: spacing.md,
  },
  disabledHint: {
    ...typography.caption,
    textAlign: 'center',
  },
});
