import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NomiButton, NomiCard, NomiEmptyState, NomiFeedback, NomiText, NomiTextField } from '@/components';
import { useAcademic } from '@/features/academic/AcademicProvider';
import { createIdempotencyKey, type StudyGroup } from '@/features/academic/infrastructure/AcademicClient';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';

export function GroupsScreen() {
  const client = useAcademic();
  const { colorScheme } = useNomiTheme();
  const insets = useSafeAreaInsets();
  const colors = palettes[colorScheme];
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [formVisible, setFormVisible] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<StudyGroup>();
  const [detailError, setDetailError] = useState<string>();
  const generation = useRef(0);
  const intent = useRef<{ signature: string; key: string } | null>(null);

  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError(undefined);
    try {
      const page = await client.listGroups();
      if (current === generation.current) { setGroups(page.items); setCursor(page.nextCursor); }
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar grupos.');
    } finally { if (current === generation.current) setLoading(false); }
  }, [client]);

  useFocusEffect(useCallback(() => {
    void load();
    return () => { ++generation.current; };
  }, [load]));

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    const current = generation.current;
    const requested = cursor;
    setLoadingMore(true);
    try {
      const page = await client.listGroups(requested);
      if (current !== generation.current) return;
      if (page.nextCursor === requested) throw new Error('A lista repetiu uma página. Atualize e tente novamente.');
      setGroups((previous) => [...previous, ...page.items]);
      setCursor(page.nextCursor);
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar mais grupos.');
    } finally { if (current === generation.current) setLoadingMore(false); }
  };

  const save = async () => {
    if (!name.trim() || saving) return;
    const signature = JSON.stringify([name.trim(), description.trim() || null]);
    if (intent.current?.signature !== signature) intent.current = { signature, key: createIdempotencyKey() };
    setSaving(true);
    setFormError(undefined);
    setSuccess(undefined);
    try {
      const created = await client.createGroup(name, description, intent.current.key);
      setGroups((previous) => [created, ...previous.filter((item) => item.id !== created.id)]);
      setName('');
      setDescription('');
      setFormVisible(false);
      intent.current = null;
      setSuccess('Grupo criado e salvo na sua conta.');
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'Não foi possível criar o grupo.'); }
    finally { setSaving(false); }
  };

  const openDetail = async (id: string) => {
    setDetailError(undefined);
    try { setSelected(await client.getGroup(id)); }
    catch (cause) { setDetailError(cause instanceof Error ? cause.message : 'Não foi possível abrir o grupo.'); }
  };

  return <ScrollView
    style={[styles.screen, { backgroundColor: colors.background }]}
    contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(spacing.xl * 3, insets.bottom + 80) }]}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.heading}>
      <NomiText accessibilityRole="header" variant="title">Meus grupos</NomiText>
      <NomiText variant="supporting" tone="muted">Seus grupos de estudo</NomiText>
    </View>

    {loading ? <NomiFeedback kind="loading" title="Carregando grupos" message="Consultando seus grupos de estudo." /> : null}
    {error ? <NomiCard tone="error" style={styles.card}><NomiText variant="body">{error}</NomiText><NomiButton label="Tentar novamente" variant="secondary" onPress={() => void load()} /></NomiCard> : null}
    {success ? <NomiFeedback kind="success" title="Grupo criado" message={success} /> : null}
    {!loading && !error && groups.length === 0 ? <NomiEmptyState kind="users" title="Você ainda não tem grupos" message="Crie um grupo de estudo para começar a organizar sua turma." /> : null}
    {groups.map((group) => <NomiCard key={group.id} style={styles.card}>
      <NomiText variant="caption" tone="accent">{group.role === 'owner' ? 'PROPRIETÁRIO' : group.role === 'admin' ? 'ADMINISTRADOR' : 'MEMBRO'}</NomiText>
      <NomiText variant="heading">{group.name}</NomiText>
      {group.description ? <NomiText variant="supporting" tone="muted">{group.description}</NomiText> : null}
      <NomiButton label={`Ver grupo ${group.name}`} variant="secondary" onPress={() => void openDetail(group.id)} />
    </NomiCard>)}
    {cursor ? <NomiButton label="Carregar mais grupos" variant="secondary" loading={loadingMore} onPress={() => void loadMore()} /> : null}
    {detailError ? <NomiCard tone="error"><NomiText variant="body">{detailError}</NomiText></NomiCard> : null}
    {selected ? <NomiCard style={styles.card}>
      <NomiText accessibilityRole="header" variant="heading">{selected.name}</NomiText>
      <NomiText variant="supporting" tone="muted">{selected.description || 'Sem descrição'} · {selected.role === 'owner' ? 'Proprietário' : selected.role === 'admin' ? 'Administrador' : 'Membro'}</NomiText>
      <NomiText variant="caption" tone="muted">Convites, participantes e materiais serão disponibilizados em uma próxima integração.</NomiText>
      <NomiButton label="Fechar detalhes" variant="secondary" onPress={() => setSelected(undefined)} />
    </NomiCard> : null}

    <NomiButton label={formVisible ? 'Cancelar criação' : 'Criar grupo'} onPress={() => { setFormVisible(!formVisible); setFormError(undefined); setSuccess(undefined); if (formVisible) intent.current = null; }} disabled={saving} />
    {formVisible ? <NomiCard style={styles.card}>
      <NomiText variant="caption" tone="accent">NOVO GRUPO</NomiText>
      <NomiTextField label="Nome do grupo" value={name} onChangeText={setName} maxLength={120} autoCapitalize="sentences" />
      <NomiTextField label="Descrição (opcional)" value={description} onChangeText={setDescription} maxLength={2000} multiline />
      {formError ? <NomiFeedback kind="error" title="Não foi possível criar" message={formError} /> : null}
      <NomiButton label="Salvar grupo" onPress={() => void save()} loading={saving} disabled={!name.trim()} />
    </NomiCard> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.md },
  heading: { gap: spacing.md },
  card: { gap: spacing.sm },
});
