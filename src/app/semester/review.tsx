import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NomiAgendaItem, NomiButton, NomiFeedback, NomiScreenHeader, NomiText } from '@/components';
import { useSemester, SEMESTER_UNAVAILABLE_MESSAGE } from '@/features/semester/SemesterProvider';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';

/** Figma 02.03 "Revisar matérias": confirm the subjects read from the voice or text before saving them. */
export default function SemesterReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const { items, questions, interpretation, removeItem, save, saving, saveError } = useSemester();

  // Without an interpretation (e.g. a deep link) there is nothing to review.
  useEffect(() => {
    if (interpretation.status === 'idle') router.replace('/semester/listen');
  }, [interpretation.status, router]);

  const allSaved = items.length > 0 && items.every((item) => item.status === 'saved');
  const unavailable = interpretation.status === 'unavailable';

  const submit = async () => {
    const saved = await save();
    if (saved) router.replace('/semester/done');
  };

  const correct = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/semester/listen');
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.lg) }]}
      showsVerticalScrollIndicator={false}
    >
      <NomiScreenHeader title="Revisar matérias" backLabel="Voltar para falar" fallbackHref="/semester/listen" />
      <NomiText variant="supporting" tone="muted">Revise os nomes antes de salvar.</NomiText>

      {unavailable ? (
        <NomiText variant="caption" tone="accent" accessibilityLiveRegion="polite">{SEMESTER_UNAVAILABLE_MESSAGE}</NomiText>
      ) : null}
      {questions.map((question, index) => (
        <NomiText key={`${question.field}-${index}`} variant="caption" tone="accent" accessibilityLiveRegion="polite">
          {question.message}
        </NomiText>
      ))}

      <View style={styles.list}>
        {items.map((item, index) => {
          const number = String(index + 1).padStart(2, '0');
          const professorLine = item.professorName ? `Prof. ${item.professorName}` : 'Sem professor';
          return (
            <View key={item.clientKey} style={styles.itemBlock}>
              <NomiAgendaItem
                accessibilityLabel={`Editar ${item.name}`}
                accessibilityHint="Abre a edição desta matéria."
                disabled={saving}
                eyebrow={`MATÉRIA ${number}`}
                title={item.name}
                detail={`${professorLine} · Horário ainda não informado`}
                onPress={() => router.push(`/semester/edit?index=${index}`)}
              />
              <View style={styles.itemFooter}>
                <View style={styles.badges}>
                  {item.existingSubjectId ? <NomiText variant="caption" tone="accent">Já cadastrada</NomiText> : null}
                  {item.existingProfessorId ? <NomiText variant="caption" tone="accent">Professor já cadastrado</NomiText> : null}
                  {item.status === 'saved' ? <NomiText variant="caption" tone="success">Salva</NomiText> : null}
                  {item.status === 'failed' && item.error ? <NomiText variant="caption" tone="error">{item.error}</NomiText> : null}
                </View>
                {item.status !== 'saved' ? (
                  <NomiButton
                    label="Remover"
                    variant="tertiary"
                    disabled={saving}
                    accessibilityLabel={`Remover ${item.name}`}
                    onPress={() => removeItem(index)}
                  />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {items.length === 0 && !unavailable ? (
        <NomiText variant="supporting" tone="muted">Nenhuma matéria encontrada. Adicione uma para continuar.</NomiText>
      ) : null}

      <NomiButton
        label="Adicionar matéria"
        variant="tertiary"
        disabled={saving}
        onPress={() => router.push('/semester/edit?index=new')}
      />

      {saveError ? <NomiFeedback kind="error" title="Não foi possível salvar" message={saveError} /> : null}

      <View style={styles.spacer} />

      <View style={styles.actions}>
        <NomiButton
          label="Salvar minhas matérias"
          loading={saving}
          disabled={saving || items.length === 0 || allSaved}
          onPress={() => void submit()}
        />
        <NomiButton label="Corrigir informações" variant="secondary" disabled={saving} onPress={correct} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  list: { gap: spacing.sm },
  itemBlock: { gap: spacing.xs },
  itemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.xs },
  badges: { flex: 1, gap: 2 },
  spacer: { flexGrow: 1, minHeight: spacing.md },
  actions: { gap: spacing.sm },
});
