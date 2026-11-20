import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { NavRow } from '@/components/NavRow';
import { ProfileSummary } from '@/components/ProfileSummary';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionLabel } from '@/components/SectionLabel';
import { useProfile } from '@/features/profile/useProfile';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { sizes, spacing, typography } from '@/theme/tokens';

export default function ProfileMenuScreen() {
  const router = useRouter();
  const { colors } = useNomiTheme();
  const { profile, status, isSimulated, errorMessage, lastSavedMessage, reload } = useProfile();

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
    >
      <ScreenHeader
        title="Perfil"
        onBack={router.canGoBack() ? () => router.back() : undefined}
        showNotifications
        onNotificationsPress={() => router.push('/menu/reminders')}
      />

      {status === 'loading' && !profile ? (
        <View style={styles.stateBox}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.stateText, { color: colors.muted }]}>
            Carregando dados do perfil...
          </Text>
        </View>
      ) : null}

      {status === 'error' && !profile ? (
        <View style={styles.stateBox}>
          <Text
            accessibilityRole="alert"
            style={[styles.stateText, { color: colors.accent }]}
          >
            {errorMessage ?? 'Não foi possível carregar os dados do perfil.'}
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

      {profile ? (
        <>
          <ProfileSummary
            name={profile.displayName}
            course={profile.courseLabel}
            term={profile.termLabel}
            avatarUrl={profile.avatarUrl}
          />

          {lastSavedMessage ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.feedbackText, { color: colors.accent }]}
            >
              {lastSavedMessage}
            </Text>
          ) : null}

          <SectionLabel>DADOS DA CONTA</SectionLabel>

          <Field
            label="E-MAIL"
            value={profile.email}
            readOnly
          />

          <Button
            label="Editar perfil"
            variant="primary"
            onPress={() => router.push('/menu/edit')}
          />
        </>
      ) : null}

      <SectionLabel>SUA EXPERIÊNCIA</SectionLabel>

      <NavRow
        title="Aparência"
        subtitle="Claro, escuro ou sistema"
        onPress={() => router.push('/menu/appearance')}
      />

      <NavRow
        title="Privacidade"
        subtitle="Seus dados e permissões"
        onPress={() => router.push('/menu/privacy')}
      />

      <NavRow
        title="Configurações"
        subtitle="Aparência, lembretes e privacidade"
        onPress={() => router.push('/menu/settings')}
      />

      <NavRow
        title="Dispositivos"
        subtitle="Telefone Android e relógio Wear OS"
        onPress={() => router.push('/menu/devices')}
      />

      <View style={styles.signOutWrapper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair da conta (indisponível até integração da sessão HU-103)"
          accessibilityState={{ disabled: true }}
          disabled
          style={styles.signOutButton}
        >
          <Text style={[styles.signOutText, { color: colors.muted }]}>
            Sair da conta (depende da sessão · HU-103)
          </Text>
        </Pressable>
        {isSimulated ? (
          <Text style={[styles.simulationNote, { color: colors.muted }]}>
            Modo simulado ativo (EXPO_PUBLIC_ACADEMIC_API_URL não configurada).
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.screenPadding,
    gap: spacing.blockGap,
    flexGrow: 1,
  },
  stateBox: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  stateText: {
    ...typography.caption,
  },
  feedbackText: {
    ...typography.caption,
  },
  signOutWrapper: {
    gap: 4,
    paddingTop: 4,
  },
  signOutButton: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    opacity: 0.65,
  },
  signOutText: {
    ...typography.signOut,
  },
  simulationNote: {
    ...typography.caption,
  },
});
