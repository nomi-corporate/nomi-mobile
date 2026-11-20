import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { NavRow } from '@/components/NavRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SIMULATED_REMINDERS } from '@/features/profile/mock';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';

export default function RemindersScreen() {
  const router = useRouter();
  const { colors } = useNomiTheme();

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
    >
      <ScreenHeader
        title="Lembretes"
        onBack={() => router.back()}
        showNotifications
      />

      <Text style={[styles.description, { color: colors.muted }]}>
        Escolha quando receber avisos. A permissão do aparelho é gerenciada nas configurações do
        sistema.
      </Text>

      <Field
        label="LEMBRETES NO NOMI"
        value={SIMULATED_REMINDERS.enabledLabel}
        readOnly
      />

      <Field
        label="PERMISSÃO DO APARELHO"
        value={SIMULATED_REMINDERS.systemPermissionLabel}
        readOnly
      />

      <Field
        label="ANTECEDÊNCIA PADRÃO"
        value={SIMULATED_REMINDERS.leadTimeLabel}
        readOnly
      />

      <Field
        label="PRAZOS SEM HORÁRIO"
        value={SIMULATED_REMINDERS.dateOnlyTimeLabel}
        readOnly
      />

      <Button
        label="Salvar preferências"
        variant="primary"
        onPress={() => router.back()}
      />

      <NavRow
        title="Cancelar"
        subtitle="Voltar sem alterar os dados"
        onPress={() => router.back()}
      />

      <Text style={[styles.simulationNote, { color: colors.muted }]}>
        Dados simulados · integração com notification-preferences na próxima etapa.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.screenPadding,
    gap: spacing.blockGap,
    flexGrow: 1,
  },
  description: {
    ...typography.caption,
  },
  simulationNote: {
    ...typography.caption,
  },
});
