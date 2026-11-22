import { ScrollView, StyleSheet, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiButton, NomiFeedback, NomiListRow, NomiScreenHeader, NomiText, NomiTextField } from '@/components';
import { useProfile } from '@/features/profile/ProfileProvider';
import type { ProfilePatch } from '@/features/academic/infrastructure/AcademicClient';

const NAME_ERROR = 'Use um nome entre 1 e 100 caracteres.';
const TIME_ZONE_ERROR = 'Informe um fuso válido, por exemplo America/Sao_Paulo.';

function isValidName(value: string): boolean {
  const length = value.trim().length;
  return length >= 1 && length <= 100;
}

function isValidTimeZone(value: string): boolean {
  const zone = value.trim();
  if (!zone || (!zone.includes('/') && zone !== 'UTC')) return false;
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export default function EditProfileScreen() {
  const { colorScheme } = useNomiTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = palettes[colorScheme];
  const account = useProfile();
  const { profile, loading, saving, error, reload, save } = account;

  const [name, setName] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [attempted, setAttempted] = useState(false);
  // Once the user edits a field, the server copy no longer overwrites it.
  const dirty = useRef(false);

  useEffect(() => {
    if (!profile || dirty.current) return;
    setName(profile.displayName);
    setTimeZone(profile.timeZone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.version]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/menu/profile');
  };

  const trimmedName = name.trim();
  const trimmedTimeZone = timeZone.trim();
  const nameChanged = !!profile && trimmedName !== profile.displayName;
  const timeZoneChanged = !!profile && trimmedTimeZone !== profile.timeZone;
  const changed = nameChanged || timeZoneChanged;
  const nameError = attempted && !isValidName(name) ? NAME_ERROR : undefined;
  const timeZoneError = attempted && !isValidTimeZone(timeZone) ? TIME_ZONE_ERROR : undefined;

  const submit = async () => {
    setAttempted(true);
    if (!profile || !changed || !isValidName(name) || !isValidTimeZone(timeZone)) return;
    const patch: ProfilePatch = {};
    if (nameChanged) patch.displayName = trimmedName;
    if (timeZoneChanged) patch.timeZone = trimmedTimeZone;
    if (await save(patch)) goBack();
  };

  return <ScrollView
    style={{ backgroundColor: colors.background }}
    contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(112, insets.bottom + 80) }]}
    showsVerticalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
  >
    <NomiScreenHeader title="Editar perfil" backLabel="Voltar ao perfil" fallbackHref="/menu/profile" />

    <NomiText variant="supporting" tone="muted">Seu nome, idioma e fuso. Alterar o fuso não muda os horários dos compromissos.</NomiText>

    {loading && !profile ? <NomiFeedback kind="loading" title="Carregando perfil" message="Buscando os dados da sua conta." /> : null}

    {!loading && !profile && error ? <>
      <NomiFeedback kind="error" title="Não foi possível carregar o perfil" message={error} />
      <NomiButton variant="secondary" label="Tentar novamente" onPress={() => void reload()} />
    </> : null}

    {profile ? <>
      {error ? <NomiFeedback kind="error" title="Não foi possível salvar" message={error} /> : null}

      <NomiTextField
        label="Nome"
        value={name}
        onChangeText={value => { dirty.current = true; setName(value); }}
        maxLength={100}
        autoComplete="name"
        editable={!saving}
        error={nameError}
      />
      <NomiTextField label="E-mail · somente leitura" value={profile.email ?? ''} readOnly />
      <NomiTextField
        label="Idioma"
        value="Português (Brasil)"
        readOnly
        accessibilityHint="Somente português do Brasil está disponível"
      />
      <NomiTextField
        label="Fuso horário"
        value={timeZone}
        onChangeText={value => { dirty.current = true; setTimeZone(value); }}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="America/Sao_Paulo"
        editable={!saving}
        error={timeZoneError}
      />

      <View style={styles.actions}>
        <NomiButton
          label="Salvar alterações"
          onPress={() => void submit()}
          loading={saving}
          disabled={!changed || !profile || loading}
        />
        <NomiListRow title="Cancelar" detail="Voltar sem alterar os dados" onPress={goBack} disabled={saving} />
      </View>
    </> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: 14 },
  actions: { gap: 14 },
});
