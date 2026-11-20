import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useNomiTheme();

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
    >
      <ScreenHeader
        title="Configurações"
        onBack={() => router.back()}
        showNotifications
        onNotificationsPress={() => router.push('/menu/reminders')}
      />
      <Text style={[styles.description, { color: colors.muted }]}>
        Ajustes de aparência, lembretes e privacidade do Nomi.
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
});
