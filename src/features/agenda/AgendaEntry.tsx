import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NomiButton, NomiCard, NomiText } from '@/components';
import type { AgendaItem } from '@/features/academic/infrastructure/AcademicClient';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { palettes, spacing } from '@/theme/tokens';
import { formatDate } from './agendaDate';

export function AgendaEntry({ item, onOpen }: { item: AgendaItem; onOpen: (id: string) => void }) {
  return <NomiCard style={styles.card}>
    <NomiText variant="caption" tone="muted">{item.subjectName ?? 'Sem matéria'} · {item.displayTime ?? 'Sem horário'}</NomiText>
    <NomiText variant="heading">{item.title}</NomiText>
    <NomiText variant="supporting" tone="muted">{item.status === 'completed' ? 'Concluído' : 'Pendente'} · {formatDate(item.displayDate, { day: 'numeric', month: 'long' })}</NomiText>
    <NomiButton label={`Ver detalhes de ${item.title}`} variant="secondary" onPress={() => onOpen(item.id)} />
  </NomiCard>;
}

export function AgendaDetail({ item, onClose }: { item: AgendaItem; onClose: () => void }) {
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const insets = useSafeAreaInsets();
  return <Modal visible animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.backdrop}>
    <ScrollView contentContainerStyle={[styles.modalContent, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
    <NomiCard style={[styles.card, { backgroundColor: colors.background }]}>
    <NomiText accessibilityRole="header" variant="heading">{item.title}</NomiText>
    <NomiText variant="supporting" tone="muted">{item.subjectName ?? 'Sem matéria'} · {item.status === 'completed' ? 'Concluído' : 'Pendente'}</NomiText>
    <NomiText variant="body">{formatDate(item.displayDate, { weekday: 'long', day: 'numeric', month: 'long' })}{item.displayTime ? `, ${item.displayTime}` : ' · Sem horário'}</NomiText>
    {item.description ? <NomiText variant="body">{item.description}</NomiText> : null}
    <View><NomiButton label="Voltar à agenda" variant="secondary" onPress={onClose} /></View>
    </NomiCard>
    </ScrollView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', justifyContent: 'flex-end' },
  modalContent: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.lg },
});
