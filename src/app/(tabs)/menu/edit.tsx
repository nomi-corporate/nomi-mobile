import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { NavRow } from '@/components/NavRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SIMULATED_PROFILE } from '@/features/profile/mock';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useNomiTheme();

  const [displayName, setDisplayName] = useState(SIMULATED_PROFILE.displayName);
  const [locale, setLocale] = useState(SIMULATED_PROFILE.localeLabel);
  const [timeZone, setTimeZone] = useState(SIMULATED_PROFILE.timeZone);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
    >
      <ScreenHeader
        title="Editar perfil"
        onBack={() => router.back()}
        showNotifications
        onNotificationsPress={() => router.push('/menu/reminders')}
      />

      <Text style={[styles.description, { color: colors.muted }]}>
        Seu nome, idioma e fuso. Alterar o fuso não muda os horários dos compromissos.
      </Text>

      <Field
        label="NOME"
        value={displayName}
        onChangeText={setDisplayName}
      />

      <Field
        label="E-MAIL · SOMENTE LEITURA"
        value={SIMULATED_PROFILE.email}
        readOnly
      />

      <Field
        label="IDIOMA"
        value={locale}
        onChangeText={setLocale}
      />

      <Field
        label="FUSO HORÁRIO"
        value={timeZone}
        onChangeText={setTimeZone}
      />

      <Button
        label="Salvar alterações"
        variant="primary"
        onPress={() => router.back()}
      />

      <NavRow
        title="Cancelar"
        subtitle="Voltar sem alterar os dados"
        onPress={() => router.back()}
      />

      <Text style={[styles.simulationNote, { color: colors.muted }]}>
        Dados simulados · persistência via PATCH /me na próxima etapa.
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
