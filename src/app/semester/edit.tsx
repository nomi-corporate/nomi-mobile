import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NomiButton, NomiFeedback, NomiScreenHeader, NomiText, NomiTextField } from '@/components';
import { useAcademic } from '@/features/academic/AcademicProvider';
import type { Professor } from '@/features/academic/domain/academic';
import { useSemester, type SemesterItemInput } from '@/features/semester/SemesterProvider';
import { normalizeMatchKey, SEMESTER_PROFESSOR_NAME_MAX, SEMESTER_SUBJECT_CODE_MAX, SEMESTER_SUBJECT_NAME_MAX } from '@/features/semester/semesterParsing';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';

/** Figma 02.04 "Editar matéria". `index` is the position in the review list, or `new` to append a subject. */
export default function SemesterEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const academic = useAcademic();
  const params = useLocalSearchParams<{ index?: string | string[] }>();
  const rawIndex = Array.isArray(params.index) ? params.index[0] : params.index;
  const isNew = rawIndex === 'new';
  const position = Number(rawIndex);
  const { items, addItem, updateItem } = useSemester();
  const item = !isNew && Number.isInteger(position) ? items[position] : undefined;

  const [name, setName] = useState(item?.name ?? '');
  const [code, setCode] = useState(item?.code ?? '');
  const [professorName, setProfessorName] = useState(item?.professorName ?? '');
  const [existingProfessorId, setExistingProfessorId] = useState<string | null>(item?.existingProfessorId ?? null);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Existing professors to pick from; a failed load only hides the picker, the name can still be typed.
  useEffect(() => {
    let active = true;
    academic.listProfessors({ archived: false, limit: 100 })
      .then((page) => { if (active) setProfessors(page.items); })
      .catch(() => { if (active) setProfessors([]); });
    return () => { active = false; };
  }, [academic]);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/semester/review');
  };

  if (!isNew && !item) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(spacing.lg, insets.top + spacing.sm) }]}>
        <NomiScreenHeader title="Editar matéria" fallbackHref="/semester/review" />
        <NomiFeedback kind="error" title="Matéria não encontrada" message="Ela pode ter sido removida da revisão. Volte e tente novamente." />
        <NomiButton label="Voltar à revisão" variant="secondary" onPress={back} />
      </View>
    );
  }

  const choose = (professor: Professor) => {
    setProfessorName(professor.name);
    setExistingProfessorId(professor.id);
    setFormError(null);
  };

  const typeProfessor = (value: string) => {
    setProfessorName(value);
    // Typing a new name means the professor is no longer the one picked from the list.
    setExistingProfessorId(null);
    setFormError(null);
  };

  const apply = () => {
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    const trimmedProfessor = professorName.trim();
    if (!trimmedName || trimmedName.length > SEMESTER_SUBJECT_NAME_MAX) {
      setFormError(`Informe o nome da matéria, com até ${SEMESTER_SUBJECT_NAME_MAX} caracteres.`);
      return;
    }
    if (trimmedCode.length > SEMESTER_SUBJECT_CODE_MAX) {
      setFormError(`O código deve ter até ${SEMESTER_SUBJECT_CODE_MAX} caracteres.`);
      return;
    }
    if (trimmedProfessor.length > SEMESTER_PROFESSOR_NAME_MAX) {
      setFormError(`O nome do professor deve ter até ${SEMESTER_PROFESSOR_NAME_MAX} caracteres.`);
      return;
    }
    // A renamed subject no longer refers to the existing one it was matched with.
    const renamed = item !== undefined && normalizeMatchKey(item.name) !== normalizeMatchKey(trimmedName);
    const input: SemesterItemInput = {
      name: trimmedName,
      code: trimmedCode || null,
      professorName: trimmedProfessor || null,
      existingSubjectId: isNew || renamed ? null : item?.existingSubjectId ?? null,
      existingProfessorId: trimmedProfessor ? existingProfessorId : null,
    };
    if (isNew) addItem(input);
    else updateItem(position, input);
    back();
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.lg) }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <NomiScreenHeader title="Editar matéria" fallbackHref="/semester/review" />
      <NomiText variant="supporting" tone="muted">Confira a matéria, a professora e o horário.</NomiText>

      <NomiTextField
        label="Matéria"
        value={name}
        onChangeText={(value) => { setName(value); setFormError(null); }}
        maxLength={SEMESTER_SUBJECT_NAME_MAX}
        placeholder="Ex.: Cálculo I"
        returnKeyType="next"
      />
      <NomiTextField
        label="Código (opcional)"
        value={code}
        onChangeText={(value) => { setCode(value); setFormError(null); }}
        maxLength={SEMESTER_SUBJECT_CODE_MAX}
        placeholder="Ex.: MAT101"
        returnKeyType="next"
      />
      <NomiTextField
        label="Professor(a)"
        value={professorName}
        onChangeText={typeProfessor}
        maxLength={SEMESTER_PROFESSOR_NAME_MAX}
        placeholder="Nome do professor (opcional)"
        returnKeyType="done"
      />

      {professors.length > 0 ? (
        <View style={styles.options} accessibilityLabel="Professores cadastrados">
          <NomiText variant="caption" tone="muted">Professores já cadastrados</NomiText>
          {professors.map((professor) => {
            const selected = existingProfessorId === professor.id;
            return (
              <Pressable
                key={professor.id}
                accessibilityRole="button"
                accessibilityLabel={`Escolher ${professor.name}`}
                accessibilityState={{ selected }}
                onPress={() => choose(professor)}
                style={[styles.option, { borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.tint : colors.surface }]}
              >
                <NomiText variant="label">{professor.name}</NomiText>
                <NomiText variant="caption" tone="muted">{selected ? 'Selecionado' : 'Toque para escolher'}</NomiText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <NomiTextField
        label="Horário"
        value="Em breve: grade de aulas"
        readOnly
        editable={false}
        accessibilityHint="O horário ainda não pode ser editado aqui."
      />

      {formError ? <NomiFeedback kind="error" title="Confira os dados" message={formError} /> : null}

      <View style={styles.spacer} />

      <NomiButton label="Aplicar" onPress={apply} disabled={!name.trim()} accessibilityHint="Salva as alterações e volta para a revisão." />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  options: { gap: spacing.sm },
  option: { minHeight: 64, borderWidth: 1, borderRadius: 14, padding: spacing.sm, gap: spacing.xs, justifyContent: 'center' },
  spacer: { flexGrow: 1, minHeight: spacing.md },
});
