import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { NavRow } from '@/components/NavRow';
import { ProfileSummary } from '@/components/ProfileSummary';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionLabel } from '@/components/SectionLabel';
import { SIMULATED_PROFILE } from '@/features/profile/mock';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { sizes, spacing, typography } from '@/theme/tokens';

export default function ProfileMenuScreen() {
  const router = useRouter();
  const { colors } = useNomiTheme();

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

      <ProfileSummary
        name={SIMULATED_PROFILE.displayName}
        course={SIMULATED_PROFILE.courseLabel}
        term={SIMULATED_PROFILE.termLabel}
      />

      <SectionLabel>DADOS DA CONTA</SectionLabel>

      <Field
        label="E-MAIL"
        value={SIMULATED_PROFILE.email}
        readOnly
      />

      <Button
        label="Editar perfil"
        variant="primary"
        onPress={() => router.push('/menu/edit')}
      />

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
        <Text style={[styles.simulationNote, { color: colors.muted }]}>
          Dados simulados para visualização de interface.
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
