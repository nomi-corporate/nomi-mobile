import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiButton, NomiFeedback, NomiOptionCard, NomiScreenHeader, NomiText } from '@/components';
import {
  DEFAULT_PREFERENCES,
  ensurePermission,
  getExactAlarmAccess,
  loadReminderPreferences,
  requestExactAlarmAccess,
  requestReminderPermission,
  saveReminderPreferences,
  sendTestReminder,
  type ReminderPermission,
  type ReminderPreferences,
} from '@/features/reminders';

const enabledOptions = [
  { eyebrow: 'ATIVADOS', title: 'Receber lembretes', value: true },
  { eyebrow: 'DESATIVADOS', title: 'Não receber lembretes', value: false },
] as const;

const leadOptions = [
  { eyebrow: '01', title: '15 minutos antes', value: 15 },
  { eyebrow: '02', title: '30 minutos antes', value: 30 },
  { eyebrow: '03', title: '1 hora antes', value: 60 },
  { eyebrow: '04', title: '1 dia antes', value: 1440 },
] as const;

const permissionLabels: Record<ReminderPermission, string> = {
  granted: 'Permitida',
  denied: 'Negada — ative nas configurações do sistema',
  undetermined: 'Ainda não solicitada',
};

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const [preferences, setPreferences] = useState<ReminderPreferences>(DEFAULT_PREFERENCES);
  const [permission, setPermission] = useState<ReminderPermission>('undetermined');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const [exactAccess, setExactAccess] = useState(true);
  const [testMessage, setTestMessage] = useState<string>();

  const refreshPermission = useCallback(async () => {
    setPermission(await ensurePermission(false));
    setExactAccess(await getExactAlarmAccess());
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const stored = await loadReminderPreferences();
      if (active) { setPreferences(stored); setLoaded(true); }
    })();
    return () => { active = false; };
  }, []);

  // Permission can change in the system settings, so re-read it whenever the screen gains focus.
  useFocusEffect(useCallback(() => { void refreshPermission(); }, [refreshPermission]));

  const update = async (next: ReminderPreferences) => {
    setPreferences(next);
    setSaving(true);
    setSaved(false);
    setError(undefined);
    try {
      await saveReminderPreferences(next);
      setSaved(true);
    } catch {
      setError('Não foi possível salvar a preferência neste aparelho.');
    } finally {
      setSaving(false);
    }
  };

  const askPermission = async () => {
    setPermission(await requestReminderPermission());
  };

  const askExactAccess = async () => {
    setExactAccess(await requestExactAlarmAccess());
  };

  const sendTest = async () => {
    setTestMessage(undefined);
    const result = await sendTestReminder();
    setPermission(result);
    setTestMessage(result === 'granted'
      ? 'Notificação de teste enviada. Ela aparece em alguns segundos, mesmo com o app aberto.'
      : 'Permita as notificações para receber o teste.');
  };

  const disabled = !loaded || saving;

  return <ScrollView
    style={{ backgroundColor: colors.background }}
    contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: spacing.xl }]}
    showsVerticalScrollIndicator={false}
  >
    <NomiScreenHeader title="Lembretes" backLabel="Voltar" fallbackHref="/menu" />

    <NomiText variant="supporting" tone="muted">Escolha quando receber avisos. A permissão do aparelho é gerenciada nas configurações do sistema.</NomiText>

    <NomiText variant="overline" tone="muted">Lembretes no Nomi</NomiText>
    <View accessibilityRole="radiogroup" accessibilityLabel="Lembretes no Nomi" style={styles.options}>
      {enabledOptions.map((option) => (
        <NomiOptionCard
          key={option.eyebrow}
          eyebrow={option.eyebrow}
          title={option.title}
          selected={preferences.enabled === option.value}
          disabled={disabled}
          onPress={() => void update({ ...preferences, enabled: option.value })}
        />
      ))}
    </View>

    <NomiText variant="overline" tone="muted">Permissão do aparelho</NomiText>
    <NomiText variant="body">{permissionLabels[permission]}</NomiText>
    {permission === 'undetermined' ? <NomiButton label="Permitir notificações" variant="secondary" onPress={() => void askPermission()} /> : null}
    {permission === 'denied' ? <NomiButton label="Abrir configurações" variant="secondary" onPress={() => void Linking.openSettings()} /> : null}

    <NomiText variant="overline" tone="muted">Horário exato</NomiText>
    <NomiText variant="body">{exactAccess ? 'Ativado — os avisos chegam no horário escolhido' : 'Desativado — o Android pode atrasar os avisos em até 1 hora'}</NomiText>
    {!exactAccess ? <NomiButton label="Permitir horário exato" variant="secondary" onPress={() => void askExactAccess()} accessibilityHint="Abre a configuração Alarmes e lembretes do Android" /> : null}

    <NomiButton label="Enviar notificação de teste" variant="tertiary" onPress={() => void sendTest()} />
    {testMessage ? <NomiText variant="caption" tone="muted" accessibilityLiveRegion="polite">{testMessage}</NomiText> : null}

    <NomiText variant="overline" tone="muted">Antecedência padrão</NomiText>
    <View accessibilityRole="radiogroup" accessibilityLabel="Antecedência padrão" style={styles.options}>
      {leadOptions.map((option) => (
        <NomiOptionCard
          key={option.eyebrow}
          eyebrow={option.eyebrow}
          title={option.title}
          selected={preferences.leadMinutes === option.value}
          disabled={disabled}
          onPress={() => void update({ ...preferences, leadMinutes: option.value })}
        />
      ))}
    </View>

    <NomiOptionCard
      eyebrow="PRAZOS SEM HORÁRIO"
      title="Às 09:00 no seu fuso"
      detail="Para entregas sem horário definido"
    />

    {saving ? <NomiText variant="caption" tone="muted" accessibilityLiveRegion="polite">Salvando preferência…</NomiText> : null}
    {saved && !saving && !error ? <NomiText variant="caption" tone="muted" accessibilityLiveRegion="polite">Preferências salvas neste aparelho.</NomiText> : null}
    {error ? <NomiFeedback kind="error" title="Não foi possível salvar" message={error} /> : null}

    <NomiText variant="caption" tone="muted">Os lembretes ficam neste aparelho.</NomiText>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, gap: 14 },
  options: { gap: 14 },
});
