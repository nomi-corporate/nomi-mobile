import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/AuthProvider';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiFeedback } from '@/components';
import { NomiAvatarPlaceholder } from '@/components/brand/NomiAvatarPlaceholder';
import { NomiButton } from '@/components/ui/NomiButton';
import { NomiListRow } from '@/components/ui/NomiListRow';
import { NomiScreenHeader } from '@/components/ui/NomiScreenHeader';
import { NomiText } from '@/components/ui/NomiText';
import { NomiTextField } from '@/components/ui/NomiTextField';
import { useProfile } from '@/features/profile/ProfileProvider';

export default function ProfileScreen() {
  const { state, signOut } = useAuth();
  const { colorScheme } = useNomiTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = palettes[colorScheme];
  const account = useProfile();
  const { profile } = account;

  return <ScrollView
    style={{ backgroundColor: colors.background }}
    contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(112, insets.bottom + 80) }]}
    showsVerticalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
  >
    <NomiScreenHeader title="Perfil" />

    <View style={[styles.identityCard, { backgroundColor: colors.tint }]}>
      <NomiAvatarPlaceholder />
      <View style={styles.identityText}>
        <NomiText variant="title" style={styles.displayName}>{profile?.displayName ?? (account.loading ? 'Carregando…' : 'Sua conta')}</NomiText>
        <NomiText variant="caption" tone="muted">{profile?.email ?? ''}</NomiText>
      </View>
    </View>

    {state.status === 'refreshing' && <ActivityIndicator accessibilityLabel="Renovando sessão" color={colors.accent} />}

    {account.error ? <>
      <NomiFeedback kind="error" title="Não foi possível carregar o perfil" message={account.error} />
      <NomiButton label="Tentar novamente" variant="secondary" onPress={() => void account.reload()} />
    </> : null}

    <NomiText variant="overline" tone="muted">Dados da conta</NomiText>
    <NomiTextField label="E-mail" value={profile?.email ?? ''} readOnly />
    <NomiButton label="Editar perfil" onPress={() => router.push('/menu/edit-profile')} disabled={!profile || account.loading} />
    {account.message ? <NomiText tone="success">{account.message}</NomiText> : null}

    <NomiText variant="overline" tone="muted">Sua experiência</NomiText>
    <NomiListRow title="Aparência" detail="Claro, escuro ou sistema" onPress={() => router.push('/menu/appearance')} />
    <NomiListRow title="Privacidade" detail="Seus dados e permissões" onPress={() => router.push('/menu/privacy')} />

    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sair da conta"
      onPress={() => void signOut()}
      style={({ pressed }) => [styles.signOut, { opacity: pressed ? 0.86 : 1 }]}
    >
      <NomiText variant="supporting" tone="muted" style={styles.signOutText}>Sair da conta</NomiText>
    </Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: 14 },
  identityCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 24, padding: spacing.md },
  identityText: { flex: 1, gap: 5 },
  displayName: { fontSize: 23, lineHeight: 30 },
  signOut: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 3 },
  signOutText: { fontSize: 13, lineHeight: 17 },
});
