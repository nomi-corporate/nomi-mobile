import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiButton, NomiOptionCard, NomiScreenHeader, NomiText } from '@/components';
import { useCapture } from '@/features/capture/CaptureProvider';
import { MascotHalo } from '@/features/capture/MascotHalo';
import { commitmentDetail, eyebrowFor, longDate } from '@/features/capture/formatting';
import { resolveCommitmentNames, useCaptureCatalog } from '@/features/capture/useCaptureCatalog';
import { shiftDate, todayInZone } from '@/features/agenda/agendaDate';

type DateOption = { date: string; label: string };

/** Figma 04.02 "Confirmar data": choose the date when the Assistant did not resolve one. */
export default function ConfirmDateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const { draft, interpretation, timeZone, updateDraft } = useCapture();
  const catalog = useCaptureCatalog();
  const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (!draft) router.replace('/capture/listen');
  }, [draft, router]);

  const proposed = draft?.localDate ?? null;
  const options = useMemo<DateOption[]>(() => {
    if (proposed) return [
      { date: proposed, label: 'Data sugerida' },
      { date: shiftDate(proposed, 7), label: 'Na próxima semana' },
    ];
    const today = todayInZone(zone);
    return [{ date: today, label: 'Hoje' }, { date: shiftDate(today, 1), label: 'Amanhã' }];
  }, [proposed, zone]);

  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? options[0]?.date ?? null;

  if (!draft || !selected) return null;

  const question = interpretation.status === 'ready'
    ? interpretation.questions.find((item) => item.field === 'due')?.message
    : undefined;
  const names = catalog.status === 'ready' ? resolveCommitmentNames(draft, catalog) : null;
  const useDate = () => {
    updateDraft({ localDate: selected });
    router.replace('/capture/review');
  };

  return <ScrollView
    style={{ backgroundColor: colors.background }}
    contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(32, insets.bottom + 24) }]}
    showsVerticalScrollIndicator={false}
  >
    <NomiScreenHeader title="Confirmar data" backLabel="Voltar" fallbackHref="/capture/review" />

    <View style={styles.mascot}>
      <MascotHalo pose="thinking" size={180} />
    </View>

    <NomiText variant="body" tone="muted" accessibilityLiveRegion="polite">
      {question ?? 'Para quando é esse compromisso?'}
    </NomiText>

    <View accessibilityRole="radiogroup" accessibilityLabel="Data do compromisso" style={styles.options}>
      {options.map((option) => (
        <NomiOptionCard
          key={option.date}
          eyebrow={eyebrowFor(option.date, draft.localTime)}
          title={draft.title}
          detail={names ? `${option.label} · ${commitmentDetail(names.subjectName, names.professorName)}` : option.label}
          selected={selected === option.date}
          onPress={() => setPicked(option.date)}
        />
      ))}
    </View>

    <View style={styles.spacer} />

    <NomiButton label={`Usar ${longDate(selected)}`} onPress={useDate} />
    <NomiButton label="Escolher outra data" variant="secondary" onPress={() => router.push('/capture/edit')} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, gap: 14 },
  mascot: { alignItems: 'center', marginVertical: spacing.sm },
  options: { gap: 14 },
  spacer: { flex: 1, minHeight: spacing.md },
});
