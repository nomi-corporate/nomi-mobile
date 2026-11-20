import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { OptionCard } from '@/components/OptionCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SIMULATED_DEVICES } from '@/features/profile/mock';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';

export default function DevicesScreen() {
  const router = useRouter();
  const { colors } = useNomiTheme();
  const [showWatchInfo, setShowWatchInfo] = useState(false);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
    >
      <View style={styles.topSection}>
        <ScreenHeader title="Dispositivos" onBack={() => router.back()} />

        <Text style={[styles.description, { color: colors.muted }]}>
          Converse no telefone Android e registre no Watch com Wear OS.
        </Text>

        {SIMULATED_DEVICES.map((device) => (
          <OptionCard
            key={device.id}
            eyebrow={device.eyebrow}
            title={device.title}
            description={device.description}
          />
        ))}

        {showWatchInfo ? (
          <Text
            accessibilityRole="alert"
            style={[styles.infoBanner, { color: colors.muted }]}
          >
            O aplicativo Wear OS (com.nomi.app) compartilha identidade e sincronização Data Layer
            em builds nativas assinadas. Esta visualização utiliza dados simulados.
          </Text>
        ) : null}
      </View>

      <View style={styles.bottomActions}>
        <Button
          label="Ver experiência do Watch"
          variant="primary"
          onPress={() => setShowWatchInfo((prev) => !prev)}
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
  infoBanner: {
    ...typography.caption,
  },
  bottomActions: {
    gap: spacing.blockGap,
    paddingTop: spacing.md,
  },
});
