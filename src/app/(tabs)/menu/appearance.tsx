import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { OptionCard } from '@/components/OptionCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { APPEARANCE_OPTIONS } from '@/features/profile/mock';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { spacing, typography, type ThemePreference } from '@/theme/tokens';

export default function AppearanceScreen() {
  const router = useRouter();
  const { colors, preference, setPreference } = useNomiTheme();
  const [selected, setSelected] = useState<ThemePreference>(preference);

  const handleSelect = (next: ThemePreference) => {
    setSelected(next);
    setPreference(next);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
    >
      <View style={styles.topSection}>
        <ScreenHeader title="Aparência" onBack={() => router.back()} />

        <Text style={[styles.description, { color: colors.muted }]}>
          Sua preferência de aparência será salva no perfil.
        </Text>

        {APPEARANCE_OPTIONS.map((option) => (
          <OptionCard
            key={option.key}
            eyebrow={option.eyebrow}
            title={option.title}
            description={option.description}
            selected={selected === option.key}
            onPress={() => handleSelect(option.key)}
          />
        ))}
      </View>

      <View style={styles.bottomActions}>
        <Button
          label="Salvar aparência"
          variant="primary"
          onPress={() => {
            setPreference(selected);
            router.back();
          }}
        />
        <Button
          label="Voltar ao perfil"
          variant="secondary"
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
    gap: spacing.blockGap,
    paddingTop: spacing.md,
  },
});
