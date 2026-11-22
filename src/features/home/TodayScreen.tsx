import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NomiAppIcon, NomiButton, NomiCard, NomiEmptyState, NomiLogo, NomiText } from '@/components';
import { NomiMascotAnimated } from '@/components/brand/NomiMascotAnimated';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { useAcademic } from '@/features/academic/AcademicProvider';
import type { AgendaItem, HomeSummary } from '@/features/academic/infrastructure/AcademicClient';
import { useProfile } from '@/features/profile/ProfileProvider';
import { AgendaDetail, AgendaEntry } from '@/features/agenda/AgendaEntry';
import { formatDate, todayInZone } from '@/features/agenda/agendaDate';
import { VoiceDraft } from '@/features/voice/VoiceDraft';

export function TodayScreen() {
  const client = useAcademic();
  const profile = useProfile();
  const { colorScheme } = useNomiTheme();
  const insets = useSafeAreaInsets();
  const colors = palettes[colorScheme];
  const [summary, setSummary] = useState<HomeSummary>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [detail, setDetail] = useState<AgendaItem>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>();
  const [savedTitle, setSavedTitle] = useState<string>();
  const generation = useRef(0);
  const zone = profile.profile?.timeZone;
  const dateLabel = zone ? formatDate(summary?.date ?? todayInZone(zone), { weekday: 'long', day: 'numeric', month: 'long' }) : '';

  useEffect(() => {
    if (!savedTitle) return;
    const timer = setTimeout(() => setSavedTitle(undefined), 6000);
    return () => clearTimeout(timer);
  }, [savedTitle]);

  const load = useCallback(async () => {
    if (!zone) return;
    const current = ++generation.current;
    setLoading(true);
    setError(undefined);
    try {
      const value = await client.getHome(todayInZone(zone), zone);
      if (current === generation.current) setSummary(value);
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o dia.');
    } finally { if (current === generation.current) setLoading(false); }
  }, [client, zone]);

  useFocusEffect(useCallback(() => {
    void load();
    return () => { ++generation.current; };
  }, [load]));

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailError(undefined);
    try { setDetail(await client.getCommitment(id, zone)); }
    catch (cause) { setDetailError(cause instanceof Error ? cause.message : 'Não foi possível abrir o compromisso.'); }
    finally { setDetailLoading(false); }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.md, insets.top + spacing.sm), paddingBottom: Math.max(100, insets.bottom + 80) }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.brandRow}>
        <View style={styles.brand}>
          <NomiAppIcon size={42} />
          <NomiLogo width={74} />
        </View>
      </View>

      <View style={styles.headingRow}>
        <NomiText accessibilityRole="header" variant="display">Hoje</NomiText>
        <NomiText variant="supporting" tone="muted" style={styles.date} numberOfLines={1}>
          {dateLabel}
        </NomiText>
      </View>

      <NomiCard tone="tint" padding={19} style={styles.voiceCard}>
        <NomiText variant="heading" style={styles.voiceTitle}>Pode falar.</NomiText>
        <NomiText variant="supporting" tone="muted" style={styles.voiceDescription}>
          Descreva um compromisso em até 60 segundos. A AWS transcreve sua fala.
        </NomiText>
        <NomiMascotAnimated
          pose="greeting"
          size={154}
          accessibilityLabel="Nomi saudando"
          style={styles.mascot}
        />
        <View style={styles.voiceButton}><VoiceDraft timeZone={zone} onCreated={(item) => { setSavedTitle(item.title); void load(); }} /></View>
      </NomiCard>

      {savedTitle ? <NomiCard tone="success"><NomiText variant="supporting">{savedTitle} foi salvo na sua agenda.</NomiText></NomiCard> : null}

      <View style={styles.agendaSection}>
        <NomiText accessibilityRole="header" variant="title">Na sua agenda</NomiText>
        {profile.loading || (zone && loading) ? <NomiText variant="supporting" tone="muted">Carregando seu dia...</NomiText> : null}
        {profile.error && !profile.profile ? <NomiCard tone="error"><NomiText variant="body">{profile.error}</NomiText><NomiButton label="Tentar novamente" variant="secondary" onPress={() => void profile.reload()} /></NomiCard> : null}
        {error ? <NomiCard tone="error"><NomiText variant="body">{error}</NomiText><NomiButton label="Tentar novamente" variant="secondary" onPress={() => void load()} /></NomiCard> : null}
        {!loading && !error && summary && (summary.items.length ? summary.items.map((item) => <AgendaEntry key={item.id} item={item} onOpen={(id) => void openDetail(id)} />) : <NomiEmptyState kind="calendar" title="Nenhum compromisso hoje" message="Seus compromissos do dia aparecerão aqui quando forem cadastrados." />)}
        {!loading && !error && summary && !summary.classOccurrencesAvailable ? <NomiText variant="caption" tone="muted">Aulas recorrentes ainda não estão disponíveis.</NomiText> : null}
        {summary?.hasMore ? <NomiText variant="caption" tone="muted">Há mais itens. Consulte a Agenda para ver outras datas.</NomiText> : null}
      </View>
      {!loading && !error && summary?.upcoming.length ? <View style={styles.agendaSection}><NomiText accessibilityRole="header" variant="title">Próximos prazos</NomiText>{summary.upcoming.slice(0, 3).map((item) => <AgendaEntry key={item.id} item={item} onOpen={(id) => void openDetail(id)} />)}</View> : null}
      {!loading && !error && summary?.overdue.length ? <View style={styles.agendaSection}><NomiText accessibilityRole="header" variant="title">Atrasados</NomiText>{summary.overdue.slice(0, 3).map((item) => <AgendaEntry key={item.id} item={item} onOpen={(id) => void openDetail(id)} />)}</View> : null}
      {detailLoading ? <NomiText variant="supporting" tone="muted">Carregando detalhes...</NomiText> : null}
      {detailError ? <NomiCard tone="error"><NomiText variant="body">{detailError}</NomiText></NomiCard> : null}
      {detail ? <AgendaDetail item={detail} onClose={() => setDetail(undefined)} /> : null}
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 100, gap: 16 },
  brandRow: { height: 44, justifyContent: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headingRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  date: { flexShrink: 1, textAlign: 'right' },
  voiceCard: {
    minHeight: 320,
    borderWidth: 0,
    borderRadius: 24,
    padding: 19,
    justifyContent: 'flex-start',
    shadowColor: '#543086',
    shadowOpacity: 0.25,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  voiceTitle: { maxWidth: 176, fontSize: 28, lineHeight: 36 },
  voiceDescription: { maxWidth: 162, marginTop: 2 },
  mascot: { position: 'absolute', top: 34, right: 8 },
  voiceButton: { position: 'absolute', left: 19, bottom: 17, right: 19 },
  agendaSection: { gap: 12, marginTop: 2 },
});
