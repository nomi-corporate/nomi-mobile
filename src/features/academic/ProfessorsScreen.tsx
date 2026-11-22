import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NomiAgendaItem, NomiButton, NomiCard, NomiEmptyState, NomiFeedback, NomiLogo, NomiText, NomiTextField, type NomiSubject } from '@/components';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { isValidEmail } from '@/features/auth/domain/registrationValidation';
import { useAcademic } from './AcademicProvider';
import { AcademicApiError, createIdempotencyKey } from './infrastructure/AcademicClient';
import type { Professor, Subject } from './domain/academic';

type FormState = { name: string; email: string; office: string };
type Intent = { signature: string; key: string };

const emptyForm: FormState = { name: '', email: '', office: '' };

function subjectIcon(subject: Subject): NomiSubject | undefined {
  const value = `${subject.name} ${subject.code ?? ''}`.toLocaleLowerCase('pt-BR');
  if (/(cálculo|calculo|matemát|matemat)/.test(value)) return 'calculo-matematica';
  if (/físic|fisic/.test(value)) return 'fisica';
  if (/químic|quimic/.test(value)) return 'quimica';
  if (/biolog/.test(value)) return 'biologia';
  if (/program|código|codigo|comput/.test(value)) return 'programacao';
  if (/engenharia de software|software/.test(value)) return 'engenharia-software';
  if (/portugu|literatura/.test(value)) return 'portugues-literatura';
  if (/histór|histor/.test(value)) return 'historia';
  return undefined;
}

async function loadSubjects(client: ReturnType<typeof useAcademic>): Promise<Subject[]> {
  const result: Subject[] = [];
  const visited = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < 100; page += 1) {
    const response = await client.listSubjects({ archived: false, cursor, limit: 100 });
    result.push(...response.items);
    const next = response.nextCursor;
    if (!next) return result;
    if (visited.has(next)) throw new Error('A paginação de matérias retornou um cursor repetido. Atualize e tente novamente.');
    visited.add(next);
    cursor = next;
  }
  throw new Error('Há muitos resultados para carregar agora. Refine a lista de matérias e tente novamente.');
}

export function ProfessorsScreen() {
  const client = useAcademic();
  const { colorScheme } = useNomiTheme();
  const insets = useSafeAreaInsets();
  const colors = palettes[colorScheme];
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [archivedView, setArchivedView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formVisible, setFormVisible] = useState(false);
  const [selected, setSelected] = useState<Professor | null>(null);
  const createIntent = useRef<Intent | null>(null);

  const load = useCallback(async (refresh = false, showLoader = true) => {
    if (showLoader) refresh ? setRefreshing(true) : setLoading(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      const [page, subjectList] = await Promise.all([
        client.listProfessors({ archived: archivedView, limit: 100 }),
        loadSubjects(client),
      ]);
      setProfessors(page.items);
      setNextCursor(page.nextCursor);
      setSubjects(subjectList);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar seus professores.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [archivedView, client]);

  useEffect(() => { void load(); }, [load]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(undefined);
    try {
      const page = await client.listProfessors({ archived: archivedView, cursor: nextCursor, limit: 100 });
      setProfessors((current) => [...current, ...page.items.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setNextCursor(page.nextCursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar mais professores.');
    } finally { setLoadingMore(false); }
  };

  const subjectNamesByProfessor = useMemo(() => {
    const byId = new Map<string, string[]>();
    for (const subject of subjects) {
      for (const id of subject.professorIds ?? []) {
        const names = byId.get(id) ?? [];
        names.push(subject.name);
        byId.set(id, names);
      }
    }
    return byId;
  }, [subjects]);

  const updateForm = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError(undefined);
    setSuccess(undefined);
  };

  const beginCreate = () => {
    setSelected(null);
    setForm(emptyForm);
    setFormVisible(true);
    createIntent.current = null;
    setFormError(undefined);
    setSuccess(undefined);
  };

  const beginEdit = (professor: Professor) => {
    setSelected(professor);
    setForm({ name: professor.name, email: professor.email ?? '', office: professor.office ?? '' });
    setFormVisible(true);
    createIntent.current = null;
    setFormError(undefined);
    setSuccess(undefined);
  };

  const save = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const office = form.office.trim();
    if (!name || name.length > 120) {
      setFormError('Informe o nome do professor, com até 120 caracteres.');
      return;
    }
    if (email && !isValidEmail(email)) {
      setFormError('Informe um e-mail válido ou deixe o campo vazio.');
      return;
    }
    if (office.length > 160) {
      setFormError('A sala ou o local deve ter até 160 caracteres.');
      return;
    }

    setSaving(true);
    setFormError(undefined);
    setError(undefined);
    try {
      if (selected) {
        setMutating(true);
        const updated = await client.updateProfessor(selected.id, selected.version, { name, email: email || null, office: office || null });
        setProfessors((current) => current.map((item) => item.id === updated.id ? updated : item));
        setSelected(updated);
        setSuccess('As alterações foram salvas.');
      } else {
        const signature = JSON.stringify({ name, email: email || null, office: office || null });
        if (createIntent.current?.signature !== signature) {
          createIntent.current = { signature, key: createIdempotencyKey() };
        }
        const created = await client.createProfessor({ name, email: email || null, office: office || null }, createIntent.current.key);
        createIntent.current = null;
        setProfessors((current) => [created, ...current.filter((item) => item.id !== created.id)]);
        setSelected(created);
        setForm({ name: created.name, email: created.email ?? '', office: created.office ?? '' });
        setSuccess('Professor cadastrado.');
      }
    } catch (cause) {
      if (cause instanceof AcademicApiError && cause.status === 412) {
        setSelected(null);
        setForm(emptyForm);
        setFormVisible(false);
        setError('O professor foi alterado desde que você abriu a edição. Atualize a lista e abra o cadastro novamente.');
      } else {
        setFormError(cause instanceof Error ? cause.message : 'Não foi possível salvar o professor.');
      }
    } finally {
      setSaving(false);
      setMutating(false);
    }
  };

  const confirmArchive = (professor: Professor) => {
    const nextArchived = !archivedView;
    Alert.alert(
      nextArchived ? 'Arquivar professor?' : 'Reativar professor?',
      nextArchived ? 'O professor deixa de aparecer na lista ativa. O histórico das matérias será preservado.' : 'O professor volta a aparecer na lista ativa.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: nextArchived ? 'Arquivar' : 'Reativar', onPress: () => { void archive(professor, nextArchived); } },
      ],
    );
  };

  const archive = async (professor: Professor, archived: boolean) => {
    setMutating(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      const updated = await client.archiveProfessor(professor.id, professor.version, archived);
      setProfessors((current) => current.filter((item) => item.id !== updated.id));
      if (selected?.id === updated.id) {
        setSelected(null);
        setForm(emptyForm);
        setFormVisible(false);
      }
      setSuccess(archived ? 'Professor arquivado.' : 'Professor reativado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o professor.');
    } finally { setMutating(false); }
  };

  return <ScrollView
    style={{ backgroundColor: colors.background }}
    contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(112, insets.bottom + 80) }]}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.accent} />}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.brand}><NomiLogo width={104} /></View>
    <View style={styles.heading}>
      <NomiText accessibilityRole="header" variant="display">Professores</NomiText>
      <NomiText variant="supporting" tone="muted">
        {loading ? 'Carregando professores' : `Seu semestre · ${professors.length}${nextCursor ? '+' : ''} ${professors.length === 1 && !nextCursor ? 'professor' : 'professores'}${archivedView ? ' arquivados' : ''}`}
      </NomiText>
    </View>

    <View accessibilityRole="radiogroup" accessibilityLabel="Lista de professores" style={styles.filterRow}>
      {[false, true].map((archived) => {
        const selectedFilter = archivedView === archived;
        return <Pressable
          key={String(archived)}
          accessibilityRole="radio"
          accessibilityLabel={archived ? 'Professores arquivados' : 'Professores ativos'}
          accessibilityState={{ selected: selectedFilter }}
          onPress={() => { if (archivedView !== archived) { setSelected(null); setForm(emptyForm); setFormVisible(false); createIntent.current = null; setArchivedView(archived); } }}
          style={[styles.filterOption, { borderColor: selectedFilter ? colors.accent : colors.border, backgroundColor: selectedFilter ? colors.tint : colors.surface }]}
        >
          <NomiText variant="label" style={{ color: selectedFilter ? colors.accent : colors.muted }}>{archived ? 'Arquivados' : 'Ativos'}</NomiText>
        </Pressable>;
      })}
    </View>

    {error ? <View style={styles.feedbackBlock}>
      <NomiFeedback kind="error" title="Não foi possível concluir" message={error} />
      <NomiButton label="Tentar novamente" variant="secondary" onPress={() => void load(true)} />
    </View> : null}
    {success ? <NomiFeedback kind="success" title="Pronto" message={success} /> : null}
    {loading ? <NomiFeedback kind="loading" title="Carregando professores" message="Estamos buscando seus professores no serviço acadêmico." /> : null}
    {!loading && !error && professors.length === 0 ? <NomiEmptyState
      kind="book"
      title={archivedView ? 'Nenhum professor arquivado' : 'Nenhum professor ainda'}
      message={archivedView ? 'Quando você arquivar um professor, ele aparecerá aqui.' : 'Cadastre seus professores para relacioná-los às matérias do semestre.'}
    /> : null}

    <View style={styles.list}>
      {professors.map((professor, index) => {
        const assignedNames = subjectNamesByProfessor.get(professor.id) ?? [];
        const detail = [assignedNames.length ? assignedNames.join(' · ') : undefined, professor.office || undefined].filter(Boolean).join(' · ');
        const firstAssignedSubject = subjects.find((item) => assignedNames.includes(item.name));
        const iconSubject = firstAssignedSubject ? subjectIcon(firstAssignedSubject) : undefined;
        return <View key={professor.id} style={styles.professorItem}>
          <NomiAgendaItem
            accessibilityLabel={`Editar professor ${professor.name}`}
            onPress={() => beginEdit(professor)}
            eyebrow={assignedNames.length ? assignedNames.join(' · ').toLocaleUpperCase('pt-BR') : `PROFESSOR ${String(index + 1).padStart(2, '0')}`}
            title={professor.name}
            detail={detail || 'Sem matérias vinculadas'}
            subject={iconSubject}
          />
          <NomiButton label={archivedView ? 'Reativar' : 'Arquivar'} variant="secondary" disabled={mutating} onPress={() => confirmArchive(professor)} />
        </View>;
      })}
    </View>

    {nextCursor ? <NomiButton label="Carregar mais professores" variant="secondary" loading={loadingMore} onPress={() => void loadMore()} /> : null}

    {!archivedView ? <>
      <NomiButton
        label={selected ? 'Cancelar edição' : formVisible ? 'Ocultar formulário' : 'Cadastrar professor'}
        onPress={() => {
          if (selected) {
            setSelected(null);
            setForm(emptyForm);
            setFormVisible(false);
            setFormError(undefined);
          } else if (formVisible) {
            setFormVisible(false);
            createIntent.current = null;
          } else beginCreate();
        }}
        disabled={saving || mutating}
      />
      {formVisible ? <NomiCard style={styles.form}>
        <NomiText variant="caption" tone="accent">{selected ? 'EDITAR PROFESSOR' : 'NOVO PROFESSOR'}</NomiText>
        <NomiTextField label="Nome do professor" value={form.name} onChangeText={(value) => updateForm('name', value)} maxLength={120} autoCapitalize="words" />
        <NomiTextField label="E-mail (opcional)" value={form.email} onChangeText={(value) => updateForm('email', value)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={254} />
        <NomiTextField label="Sala ou local (opcional)" value={form.office} onChangeText={(value) => updateForm('office', value)} maxLength={160} />
        {formError ? <NomiFeedback kind="error" title="Confira os dados" message={formError} /> : null}
        <NomiButton label={selected ? 'Salvar alterações' : 'Salvar professor'} onPress={() => void save()} disabled={!form.name.trim() || saving || mutating} loading={saving} />
        {selected ? <NomiButton label="Arquivar professor" variant="secondary" disabled={mutating} onPress={() => confirmArchive(selected)} /> : null}
        <NomiButton label="Cancelar" variant="tertiary" disabled={saving || mutating} onPress={() => { setSelected(null); setForm(emptyForm); setFormVisible(false); setFormError(undefined); createIntent.current = null; }} />
      </NomiCard> : null}
    </> : null}

    <NomiButton label="Voltar às matérias" variant="secondary" onPress={() => router.replace('/menu/subjects')} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  brand: { minHeight: 42, justifyContent: 'center' },
  heading: { gap: spacing.xs },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterOption: { minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 14 },
  feedbackBlock: { gap: spacing.sm },
  list: { gap: spacing.sm },
  professorItem: { gap: spacing.xs },
  form: { gap: spacing.sm },
});
