import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { borders, fontFamilies, radii, spacing } from '@/theme/tokens';

type Props = { title: string; description: string; detail: string };

export function StarterScreen({ title, description, detail }: Props) {
  const { colors } = useNomiTheme();
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <Text style={[styles.brand, { color: colors.accent }]}>nomi</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
        {title}
      </Text>
      <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.outline },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>Estamos começando</Text>
        <Text style={[styles.description, { color: colors.muted }]}>{detail}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.screenPadding, gap: spacing.blockGap, flexGrow: 1 },
  brand: { fontFamily: fontFamilies.displayBold, fontSize: 28, letterSpacing: -0.5 },
  title: { fontFamily: fontFamilies.displayBold, fontSize: 30, lineHeight: 38 },
  description: { fontFamily: fontFamilies.sansRegular, fontSize: 15, lineHeight: 22 },
  card: {
    padding: spacing.lg,
    borderWidth: borders.width,
    borderRadius: radii.profileCard,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cardTitle: { fontFamily: fontFamilies.sansBold, fontSize: 18, lineHeight: 24 },
});
