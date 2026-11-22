import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiButton, NomiFeedback, NomiOptionCard, NomiScreenHeader, NomiText, NomiTextField } from '@/components';
import { displayBrazilianDate, parseBrazilianDate } from '@/features/voice/commitmentDate';
import type { ProposalKind } from '@/features/voice/proposalParsing';
import { useCapture } from '@/features/capture/CaptureProvider';
import { useCaptureCatalog } from '@/features/capture/useCaptureCatalog';

const KIND_OPTIONS: { value: ProposalKind; label: string }[] = [
  { value: 'exam', label: 'Prova' },
  { value: 'assignment', label: 'Trabalho' },
  { value: 'reminder', label: 'Lembrete' },
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Keeps only digits and inserts "/" after day and month while typing DD/MM/AAAA. */
function maskDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Keeps only digits and inserts ":" after the hour while typing HH:MM. */
function maskTime(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** Figma 04.04 "Editar compromisso": change the draft details before reviewing it again. */
export default function EditCommitmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const { draft, updateDraft } = useCapture();
  const catalog = useCaptureCatalog();

  const [title, setTitle] = useState(draft?.title ?? '');
  const [kind, setKind] = useState<ProposalKind>(draft?.kind ?? 'reminder');
  const [dateText, setDateText] = useState(draft?.localDate ? displayBrazilianDate(draft.localDate) : '');
  const [timeText, setTimeText] = useState(draft?.localTime ?? '');
  const [subjectId, setSubjectId] = useState<string | null>(draft?.subjectId ?? null);
  const [description, setDescription] = useState(draft?.description ?? '');
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!draft) router.replace('/capture/listen');
  }, [draft, router]);

  if (!draft) return null;

  const trimmedTitle = title.trim();
  const parsedDate = parseBrazilianDate(dateText);
  const errors = {
    title: !trimmedTitle ? 'Informe um título.' : trimmedTitle.length > 160 ? 'Use até 160 caracteres.' : undefined,
    date: parsedDate ? undefined : 'Use a data no formato DD/MM/AAAA.',
    time: timeText.trim() && !TIME_PATTERN.test(timeText.trim()) ? 'Use o horário no formato HH:MM, entre 00:00 e 23:59.' : undefined,
    description: description.trim().length > 4000 ? 'Use até 4000 caracteres.' : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const apply = () => {
    setAttempted(true);
    if (hasErrors || !parsedDate) return;
    const subject = subjectId ? catalog.subjects.find((item) => item.id === subjectId) ?? null : null;
    const professorId = subjectId === null
      ? null
      : subjectId === draft.subjectId
        ? draft.professorId
        : subject?.professorIds[0] ?? null;
    updateDraft({
      title: trimmedTitle,
      kind,
      localDate: parsedDate,
      localTime: timeText.trim() || null,
      subjectId,
      professorId,
      description: description.trim() || null,
    });
    router.replace('/capture/review');
  };

  return <ScrollView
    style={{ backgroundColor: colors.background }}
    contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(32, insets.bottom + 24) }]}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
  >
    <NomiScreenHeader title="Editar compromisso" backLabel="Voltar" fallbackHref="/capture/review" />

    <NomiText variant="supporting" tone="muted">Altere os detalhes antes de confirmar.</NomiText>

    <NomiTextField
      label="Título"
      value={title}
      onChangeText={setTitle}
      maxLength={160}
      accessibilityLabel="Título do compromisso"
      error={attempted ? errors.title : undefined}
    />

    <View style={styles.section}>
      <NomiText variant="caption" tone="accent">TIPO</NomiText>
      <View accessibilityRole="radiogroup" accessibilityLabel="Tipo do compromisso" style={styles.chips}>
        {KIND_OPTIONS.map((option) => {
          const selected = kind === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              onPress={() => setKind(option.value)}
              style={[styles.chip, { backgroundColor: selected ? colors.tint : colors.surface, borderColor: selected ? colors.accent : colors.border }]}
            >
              <NomiText variant="label" tone={selected ? 'accent' : 'text'}>{option.label}</NomiText>
            </Pressable>
          );
        })}
      </View>
    </View>

    <NomiTextField
      label="Data"
      value={dateText}
      onChangeText={(value) => setDateText(maskDate(value))}
      placeholder="DD/MM/AAAA"
      keyboardType="number-pad"
      maxLength={10}
      accessibilityLabel="Data do compromisso"
      error={attempted ? errors.date : undefined}
    />

    <NomiTextField
      label="Horário (opcional)"
      value={timeText}
      onChangeText={(value) => setTimeText(maskTime(value))}
      placeholder="HH:MM"
      keyboardType="number-pad"
      maxLength={5}
      accessibilityLabel="Horário do compromisso"
      error={attempted ? errors.time : undefined}
    />

    <View style={styles.section}>
      <NomiText variant="caption" tone="accent">MATÉRIA E PROFESSOR</NomiText>
      <View accessibilityRole="radiogroup" accessibilityLabel="Matéria do compromisso" style={styles.options}>
        <NomiOptionCard
          eyebrow="Opcional"
          title="Sem matéria"
          selected={subjectId === null}
          onPress={() => setSubjectId(null)}
        />
        {catalog.status === 'loading' ? (
          <NomiText variant="caption" tone="muted" accessibilityLiveRegion="polite">Carregando matérias…</NomiText>
        ) : null}
        {catalog.status === 'error' ? <>
          <NomiFeedback kind="error" title="Não foi possível carregar" message={catalog.message ?? 'Tente novamente.'} />
          <NomiButton label="Tentar novamente" variant="secondary" onPress={catalog.reload} />
        </> : null}
        {catalog.status === 'ready' ? catalog.subjects.map((subject) => {
          const professors = subject.professorIds
            .map((id) => catalog.professors.find((professor) => professor.id === id)?.name)
            .filter((name): name is string => Boolean(name));
          return (
            <NomiOptionCard
              key={subject.id}
              eyebrow={subject.code ?? 'Matéria'}
              title={subject.name}
              detail={professors.length ? professors.join(', ') : 'Sem professor'}
              selected={subjectId === subject.id}
              onPress={() => setSubjectId(subject.id)}
            />
          );
        }) : null}
      </View>
    </View>

    <NomiTextField
      label="Descrição (opcional)"
      value={description}
      onChangeText={setDescription}
      multiline
      maxLength={4000}
      textAlignVertical="top"
      inputStyle={styles.multiline}
      accessibilityLabel="Descrição do compromisso"
      error={attempted ? errors.description : undefined}
    />

    <View style={styles.spacer} />

    <NomiButton label="Aplicar alterações" onPress={apply} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, gap: 14 },
  section: { gap: 8 },
  chips: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, minHeight: 44, borderWidth: 2, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  options: { gap: 14 },
  multiline: { minHeight: 96 },
  spacer: { flex: 1, minHeight: spacing.md },
});
