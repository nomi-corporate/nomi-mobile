import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { NavRow } from '@/components/NavRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionLabel } from '@/components/SectionLabel';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';

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
        showNotifications
        onNotificationsPress={() => router.push('/menu/reminders')}
      />
      <Text style={[styles.description, { color: colors.muted }]}>
        Seu espaço de perfil e preferências que acompanham sua rotina.
      </Text>
      <SectionLabel>ATALHOS DO MENU (ESTRUTURA DE ROTAS)</SectionLabel>
      <NavRow
        title="Editar perfil"
        subtitle="Nome, idioma e fuso horário"
        onPress={() => router.push('/menu/edit')}
      />
      <NavRow
        title="Configurações"
        subtitle="Aparência, lembretes e privacidade"
        onPress={() => router.push('/menu/settings')}
      />
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
        title="Dispositivos"
        subtitle="Celular e integração Wear OS"
        onPress={() => router.push('/menu/devices')}
      />
      <NavRow
        title="Lembretes"
        subtitle="Notificações e antecedência"
        onPress={() => router.push('/menu/reminders')}
      />
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
});
