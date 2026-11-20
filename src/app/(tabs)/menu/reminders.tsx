import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { NavRow } from '@/components/NavRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  formatDateOnlyReminderDisplay,
  formatLeadTimesDisplay,
  normalizeLocalTimeInput,
  parseLeadTimesInput,
  validateLeadTimesMinutes,
} from '@/features/notifications/api';
import { useReminderPreferences } from '@/features/notifications/useReminderPreferences';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';

export default function RemindersScreen() {
  const router = useRouter();
  const { colors } = useNomiTheme();
  const {
    preferences,
    status,
    isSimulated,
    errorMessage,
    fieldErrors,
    lastSavedMessage,
    reload,
    savePreferences,
    clearFeedback,
  } = useReminderPreferences();

  const [enabled, setEnabled] = useState(false);
  const [leadInput, setLeadInput] = useState('30 minutos antes');
  const [dateOnlyInput, setDateOnlyInput] = useState('Às 09:00 no seu fuso');
  const [localErrors, setLocalErrors] = useState<{
    leadTimesMinutes?: string;
    dateOnlyReminder?: string;
  }>({});
  const [systemSettingsMessage, setSystemSettingsMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (preferences) {
      setEnabled(preferences.enabled);
      setLeadInput(formatLeadTimesDisplay(preferences.leadTimesMinutes));
      setDateOnlyInput(formatDateOnlyReminderDisplay(preferences.dateOnlyReminder));
    }
  }, [preferences]);

  const handleToggleEnabled = () => {
    setEnabled((prev) => !prev);
    clearFeedback();
  };

  const handleOpenSystemSettings = async () => {
    setSystemSettingsMessage(null);
    if (Platform.OS === 'web') {
      setSystemSettingsMessage(
        'No navegador, gerencie a permissão de notificações diretamente nas configurações do site.'
      );
      return;
    }
    try {
      await Linking.openSettings();
    } catch {
      setSystemSettingsMessage(
        'Não foi possível abrir as configurações do sistema automaticamente. Acesse Ajustes > Aplicativos > Nomi no aparelho.'
      );
    }
  };

  const handleSave = async () => {
    clearFeedback();
    setSystemSettingsMessage(null);

    const nextErrors: {
      leadTimesMinutes?: string;
      dateOnlyReminder?: string;
    } = {};

    const parsedLeadTimes = parseLeadTimesInput(leadInput);
    if (!parsedLeadTimes) {
      nextErrors.leadTimesMinutes =
        'Informe até 3 antecedências em minutos separadas por vírgula (ex.: 30 ou 30, 60, 1440).';
    } else {
      const leadError = validateLeadTimesMinutes(parsedLeadTimes);
      if (leadError) {
        nextErrors.leadTimesMinutes = leadError;
      }
    }

    const normalizedTime = normalizeLocalTimeInput(dateOnlyInput);
    if (normalizedTime === undefined) {
      nextErrors.dateOnlyReminder =
        'Informe um horário válido no formato HH:mm (ex.: 09:00) ou deixe vazio para não receber avisos em prazos sem horário.';
    }

    setLocalErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !parsedLeadTimes || normalizedTime === undefined) {
      return;
    }

    await savePreferences({
      enabled,
      leadTimesMinutes: parsedLeadTimes,
      dateOnlyReminder: normalizedTime
        ? {
            daysBefore: preferences?.dateOnlyReminder?.daysBefore ?? 0,
            localTime: normalizedTime,
          }
        : null,
    });
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
    >
      <ScreenHeader
        title="Lembretes"
        onBack={() => {
          clearFeedback();
          router.back();
        }}
        showNotifications
      />

      <Text style={[styles.description, { color: colors.muted }]}>
        Escolha quando receber avisos. A permissão do aparelho é gerenciada nas configurações do
        sistema.
      </Text>

      {status === 'loading' && !preferences ? (
        <View style={styles.stateBox}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.description, { color: colors.muted }]}>
            Carregando preferências de lembretes...
          </Text>
        </View>
      ) : null}

      {status === 'error' && !preferences ? (
        <View style={styles.stateBox}>
          <Text
            accessibilityRole="alert"
            style={[styles.feedbackText, { color: colors.accent }]}
          >
            {errorMessage ?? 'Não foi possível carregar as preferências de lembretes.'}
          </Text>
          <Button
            label="Tentar novamente"
            variant="secondary"
            onPress={() => {
              void reload();
            }}
          />
        </View>
      ) : null}

      <Pressable
        accessibilityRole="switch"
        accessibilityLabel="Lembretes no Nomi"
        accessibilityState={{ checked: enabled }}
        onPress={handleToggleEnabled}
      >
        <Field
          label="LEMBRETES NO NOMI"
          value={enabled ? 'Ativados (toque para desativar)' : 'Desativados (toque para ativar)'}
          readOnly
        />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Permissão do aparelho. Abrir configurações do sistema"
        onPress={() => {
          void handleOpenSystemSettings();
        }}
      >
        <Field
          label="PERMISSÃO DO APARELHO"
          value="Permitida · consultar no sistema"
          readOnly
        />
      </Pressable>

      {systemSettingsMessage ? (
        <Text
          accessibilityRole="alert"
          style={[styles.feedbackText, { color: colors.muted }]}
        >
          {systemSettingsMessage}
        </Text>
      ) : null}

      <Field
        label="ANTECEDÊNCIA PADRÃO"
        value={leadInput}
        onChangeText={(text) => {
          setLeadInput(text);
          if (localErrors.leadTimesMinutes) {
            setLocalErrors((prev) => ({ ...prev, leadTimesMinutes: undefined }));
          }
        }}
        error={localErrors.leadTimesMinutes ?? fieldErrors.leadTimesMinutes}
      />

      <Field
        label="PRAZOS SEM HORÁRIO"
        value={dateOnlyInput}
        onChangeText={(text) => {
          setDateOnlyInput(text);
          if (localErrors.dateOnlyReminder) {
            setLocalErrors((prev) => ({ ...prev, dateOnlyReminder: undefined }));
          }
        }}
        error={localErrors.dateOnlyReminder ?? fieldErrors.dateOnlyReminder}
      />

      {status === 'conflict' ? (
        <View style={styles.stateBox}>
          <Text
            accessibilityRole="alert"
            style={[styles.feedbackText, { color: colors.accent }]}
          >
            {errorMessage ??
              'As preferências foram modificadas em outra sessão (HTTP 412). Recarregue os valores atuais antes de salvar.'}
          </Text>
          <Button
            label="Recarregar versão atual"
            variant="secondary"
            onPress={() => {
              void reload();
            }}
          />
        </View>
      ) : null}

      {errorMessage && status !== 'conflict' ? (
        <Text
          accessibilityRole="alert"
          style={[styles.feedbackText, { color: colors.accent }]}
        >
          {errorMessage}
        </Text>
      ) : null}

      {lastSavedMessage ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.feedbackText, { color: colors.accent }]}
        >
          {lastSavedMessage}
        </Text>
      ) : null}

      <Button
        label="Salvar preferências"
        variant="primary"
        loading={status === 'saving'}
        disabled={status === 'loading' || !preferences}
        onPress={() => {
          void handleSave();
        }}
      />

      <NavRow
        title="Cancelar"
        subtitle="Voltar sem alterar os dados"
        onPress={() => {
          clearFeedback();
          router.back();
        }}
      />

      {isSimulated ? (
        <Text style={[styles.simulationNote, { color: colors.muted }]}>
          Adapter simulado ativo (EXPO_PUBLIC_NOTIFICATIONS_API_URL não configurada) · ETag atual:{' '}
          {preferences ? `"${preferences.version}"` : '-'}.
        </Text>
      ) : null}
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
  stateBox: {
    gap: spacing.sm,
  },
  feedbackText: {
    ...typography.caption,
  },
  simulationNote: {
    ...typography.caption,
  },
});
