import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiButton, NomiCard, NomiText } from '@/components';
import { NomiTabIcon } from '@/components/ui/NomiTabIcon';
import { useCapture } from '@/features/capture/CaptureProvider';
import { MascotHalo } from '@/features/capture/MascotHalo';
import { eventDateLine, reminderLabel } from '@/features/capture/formatting';

/** Figma 04.05 "Compromisso salvo": confirmation after the commitment was created. */
export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const { saved, savedReminderAt, timeZone, reset } = useCapture();
  const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Set when the flow is being closed on purpose, so the "no saved item" guard does not
  // redirect back into the capture flow while reset() clears the state.
  const leaving = useRef(false);

  const leave = useCallback((href: '/' | '/agenda') => {
    leaving.current = true;
    reset();
    router.replace(href);
  }, [reset, router]);

  useEffect(() => {
    if (!saved && !leaving.current) router.replace('/capture/listen');
  }, [saved, router]);

  // Android hardware back closes the flow instead of returning into it.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      leave('/');
      return true;
    });
    return () => subscription.remove();
  }, [leave]);

  if (!saved) return null;

  const reminder = reminderLabel(savedReminderAt, new Date(), zone);
  const hasReminder = savedReminderAt !== null;

  return <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
    <View style={styles.topBar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => leave('/')} style={styles.close}>
        <NomiTabIcon name="back" color={colors.accent} />
      </Pressable>
    </View>

    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <MascotHalo pose="celebrating" size={220} />

      <NomiText variant="display" accessibilityRole="header" style={styles.center}>Tá na agenda!</NomiText>
      <NomiText variant="body" tone="muted" style={styles.center}>Seu compromisso foi salvo.</NomiText>

      <NomiCard style={styles.card} padding={20}>
        <NomiText variant="heading">{saved.title}</NomiText>
        <NomiText variant="body" tone="muted">{eventDateLine(saved.due.localDate, saved.due.localTime ?? saved.displayTime)}</NomiText>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.row}>
          <NomiText variant="label" tone="accent">Lembrete</NomiText>
          <NomiText variant="label" style={styles.rowValue}>{hasReminder ? reminder : 'Sem lembrete'}</NomiText>
        </View>
      </NomiCard>
    </ScrollView>

    <View style={[styles.actions, { paddingBottom: Math.max(spacing.lg, insets.bottom + spacing.sm) }]}>
      <NomiButton label="Ver na agenda" onPress={() => leave('/agenda')} />
      <NomiButton label="Desfazer registro" variant="secondary" disabled />
      <NomiText variant="caption" tone="muted" style={styles.center}>Em breve: exclusão ainda não disponível.</NomiText>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, minHeight: 52, justifyContent: 'center' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: 14 },
  center: { textAlign: 'center' },
  card: { alignSelf: 'stretch', gap: 8 },
  divider: { height: 1, marginVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowValue: { flexShrink: 1, textAlign: 'right' },
  actions: { paddingHorizontal: spacing.lg, gap: 12 },
});
