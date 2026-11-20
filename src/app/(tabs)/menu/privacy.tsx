import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { OptionCard } from '@/components/OptionCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PRIVACY_ITEMS } from '@/features/profile/mock';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';

export default function PrivacyScreen() {
  const router = useRouter();
  const { colors } = useNomiTheme();

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
    >
      <View style={styles.topSection}>
        <ScreenHeader title="Privacidade" onBack={() => router.back()} />

        <Text style={[styles.description, { color: colors.muted }]}>
          Controle o uso e o compartilhamento dos seus dados.
        </Text>

        {PRIVACY_ITEMS.map((item) => (
          <OptionCard
            key={item.id}
            eyebrow={item.eyebrow}
            title={item.title}
            description={item.description}
          />
        ))}
      </View>

      <View style={styles.bottomActions}>
        <Button
          label="Voltar aos ajustes"
          variant="primary"
          onPress={() => router.back()}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.screenPadding,
    gap: spacing.blockGap,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    gap: spacing.blockGap,
  },
  description: {
    ...typography.caption,
  },
  bottomActions: {
    paddingTop: spacing.md,
  },
});
