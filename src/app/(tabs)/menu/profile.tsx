import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/AuthProvider';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiAvatarPlaceholder, NomiButton, NomiCard, NomiFeedback, NomiText, NomiTextField } from '@/components';
import { useProfile } from '@/features/profile/ProfileProvider';
import { NomiScreenHeader } from '@/components/ui/NomiScreenHeader';
import { NomiThemeOptions } from '@/components/ui/NomiThemeOptions';

export default function ProfileScreen() {
  const { state, signOut } = useAuth();
  const { colorScheme } = useNomiTheme();
  const insets = useSafeAreaInsets();
  const colors = palettes[colorScheme];
  const account = useProfile();
  const { profile } = account;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string>();

  const save = async () => {
    if (!name.trim() || name.trim().length > 100) { setFormError('Use um nome entre 1 e 100 caracteres.'); return; }
    setFormError(undefined);
    if (await account.save({ displayName: name.trim() })) setEditing(false);
  };

  return <ScrollView
    style={{ backgroundColor: colors.background }}
    contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(112, insets.bottom + 80) }]}
    showsVerticalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
  >
    <NomiScreenHeader title="Perfil" />

    <NomiCard style={styles.accountCard}>
      <View style={styles.identity}>
        <NomiAvatarPlaceholder />
        <View style={styles.identityText}>
          <NomiText variant="heading">{profile?.displayName ?? 'Sua conta'}</NomiText>
          <NomiText variant="caption" tone="muted">{profile?.email ?? 'Nomi Identity'}</NomiText>
        </View>
      </View>
      <NomiText variant="supporting" tone="muted">
        Seu nome e sua aparência são salvos na conta. O e-mail é confirmado pelo Nomi Identity e não pode ser alterado aqui.
      </NomiText>
      {state.status === 'refreshing' && <ActivityIndicator accessibilityLabel="Renovando sessão" color={colors.accent} />}
      {account.loading ? <NomiFeedback kind="loading" title="Carregando perfil" message="Buscando os dados da sua conta." /> : null}
      {account.error ? <><NomiFeedback kind="error" title="Não foi possível concluir" message={account.error} /><NomiButton label={editing ? 'Recarregar perfil e fechar edição' : 'Tentar novamente'} variant="secondary" onPress={() => { setEditing(false); void account.reload(); }} /></> : null}
      {editing ? <>
        <NomiTextField label="Nome de exibição" value={name} onChangeText={value => { setName(value); setFormError(undefined); }} maxLength={100} editable={!account.saving} />
        <NomiTextField label="E-mail" value={profile?.email ?? ''} editable={false} />
        {formError ? <NomiText tone="error">{formError}</NomiText> : null}
        <NomiButton label="Salvar perfil" onPress={() => void save()} loading={account.saving} disabled={!name.trim() || account.loading} />
        <NomiButton label="Cancelar edição" variant="tertiary" disabled={account.saving} onPress={() => setEditing(false)} />
      </> : <NomiButton label="Editar perfil" variant="secondary" disabled={!profile || account.loading || account.saving} onPress={() => { setName(profile?.displayName ?? ''); setFormError(undefined); setEditing(true); }} />}
      {account.message && !editing ? <NomiText tone="success">{account.message}</NomiText> : null}
    </NomiCard>

    <NomiText variant="label" tone="muted" style={styles.sectionTitle}>SUA EXPERIÊNCIA</NomiText>
    <NomiCard style={styles.preferences}>
      <View style={styles.preferenceHeading}>
        <NomiText variant="heading">Aparência</NomiText>
        <NomiText variant="caption" tone="muted">Claro, escuro ou sistema</NomiText>
      </View>
      <NomiThemeOptions />
    </NomiCard>

    <NomiCard style={styles.privacyCard}>
      <View style={styles.privacyCopy}>
        <NomiText variant="heading">Privacidade</NomiText>
        <NomiText variant="supporting" tone="muted">Seus dados e permissões</NomiText>
      </View>
      <NomiText variant="caption" tone="muted">Os controles de privacidade serão habilitados junto com os endpoints de conta.</NomiText>
    </NomiCard>

    <NomiButton label="Sair da conta" variant="secondary" onPress={() => { void signOut(); }} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  accountCard: { gap: spacing.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityText: { flex: 1, gap: spacing.xs },
  sectionTitle: { marginTop: spacing.sm, letterSpacing: 0.4 },
  preferences: { gap: spacing.md },
  preferenceHeading: { gap: spacing.xs },
  privacyCard: { minHeight: 88, justifyContent: 'center', gap: spacing.sm },
  privacyCopy: { gap: spacing.xs },
});
