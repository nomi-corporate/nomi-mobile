import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { palettes, spacing } from '@/theme/tokens';

type Props = { title: string; description: string; detail: string };

export function StarterScreen({ title, description, detail }: Props) {
  const colors = palettes[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.brand, { color: colors.accent }]}>nomi</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Estamos começando</Text>
        <Text style={[styles.description, { color: colors.muted }]}>{detail}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  brand: { fontSize: 28, fontWeight: '700', letterSpacing: -1 },
  title: { fontSize: 32, fontWeight: '700' },
  description: { fontSize: 16, lineHeight: 25 },
  card: { padding: spacing.lg, borderWidth: 1, borderRadius: 24, gap: spacing.sm, marginTop: spacing.md },
  cardTitle: { fontSize: 18, fontWeight: '600' },
});
