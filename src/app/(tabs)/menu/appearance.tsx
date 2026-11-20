import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { OptionCard } from '@/components/OptionCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { APPEARANCE_OPTIONS } from '@/features/profile/mock';
import { useProfile } from '@/features/profile/useProfile';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { spacing, typography, type ThemePreference } from '@/theme/tokens';

export default function AppearanceScreen() {
  const router = useRouter();
  const { colors, preference, setPreference } = useNomiTheme();
  const {
    profile,
    status,
    isSimulated,
    errorMessage,
    reload,
    updateProfile,
    clearFeedback,
  } = useProfile();

  const [selected, setSelected] = useState<ThemePreference>(
    profile?.theme ?? preference
  );
  const [savedConfirmed, setSavedConfirmed] = useState(false);

  const handleSelect = (next: ThemePreference) => {
    setSelected(next);
    setPreference(next);
    setSavedConfirmed(false);
    clearFeedback();
  };

  const handleSave = async () => {
    setSavedConfirmed(false);
    setPreference(selected);
    const ok = await updateProfile({ theme: selected });
    if (ok) {
      setSavedConfirmed(true);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
    >
      <View style={styles.topSection}>
        <ScreenHeader
          title="Aparência"
          onBack={() => {
            clearFeedback();
            router.back();
          }}
        />

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

        {status === 'conflict' ? (
          <View style={styles.stateBox}>
            <Text
              accessibilityRole="alert"
              style={[styles.feedbackText, { color: colors.accent }]}
            >
              {errorMessage ??
                'Conflito de versão detectado (HTTP 412). Recarregue os dados atuais do perfil antes de salvar.'}
            </Text>
            <Button
              label="Recarregar versão atual"
              variant="secondary"
              onPress={() => {
                void reload();
              }}
            />
          </View>
        ) : null}

        {errorMessage && status !== 'conflict' ? (
          <Text
            accessibilityRole="alert"
            style={[styles.feedbackText, { color: colors.accent }]}
          >
            {errorMessage}
          </Text>
        ) : null}

        {savedConfirmed ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.feedbackText, { color: colors.accent }]}
          >
            {isSimulated
              ? 'Preferência de aparência confirmada no adapter simulado (PATCH /me).'
              : 'Preferência de aparência salva no perfil.'}
          </Text>
        ) : null}
      </View>

      <View style={styles.bottomActions}>
        <Button
          label="Salvar aparência"
          variant="primary"
          loading={status === 'saving'}
          disabled={status === 'loading'}
          onPress={() => {
            void handleSave();
          }}
        />
        <Button
          label="Voltar ao perfil"
          variant="secondary"
          onPress={() => {
            clearFeedback();
            router.back();
          }}
        />
        {isSimulated ? (
          <Text style={[styles.simulationNote, { color: colors.muted }]}>
            Adapter simulado ativo · tema aplicado imediatamente via ThemeProvider.
          </Text>
        ) : null}
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
  stateBox: {
    gap: spacing.sm,
  },
  feedbackText: {
    ...typography.caption,
  },
  bottomActions: {
    gap: spacing.blockGap,
    paddingTop: spacing.md,
  },
  simulationNote: {
    ...typography.caption,
  },
});
