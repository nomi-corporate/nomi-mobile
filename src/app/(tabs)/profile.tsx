import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { palettes, spacing } from '@/theme/tokens';

export default function ProfileScreen() {
  const { state, signOut } = useAuth();
  const colors = palettes[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Seu espaço</Text>
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Sua conta está conectada</Text>
      <Text style={[styles.description, { color: colors.muted }]}>Os dados do seu perfil serão conectados em uma próxima etapa.</Text>
      {state.status === 'refreshing' && <ActivityIndicator accessibilityLabel="Renovando sessão" color={colors.accent} />}
      <Pressable accessibilityRole="button" onPress={() => { void signOut(); }} style={[styles.button, { borderColor: colors.accent }]}>
        <Text style={[styles.cardTitle, { color: colors.accent }]}>Sair da conta</Text>
      </Pressable>
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: 32, fontWeight: '700' },
  card: { padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderRadius: 24 },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  description: { fontSize: 16, lineHeight: 25 },
  button: { borderWidth: 1, minHeight: 52, borderRadius: 16, padding: spacing.md, alignItems: 'center', justifyContent: 'center' },
});
