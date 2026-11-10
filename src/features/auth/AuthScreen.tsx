import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palettes, spacing } from '@/theme/tokens';
import { useAuth } from './AuthProvider';

export function AuthScreen() {
  const { state, configurationError, signIn, signOut, retry } = useAuth();
  const colors = palettes[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const busy = ['restoring', 'signingIn', 'signingOut'].includes(state.status);
  const loading = state.status === 'restoring' ? 'Restaurando sua sessão…'
    : state.status === 'signingOut' ? 'Saindo da conta…' : 'Aguardando você concluir a entrada…';
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.brand, { color: colors.accent }]}>nomi</Text>
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Sua rotina começa aqui.</Text>
        <Text style={[styles.description, { color: colors.muted }]}>Entre na sua conta para acessar seu espaço acadêmico.</Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Um espaço seu</Text>
        <Text style={[styles.description, { color: colors.muted }]}>Use seu e-mail e senha. Você também pode criar sua conta ou recuperar o acesso na próxima tela.</Text>
        {(configurationError || state.message) && <Text accessibilityLiveRegion="polite" style={[styles.description, { color: colors.text }]}>{configurationError ?? state.message}</Text>}
        {busy ? <View accessibilityLiveRegion="polite" style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.description, { color: colors.muted }]}>{loading}</Text>
        </View> : !configurationError && <>
          <Pressable accessibilityRole="button" onPress={() => { void (state.status === 'unavailable' ? retry() : signIn()); }}
            style={({ pressed }) => [styles.button, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={[styles.buttonText, { color: colors.onAccent }]}>{state.status === 'unavailable' ? 'Tentar novamente' : 'Entrar ou criar conta'}</Text>
          </Pressable>
          {state.status === 'unavailable' && state.recovery === 'restore' && <Pressable accessibilityRole="button" onPress={() => { void signOut(); }} style={styles.secondary}>
            <Text style={[styles.buttonText, { color: colors.accent }]}>Sair desta sessão</Text>
          </Pressable>}
        </>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.xl },
  brand: { fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  intro: { gap: spacing.md, marginTop: spacing.xl },
  title: { fontSize: 34, fontWeight: '700', lineHeight: 42 },
  description: { fontSize: 16, lineHeight: 25 },
  card: { padding: spacing.lg, borderWidth: 1, borderRadius: 24, gap: spacing.md },
  cardTitle: { fontSize: 20, fontWeight: '600' },
  button: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  buttonText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  secondary: { minHeight: 48, justifyContent: 'center', padding: spacing.sm },
  loading: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
});
