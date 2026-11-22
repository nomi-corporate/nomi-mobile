import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NomiButton, NomiCard, NomiEmptyState, NomiText } from '@/components';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { useAcademic } from '@/features/academic/AcademicProvider';
import type { AgendaItem } from '@/features/academic/infrastructure/AcademicClient';
import { useProfile } from '@/features/profile/ProfileProvider';
import { AgendaDetail, AgendaEntry } from './AgendaEntry';
import { formatDate, shiftDate, todayInZone, weekDates } from './agendaDate';

type Props = {
  onOpenSubjects: () => void;
};

export function AgendaScreen({ onOpenSubjects }: Props) {
  const client = useAcademic();
  const profile = useProfile();
  const { colorScheme } = useNomiTheme();
  const insets = useSafeAreaInsets();
  const colors = palettes[colorScheme];
  const zone = profile.profile?.timeZone;
  const [selectedDate, setSelectedDate] = useState(() => todayInZone('UTC'));
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const [detail, setDetail] = useState<AgendaItem>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>();
  const generation = useRef(0);
  const week = useMemo(() => weekDates(selectedDate), [selectedDate]);
  useEffect(() => { if (zone) setSelectedDate(todayInZone(zone)); }, [zone]);

  const load = useCallback(async () => {
    if (!zone) return;
    const current = ++generation.current;
    setLoading(true);
    setError(undefined);
    setCursor(null);
    setDetail(undefined);
    try {
      const page = await client.getAgenda(selectedDate, shiftDate(selectedDate, 1), zone);
      if (current === generation.current) { setItems(page.items); setCursor(page.nextCursor); }
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a agenda.');
    } finally { if (current === generation.current) setLoading(false); }
  }, [client, selectedDate, zone]);

  useFocusEffect(useCallback(() => {
    void load();
    return () => { ++generation.current; };
  }, [load]));

  const loadMore = async () => {
    if (!zone || !cursor || loadingMore) return;
    const current = generation.current;
    const requested = cursor;
    setLoadingMore(true);
    setError(undefined);
    try {
      const page = await client.getAgenda(selectedDate, shiftDate(selectedDate, 1), zone, requested);
      if (current !== generation.current) return;
      if (page.nextCursor === requested) throw new Error('A agenda retornou uma página repetida. Atualize e tente novamente.');
      setItems((previous) => [...previous, ...page.items]);
      setCursor(page.nextCursor);
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar mais itens.');
    } finally { if (current === generation.current) setLoadingMore(false); }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailError(undefined);
    try { setDetail(await client.getCommitment(id, zone)); }
    catch (cause) { setDetailError(cause instanceof Error ? cause.message : 'Não foi possível abrir o compromisso.'); }
    finally { setDetailLoading(false); }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(104, insets.bottom + 80) }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heading}>
        <NomiText accessibilityRole="header" variant="title">Agenda</NomiText>
        <NomiText variant="supporting" tone="muted">
          Aulas, prazos e lembretes do seu semestre.
        </NomiText>
      </View>

      <NomiText variant="body" tone="muted" style={styles.month}>
        {capitalize(formatDate(selectedDate, { month: 'long', year: 'numeric' }))} · {capitalize(formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' }))}
      </NomiText>

      <View style={styles.navigation}>
        <NomiButton label="Semana anterior" variant="secondary" onPress={() => setSelectedDate(shiftDate(selectedDate, -7))} style={styles.navigationButton} />
        <NomiButton label="Hoje" variant="secondary" onPress={() => setSelectedDate(todayInZone(zone ?? 'UTC'))} style={styles.navigationButton} />
        <NomiButton label="Próxima semana" variant="secondary" onPress={() => setSelectedDate(shiftDate(selectedDate, 7))} style={styles.navigationButton} />
      </View>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Selecione um dia da semana"
        style={[styles.week, { backgroundColor: colors.tint }]}
      >
        {week.map((day) => {
          const selected = day === selectedDate;
          const dayLabel = formatDate(day, { weekday: 'short' }).replace('.', '').slice(0, 1).toLocaleUpperCase('pt-BR');
          return (
            <Pressable
              key={day}
              accessibilityRole="radio"
              accessibilityLabel={formatDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}
              accessibilityState={{ selected }}
              onPress={() => setSelectedDate(day)}
              style={styles.day}
            >
              <NomiText
                variant="caption"
                style={{ color: selected ? colors.accent : colors.muted, fontWeight: selected ? '700' : '400', textAlign: 'center' }}
              >
                {dayLabel}{'\n'}{day.slice(-2)}
              </NomiText>
            </Pressable>
          );
        })}
      </View>

      {profile.loading || (zone && loading) ? <NomiText variant="supporting" tone="muted">Carregando agenda...</NomiText> : null}
      {profile.error && !profile.profile ? <NomiCard tone="error" style={styles.note}><NomiText variant="body">{profile.error}</NomiText><NomiButton label="Tentar novamente" variant="secondary" onPress={() => void profile.reload()} /></NomiCard> : null}
      {error ? <NomiCard tone="error" style={styles.note}><NomiText variant="body">{error}</NomiText><NomiButton label="Tentar novamente" variant="secondary" onPress={() => void load()} /></NomiCard> : null}
      {!loading && !error && zone && (items.length ? items.map((item) => <AgendaEntry key={item.id} item={item} onOpen={(id) => void openDetail(id)} />) : <NomiEmptyState kind="calendar" title="Nenhum compromisso neste dia" message="Quando houver compromissos para esta data, eles aparecerão aqui." />)}
      {cursor && !error ? <NomiButton label="Carregar mais" variant="secondary" loading={loadingMore} onPress={() => void loadMore()} /> : null}
      {detailLoading ? <NomiText variant="supporting" tone="muted">Carregando detalhes...</NomiText> : null}
      {detailError ? <NomiCard tone="error"><NomiText variant="body">{detailError}</NomiText></NomiCard> : null}
      {detail ? <AgendaDetail item={detail} onClose={() => setDetail(undefined)} /> : null}

      <NomiCard style={[styles.note, { borderColor: colors.border }]}>
        <NomiText variant="label">Aulas recorrentes</NomiText>
        <NomiText variant="supporting" tone="muted">
          A consulta de aulas recorrentes ainda não está disponível. Compromissos cadastrados aparecem na data correspondente.
        </NomiText>
      </NomiCard>

      <View style={styles.actions}>
        <NomiButton label="Ver minhas matérias" onPress={onOpenSubjects} />
      </View>
    </ScrollView>
  );
}

function capitalize(value: string): string {
  return value.length ? `${value[0].toLocaleUpperCase('pt-BR')}${value.slice(1)}` : value;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 104, gap: spacing.md },
  heading: { gap: spacing.xs },
  month: { marginTop: spacing.xs },
  navigation: { flexDirection: 'row', gap: 6 },
  navigationButton: { flex: 1, paddingHorizontal: 4, minHeight: 44 },
  week: { minHeight: 68, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  day: { minWidth: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  note: { gap: spacing.sm, borderWidth: 1 },
  actions: { marginTop: 'auto', paddingTop: spacing.md },
});
