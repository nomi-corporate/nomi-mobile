import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { useAcademic } from '@/features/academic/AcademicProvider';
import type { Professor, Subject } from '@/features/academic/domain/academic';
import { createIdempotencyKey } from '@/features/academic/infrastructure/AcademicClient';
import { NomiAgendaItem, NomiButton, NomiCard, NomiEmptyState, NomiFeedback, NomiText, NomiTextField, type NomiSubject } from '@/components';
import { NomiScreenHeader } from '@/components/ui/NomiScreenHeader';

function iconForSubject(subject: Subject): NomiSubject | undefined {
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

export default function SubjectsScreen() {
  const { colorScheme } = useNomiTheme();
  const insets = useSafeAreaInsets();
  const colors = palettes[colorScheme];
  const client = useAcademic();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [archivedView, setArchivedView] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [professorIds, setProfessorIds] = useState<string[]>([]);
  const [success, setSuccess] = useState<string>();
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string>();
  const createIntent = useRef<{ signature: string; key: string } | null>(null);
  const loadGeneration = useRef(0);

  const load = useCallback(async (refresh = false) => {
    const generation = ++loadGeneration.current;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      const [result, activeProfessors, archivedProfessors] = await Promise.all([
        client.listSubjects({ query, archived: archivedView }),
        listAllProfessors(client, false),
        listAllProfessors(client, true),
      ]);
      if (generation !== loadGeneration.current) return;
      setSubjects(result.items);
      setNextCursor(result.nextCursor);
      setProfessors([...activeProfessors, ...archivedProfessors]);
    } catch (cause) {
      if (generation !== loadGeneration.current) return;
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar suas matérias.');
    } finally {
      if (generation === loadGeneration.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [client, query, archivedView]);

  useEffect(() => { void load(); return () => { ++loadGeneration.current; }; }, [load]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore || loading || refreshing) return;
    const generation = loadGeneration.current;
    setLoadingMore(true);
    try {
      const page = await client.listSubjects({ query, archived: archivedView, cursor: nextCursor });
      if (generation !== loadGeneration.current) return;
      setSubjects(current => [...current, ...page.items.filter(item => !current.some(existing => existing.id === item.id))]);
      setNextCursor(page.nextCursor);
    } catch (cause) {
      if (generation === loadGeneration.current) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar mais matérias.');
    } finally { setLoadingMore(false); }
  };

  const create = async () => {
    const name = draft.trim();
    if (!name || saving) return;
    setSaving(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      const signature = JSON.stringify({ name });
      if (createIntent.current?.signature !== signature) {
        createIntent.current = { signature, key: createIdempotencyKey() };
      }
      const subject = await client.createSubject({ name }, createIntent.current.key);
      await load();
      setSuccess('Matéria cadastrada.');
      createIntent.current = null;
      setDraft('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível cadastrar a matéria.');
    } finally { setSaving(false); }
  };

  const selected = subjects.find((subject) => subject.id === selectedId) ?? null;
  const openEditor = async (subject: Subject) => {
    setError(undefined);
    setSuccess(undefined);
    setMutating(true);
    const generation = loadGeneration.current;
    try {
      const current = await client.getSubject(subject.id);
      if (generation !== loadGeneration.current) return;
      setSubjects(items => items.map(item => item.id === current.id ? current : item));
      setSelectedId(current.id);
      setEditName(current.name);
      setEditCode(current.code ?? '');
      setProfessorIds(current.professorIds ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível abrir a matéria.');
    } finally { setMutating(false); }
  };

  const saveEdit = async () => {
    if (!selected || !editName.trim() || mutating || selected.version === undefined) return;
    setMutating(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      const updated = await client.updateSubject(selected.id, selected.version, {
        name: editName.trim(),
        code: editCode.trim() || null,
      });
      setSubjects((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelectedId(null);
      setSuccess('Matéria atualizada.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a matéria.');
    } finally { setMutating(false); }
  };

  const archive = async (archived: boolean) => {
    if (!selected || mutating || selected.version === undefined) return;
    setMutating(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      await client.archiveSubject(selected.id, selected.version, archived);
      setSubjects((current) => current.filter((item) => item.id !== selected.id));
      setSelectedId(null);
      setSuccess(archived ? 'Matéria arquivada.' : 'Matéria reativada.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível arquivar a matéria.');
    } finally { setMutating(false); }
  };

  const confirmArchive = () => {
    if (!selected || mutating) return;
    const archived = !selected.archived;
    Alert.alert(archived ? 'Arquivar matéria?' : 'Reativar matéria?', archived
      ? 'A matéria sairá das seleções ativas. Compromissos, anotações e vínculos históricos serão preservados.'
      : 'A matéria voltará às seleções ativas.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: archived ? 'Arquivar' : 'Reativar', onPress: () => void archive(archived) },
    ]);
  };

  const saveProfessors = async () => {
    if (!selected || mutating || selected.version === undefined) return;
    setMutating(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      const updated = await client.replaceSubjectProfessors(selected.id, selected.version, professorIds);
      setSubjects(current => current.map(item => item.id === updated.id ? updated : item));
      setProfessorIds(updated.professorIds);
      setSuccess('Vínculos atualizados.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar os vínculos.');
    } finally { setMutating(false); }
  };

  return <ScrollView
    style={{ backgroundColor: colors.background }}
    contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(112, insets.bottom + 80) }]}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setSelectedId(null); void load(true); }} tintColor={colors.accent} />}
    keyboardShouldPersistTaps="handled"
  >
    <NomiScreenHeader title="Matérias" />
    <NomiText variant="supporting" tone="muted" style={styles.description}>Cadastre e acompanhe as disciplinas do seu semestre.</NomiText>
    <NomiButton label="Cadastrar matérias por voz" accessibilityHint="Abre o cadastro do semestre por voz ou texto." onPress={() => router.push('/semester/permissions')} />
    <NomiButton label="Gerenciar professores" variant="secondary" onPress={() => router.push('/menu/professors')} />

    <View accessibilityRole="radiogroup" accessibilityLabel="Lista de matérias" style={styles.searchRow}>
      {[false, true].map(archived => <Pressable key={String(archived)} accessibilityRole="radio"
        accessibilityLabel={archived ? 'Matérias arquivadas' : 'Matérias ativas'}
        accessibilityState={{ selected: archivedView === archived, disabled: mutating || saving }}
        disabled={mutating || saving}
        onPress={() => { setSelectedId(null); setArchivedView(archived); }}
        style={[styles.filter, { borderColor: archivedView === archived ? colors.accent : colors.border, backgroundColor: archivedView === archived ? colors.tint : colors.surface }]}>
        <NomiText variant="label" tone={archivedView === archived ? 'accent' : 'muted'}>{archived ? 'Arquivadas' : 'Ativas'}</NomiText>
      </Pressable>)}
    </View>

    {!archivedView ? <NomiCard style={styles.addCard}>
      <NomiText variant="caption" tone="accent" style={styles.label}>NOVA MATÉRIA</NomiText>
      <NomiTextField label="Nome da nova matéria" value={draft} onChangeText={setDraft} maxLength={120} placeholder="Ex.: Cálculo I" onSubmitEditing={() => void create()} returnKeyType="done" />
      <NomiButton label="Adicionar matéria" onPress={() => void create()} disabled={!draft.trim()} loading={saving} />
    </NomiCard> : null}

    <View style={styles.searchRow}>
      <NomiTextField label="Buscar matérias" value={query} onChangeText={value => { setSelectedId(null); setQuery(value); }} placeholder="Ex.: Cálculo I" returnKeyType="search" containerStyle={styles.searchField} />
      <NomiButton label="Atualizar" variant="secondary" onPress={() => { setSelectedId(null); void load(); }} />
    </View>

    {error ? <View style={styles.feedbackBlock}><NomiFeedback kind="error" title="Não foi possível concluir" message={error} /><NomiButton label={selected ? 'Recarregar dados e fechar edição' : 'Tentar novamente'} variant="secondary" onPress={() => { setSelectedId(null); void load(); }} /></View> : null}
    {success ? <NomiFeedback kind="success" title="Pronto" message={success} /> : null}
    {loading ? <NomiFeedback kind="loading" title="Carregando matérias" message="Estamos buscando as disciplinas do seu semestre." /> : null}
    {!loading && !error && subjects.length === 0 ? <NomiEmptyState kind={query ? 'search' : 'book'} title={query ? 'Nenhum resultado' : archivedView ? 'Nenhuma matéria arquivada' : 'Nenhuma matéria ainda'} message={query ? 'Tente buscar por outro nome ou código.' : archivedView ? 'As matérias arquivadas aparecerão aqui.' : 'Adicione sua primeira disciplina para começar a organizar seu semestre.'} /> : null}
    {selected ? <NomiCard style={styles.editor}>
      <NomiText variant="caption" tone="accent" style={styles.label}>EDITAR MATÉRIA</NomiText>
      <NomiTextField label="Nome da matéria" value={editName} onChangeText={setEditName} maxLength={120} />
      <NomiTextField label="Código da matéria" value={editCode} onChangeText={setEditCode} maxLength={40} placeholder="Código (opcional)" />
      <View style={styles.editorActions}>
        <NomiButton label="Salvar alterações" onPress={() => void saveEdit()} disabled={!editName.trim() || mutating} loading={mutating} />
        <NomiButton label={selected.archived ? 'Reativar matéria' : 'Arquivar matéria'} variant="secondary" onPress={confirmArchive} disabled={mutating} />
        <NomiButton label="Cancelar" variant="tertiary" onPress={() => setSelectedId(null)} disabled={mutating} />
      </View>
      <NomiText variant="label">Professores vinculados</NomiText>
      {professors.length === 0 ? <NomiText tone="muted">Cadastre um professor em Gerenciar professores.</NomiText> : professors.map(professor => {
        const checked = professorIds.includes(professor.id);
        return <Pressable key={professor.id} accessibilityRole="checkbox"
          accessibilityLabel={`Vincular ${professor.name}${professor.archived ? ' (arquivado)' : ''}`}
          accessibilityState={{ checked, disabled: mutating || professor.archived && !checked }}
          disabled={mutating || professor.archived && !checked}
          onPress={() => setProfessorIds(ids => checked ? ids.filter(id => id !== professor.id) : [...ids, professor.id])}
          style={[styles.linkOption, { borderColor: checked ? colors.accent : colors.border, backgroundColor: checked ? colors.tint : colors.surface }]}>
          <NomiText variant="label">{professor.name}{professor.archived ? ' · Arquivado' : ''}</NomiText>
          <NomiText variant="caption" tone="muted">{checked ? 'Vinculado · toque para remover' : professor.archived ? 'Reative o professor antes de vincular' : 'Toque para vincular'}</NomiText>
        </Pressable>;
      })}
      <NomiButton label="Salvar vínculos" variant="secondary" onPress={() => void saveProfessors()} disabled={mutating || JSON.stringify([...professorIds].sort()) === JSON.stringify([...(selected.professorIds ?? [])].sort())} loading={mutating} />
    </NomiCard> : null}
    {!loading ? <View style={styles.list}>{subjects.map((subject, index) => <NomiAgendaItem key={subject.id} accessibilityLabel={`Editar ${subject.name}`} onPress={() => { if (!mutating) void openEditor(subject); }} eyebrow={`${subject.archived ? 'ARQUIVADA' : 'MATÉRIA'} ${String(index + 1).padStart(2, '0')}`} title={subject.name} detail={[subject.code, ...professors.filter(professor => subject.professorIds?.includes(professor.id)).map(professor => professor.name)].filter(Boolean).join(' · ') || 'Toque para editar'} subject={iconForSubject(subject)} />)}</View> : null}
    {nextCursor && !loading ? <NomiButton label="Carregar mais matérias" variant="secondary" onPress={() => void loadMore()} loading={loadingMore} /> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.md },
  description: {},
  addCard: { gap: spacing.sm, marginTop: spacing.sm },
  label: { letterSpacing: 0.4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchField: { flex: 1 },
  feedbackBlock: { gap: spacing.sm },
  list: { gap: spacing.sm },
  editor: { gap: spacing.sm },
  editorActions: { gap: spacing.sm },
  filter: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  linkOption: { minHeight: 64, borderWidth: 1, borderRadius: 14, padding: spacing.sm, gap: spacing.xs },
});

async function listAllProfessors(client: ReturnType<typeof useAcademic>, archived: boolean): Promise<Professor[]> {
  const result: Professor[] = [];
  const visited = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < 100; page += 1) {
    const response = await client.listProfessors({ archived, cursor, limit: 100 });
    result.push(...response.items);
    if (!response.nextCursor) return result;
    if (visited.has(response.nextCursor)) throw new Error('Não foi possível carregar a lista completa de professores. Tente novamente.');
    visited.add(response.nextCursor);
    cursor = response.nextCursor;
  }
  throw new Error('Não foi possível carregar todos os professores. Tente novamente.');
}
