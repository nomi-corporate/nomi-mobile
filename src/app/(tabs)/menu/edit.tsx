import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { NavRow } from '@/components/NavRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  formatLocaleDisplay,
  isValidIanaTimeZone,
  normalizeLocaleInput,
} from '@/features/profile/api';
import { useProfile } from '@/features/profile/useProfile';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useNomiTheme();
  const {
    profile,
    status,
    isSimulated,
    errorMessage,
    fieldErrors,
    reload,
    updateProfile,
    clearFeedback,
  } = useProfile();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [localeInput, setLocaleInput] = useState(
    profile ? formatLocaleDisplay(profile.locale) : 'Português (Brasil)'
  );
  const [timeZone, setTimeZone] = useState(profile?.timeZone ?? 'America/Sao_Paulo');
  const [localErrors, setLocalErrors] = useState<{
    displayName?: string;
    locale?: string;
    timeZone?: string;
  }>({});
  const [savedConfirmed, setSavedConfirmed] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setLocaleInput(formatLocaleDisplay(profile.locale));
      setTimeZone(profile.timeZone);
    }
  }, [profile]);

  const handleSave = async () => {
    setSavedConfirmed(false);
    clearFeedback();

    const nextErrors: {
      displayName?: string;
      locale?: string;
      timeZone?: string;
    } = {};

    const trimmedName = displayName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 100) {
      nextErrors.displayName = 'O nome deve ter entre 1 e 100 caracteres.';
    }

    const normalizedLocale = normalizeLocaleInput(localeInput);
    if (!normalizedLocale) {
      nextErrors.locale = 'O idioma inicial suportado pelo contrato é Português (Brasil) (pt-BR).';
    }

    if (!isValidIanaTimeZone(timeZone)) {
      nextErrors.timeZone = 'Informe um fuso horário IANA válido (ex.: America/Sao_Paulo).';
    }

    setLocalErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !normalizedLocale) {
      return;
    }

    const ok = await updateProfile({
      displayName: trimmedName,
      locale: normalizedLocale,
      timeZone: timeZone.trim(),
    });

    if (ok) {
      setSavedConfirmed(true);
    }
  };

  const handleReloadAfterConflict = async () => {
    setSavedConfirmed(false);
    setLocalErrors({});
    await reload();
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
    >
      <ScreenHeader
        title="Editar perfil"
        onBack={() => {
          clearFeedback();
          router.back();
        }}
        showNotifications
        onNotificationsPress={() => router.push('/menu/reminders')}
      />

      <Text style={[styles.description, { color: colors.muted }]}>
        Seu nome, idioma e fuso. Alterar o fuso não muda os horários dos compromissos.
      </Text>

      {status === 'loading' && !profile ? (
        <View style={styles.stateBox}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.description, { color: colors.muted }]}>
            Carregando dados do perfil...
          </Text>
        </View>
      ) : null}

      {status === 'error' && !profile ? (
        <View style={styles.stateBox}>
          <Text
            accessibilityRole="alert"
            style={[styles.feedbackText, { color: colors.accent }]}
          >
            {errorMessage ?? 'Não foi possível carregar o perfil.'}
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

      <Field
        label="NOME"
        value={displayName}
        onChangeText={(text) => {
          setDisplayName(text);
          setSavedConfirmed(false);
          if (localErrors.displayName) {
            setLocalErrors((prev) => ({ ...prev, displayName: undefined }));
          }
        }}
        error={localErrors.displayName ?? fieldErrors.displayName}
      />

      <Field
        label="E-MAIL · SOMENTE LEITURA"
        value={profile?.email ?? ''}
        readOnly
      />

      <Field
        label="IDIOMA"
        value={localeInput}
        onChangeText={(text) => {
          setLocaleInput(text);
          setSavedConfirmed(false);
          if (localErrors.locale) {
            setLocalErrors((prev) => ({ ...prev, locale: undefined }));
          }
        }}
        error={localErrors.locale ?? fieldErrors.locale}
      />

      <Field
        label="FUSO HORÁRIO"
        value={timeZone}
        onChangeText={(text) => {
          setTimeZone(text);
          setSavedConfirmed(false);
          if (localErrors.timeZone) {
            setLocalErrors((prev) => ({ ...prev, timeZone: undefined }));
          }
        }}
        error={localErrors.timeZone ?? fieldErrors.timeZone}
      />

      {status === 'conflict' ? (
        <View style={styles.stateBox}>
          <Text
            accessibilityRole="alert"
            style={[styles.feedbackText, { color: colors.accent }]}
          >
            {errorMessage ??
              'O perfil foi modificado em outra sessão (HTTP 412). Recarregue os dados atuais para reconciliar.'}
          </Text>
          <Button
            label="Recarregar versão atual"
            variant="secondary"
            onPress={() => {
              void handleReloadAfterConflict();
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

      {savedConfirmed ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.feedbackText, { color: colors.accent }]}
        >
          {isSimulated
            ? 'Alterações confirmadas no adapter simulado (PATCH /me com If-Match).'
            : 'Alterações confirmadas pelo serviço Academic.'}
        </Text>
      ) : null}

      <Button
        label="Salvar alterações"
        variant="primary"
        loading={status === 'saving'}
        disabled={status === 'loading' || !profile}
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
          Adapter simulado ativo · ETag atual: {profile ? `"${profile.version}"` : '-'}.
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
