import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NomiButton, NomiFeedback, NomiText } from '@/components';
import { NomiTabIcon } from '@/components/ui/NomiTabIcon';
import { MascotHalo } from '@/features/capture/MascotHalo';
import { useSemester } from '@/features/semester/SemesterProvider';
import { joinSubjectNames } from '@/features/semester/semesterParsing';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';

/** Figma 02.05 "Semestre pronto". */
export default function SemesterDoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const { savedNames, reset } = useSemester();
  const leaving = useRef(false);

  useEffect(() => {
    // Opened without a completed save (e.g. a deep link): nothing to celebrate. Leaving clears the list first, so skip then.
    if (!leaving.current && savedNames.length === 0) router.replace('/semester/permissions');
  }, [router, savedNames.length]);

  const leave = () => {
    leaving.current = true;
    router.replace('/(tabs)');
    reset();
  };

  const names = joinSubjectNames(savedNames);
  const message = savedNames.length === 1
    ? `${names} foi cadastrada com seu professor. Você pode corrigir os dados depois.`
    : `${names} foram cadastradas com seus professores. Você pode corrigir os dados depois.`;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.lg) }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar cadastro do semestre" onPress={leave} style={styles.back}>
          <NomiTabIcon name="back" color={colors.accent} />
        </Pressable>
        <NomiText accessibilityRole="header" variant="title" style={[styles.title, { color: colors.text }]}>Matérias cadastradas</NomiText>
      </View>
      <NomiFeedback kind="success" title="Seu semestre está organizado" message={message} />

      <View style={styles.spacer}>
        <MascotHalo pose="celebrating" size={200} />
      </View>

      <NomiButton label="Ir para hoje" onPress={leave} accessibilityHint="Fecha o cadastro do semestre." />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  spacer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  header: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1 },
});
