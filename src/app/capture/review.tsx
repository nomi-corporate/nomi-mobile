import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiButton, NomiFeedback, NomiOptionCard, NomiScreenHeader, NomiText, NomiTextField } from '@/components';
import type { AgendaItem } from '@/features/academic/infrastructure/AcademicClient';
import { useCapture, type CaptureDraft } from '@/features/capture/CaptureProvider';
import { MascotHalo } from '@/features/capture/MascotHalo';
import { commitmentDetail, eyebrowFor, reminderLabel } from '@/features/capture/formatting';
import { resolveCommitmentNames, useCaptureCatalog } from '@/features/capture/useCaptureCatalog';
import { zonedToInstant } from '@/features/agenda/zonedTime';
import { loadReminderPreferences } from '@/features/reminders';
import { reminderTrigger, type ReminderPreferences } from '@/features/reminders/schedule';

/** Builds an unsaved AgendaItem from the draft so the reminder rules can preview the trigger. */
function previewReminder(draft: CaptureDraft, timeZone: string, prefs: ReminderPreferences, now: Date): Date | null {
  if (!draft.localDate) return null;
  let due: AgendaItem['due'];
  if (draft.localTime) {
    const resolved = zonedToInstant(draft.localDate, draft.localTime, timeZone);
    if (!resolved) return null;
    due = { precision: 'dateTime', localDate: draft.localDate, localTime: `${draft.localTime}:00`, offset: resolved.offset, timeZone, instant: resolved.instant.toISOString() };
  } else {
    due = { precision: 'date', localDate: draft.localDate, timeZone };
  }
  const item: AgendaItem = {
    id: 'preview', itemType: 'commitment', title: draft.title, description: null, kind: draft.kind,
    subjectId: draft.subjectId, subjectName: null, status: 'pending', displayDate: '', displayTime: null, due, version: 0,
  };
  return reminderTrigger(item, prefs, now);
}

/** Figma 04.03 "Revisar compromisso": confirm date, reminder and visibility before saving. */
export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const { draft, interpretation, timeZone, saving, saveError, save } = useCapture();
  const catalog = useCaptureCatalog();
  const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [reminder, setReminder] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) router.replace('/capture/listen');
    else if (!draft.localDate) router.replace('/capture/confirm-date');
  }, [draft, router]);

  const localDate = draft?.localDate ?? null;
  const localTime = draft?.localTime ?? null;

  useEffect(() => {
    if (!draft?.localDate) return;
    let active = true;
    loadReminderPreferences().then((prefs) => {
      if (!active) return;
      const now = new Date();
      setReminder(reminderLabel(previewReminder(draft, zone, prefs, now), now, zone));
    });
    return () => { active = false; };
  }, [draft, zone]);

  if (!draft || !localDate) return null;

  const names = catalog.status === 'ready' ? resolveCommitmentNames(draft, catalog) : null;
  const questions = interpretation.status === 'ready'
    ? interpretation.questions.filter((item) => item.field !== 'due')
    : [];

  const confirm = async () => {
    const item = await save();
    if (item) router.replace('/capture/saved');
  };

  return <ScrollView
    style={{ backgroundColor: colors.background }}
    contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(32, insets.bottom + 24) }]}
    showsVerticalScrollIndicator={false}
  >
    <NomiScreenHeader title="Revisar compromisso" backLabel="Voltar" fallbackHref="/capture/listen" />

    <NomiText variant="supporting" tone="muted">Revise data, lembrete e visibilidade.</NomiText>

    <View style={styles.mascot}>
      <MascotHalo pose="explaining" size={160} />
    </View>

    <NomiOptionCard
      eyebrow={eyebrowFor(localDate, localTime)}
      title={draft.title}
      detail={names ? commitmentDetail(names.subjectName, names.professorName) : undefined}
    />

    <NomiTextField readOnly label="Matéria" value={names?.subjectName ?? 'Sem matéria'} />
    <NomiTextField readOnly label="Lembrete" value={reminder ?? 'Calculando…'} />
    <NomiTextField readOnly label="Visibilidade" value="Só você · Privado" />

    {questions.map((item) => (
      <NomiText key={item.field + item.message} variant="caption" tone="accent">{item.message}</NomiText>
    ))}

    {saveError ? <NomiFeedback kind="error" title="Não foi possível salvar" message={saveError} /> : null}

    <View style={styles.spacer} />

    <NomiButton label="Confirmar compromisso" loading={saving} onPress={() => void confirm()} />
    <NomiButton label="Editar detalhes" variant="secondary" onPress={() => router.push('/capture/edit')} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, gap: 14 },
  mascot: { alignItems: 'center', marginVertical: spacing.sm },
  spacer: { flex: 1, minHeight: spacing.md },
});
