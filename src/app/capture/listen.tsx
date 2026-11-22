import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NomiButton, NomiCard, NomiFeedback, NomiText, NomiTextField } from '@/components';
import { NomiMascot } from '@/components/brand/NomiMascot';
import { NomiTabIcon } from '@/components/ui/NomiTabIcon';
import { useCapture } from '@/features/capture/CaptureProvider';
import { SPEECH_MAX_SECONDS, SPEECH_NOTICE, useSpeechCapture } from '@/features/capture/useSpeechCapture';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { palettes, spacing } from '@/theme/tokens';

/** Figma 04.01 "Escutando" (voice) and its text mode. Screens render the provider and speech state; navigation follows the Assistant result. */
type CaptureMode = 'voice' | 'text';

const BAR_COUNT = 14;
const BAR_MIN = 7;
const BAR_MAX = 52;
/** Relative height of each bar so the meter does not move as one block. */
const BAR_WEIGHTS = [0.35, 0.6, 0.5, 0.8, 0.45, 0.9, 0.7, 1, 0.6, 0.85, 0.5, 0.75, 0.4, 0.55];

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function CaptureScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const dark = colorScheme === 'dark';
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const requestedMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const mode: CaptureMode = requestedMode === 'text' ? 'text' : 'voice';

  const { text, setText, interpret, reset, startManualDraft } = useCapture();
  const speech = useSpeechCapture();
  const [busy, setBusy] = useState(false);
  const [unsupportedMessage, setUnsupportedMessage] = useState<string | null>(null);
  const [interpretError, setInterpretError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const captureSurface = dark ? colors.tint : '#F5ECFF';
  const halo = dark ? colors.surface : '#EBD8FA';
  const recordingDot = dark ? colors.accent : '#8B48C4';
  const strongAccent = dark ? colors.accent : '#5B328A';
  const barColors = dark ? [colors.accent, colors.muted] : ['#814ABC', '#BA95EF'];

  const { start: startSpeech, stop: stopSpeech, state: speechState, transcript, volume, elapsedSeconds, error: speechError } = speech;

  // Voice mode listens on mount and whenever the mode switches back to voice; leaving voice mode stops the recognizer.
  useEffect(() => {
    if (mode !== 'voice') {
      void stopSpeech();
      return;
    }
    setText('');
    setUnsupportedMessage(null);
    setInterpretError(null);
    void startSpeech();
    // Only the mode drives this effect; the speech actions are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // The spoken transcript is the text the Assistant interprets.
  useEffect(() => {
    if (mode === 'voice') setText(transcript);
  }, [mode, transcript, setText]);

  const close = () => {
    speech.cancel();
    reset();
    router.back();
  };

  const switchMode = (next: CaptureMode) => {
    setUnsupportedMessage(null);
    setInterpretError(null);
    router.setParams({ mode: next });
  };

  const interpretText = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setUnsupportedMessage(null);
    setInterpretError(null);
    try {
      const source = (mode === 'voice' ? await stopSpeech() : text).trim();
      if (!source) {
        setInterpretError('Fale ou digite o compromisso antes de continuar.');
        return;
      }
      const result = await interpret(source);
      switch (result.status) {
        case 'ready':
          router.push(result.questions.some((question) => question.field === 'due') ? '/capture/confirm-date' : '/capture/review');
          break;
        case 'unavailable':
          router.push('/capture/edit');
          break;
        case 'unsupported':
          setUnsupportedMessage(result.message);
          break;
        case 'error':
          setInterpretError(result.message);
          break;
        default:
          break;
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const tryAnotherPhrase = () => {
    setUnsupportedMessage(null);
    setInterpretError(null);
    setText('');
    if (mode === 'voice') void startSpeech();
  };

  const fillManually = async () => {
    if (mode === 'voice') await stopSpeech();
    startManualDraft();
    router.push('/capture/edit');
  };

  const isVoice = mode === 'voice';
  const listening = speechState === 'listening';
  const meterBars = Array.from({ length: BAR_COUNT }, (_, index) => {
    const weight = BAR_WEIGHTS[index % BAR_WEIGHTS.length];
    const height = BAR_MIN + (BAR_MAX - BAR_MIN) * Math.min(1, volume * weight * 1.4);
    return { height, color: barColors[index % 2] };
  });
  // Screen readers hear the elapsed time at most every 10 seconds; the visible timer carries no live region.
  const announcedSeconds = Math.floor(elapsedSeconds / 10) * 10;
  const timeAnnouncement = listening && announcedSeconds > 0 ? `Gravando há ${announcedSeconds} segundos` : '';

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.lg) }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { backgroundColor: captureSurface, paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isVoice ? 'Cancelar gravação' : 'Voltar'}
            onPress={close}
            style={styles.back}
          >
            <NomiTabIcon name="back" color={colors.accent} />
          </Pressable>
          {isVoice ? (
            <View style={[styles.timer, { backgroundColor: colors.surface }]}>
              <View style={[styles.recordingDot, { backgroundColor: recordingDot }]} />
              <NomiText variant="label" style={[styles.timerText, { color: strongAccent }]}>{formatElapsed(elapsedSeconds)}</NomiText>
            </View>
          ) : null}
        </View>

        <NomiText accessibilityRole="header" variant="display" style={[styles.title, { color: colors.text }]}>
          {isVoice ? 'Estou ouvindo' : 'Descreva o compromisso'}
        </NomiText>
        <NomiText variant="label" style={[styles.subtitle, { color: strongAccent }]}>
          {isVoice ? 'Gravando seu compromisso…' : 'Digite como falaria com o Nomi'}
        </NomiText>

        <View style={styles.mascotWrap}>
          <View style={[styles.halo, { backgroundColor: halo }]} />
          <NomiMascot
            pose={isVoice ? 'listening' : 'attentive'}
            size={235}
            accessibilityLabel={isVoice ? 'Nomi ouvindo' : 'Nomi atento'}
          />
        </View>
      </View>

      <View style={styles.body}>
        {isVoice ? (
          <>
            <View accessible accessibilityLabel="Nível do microfone" style={[styles.meter, { backgroundColor: captureSurface }]}>
              {meterBars.map((bar, index) => (
                <View key={index} style={[styles.bar, { height: bar.height, backgroundColor: bar.color }]} />
              ))}
            </View>
            <View style={styles.liveRegion}>
              <NomiText variant="caption" accessibilityLiveRegion="polite">{timeAnnouncement}</NomiText>
            </View>

            <NomiText variant="label" style={[styles.sectionLabel, { color: colors.text }]}>Transcrição</NomiText>
            <View accessibilityLabel="Transcrição" style={[styles.transcriptBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {transcript.trim() ? (
                <NomiText style={[styles.transcriptText, { color: colors.text }]}>“{transcript.trim()}”</NomiText>
              ) : (
                <NomiText style={[styles.transcriptText, { color: colors.muted }]}>
                  Fale seu compromisso, por exemplo: “Prova de Cálculo sexta às 10h”.
                </NomiText>
              )}
            </View>
            <NomiText variant="caption" tone="muted">{SPEECH_NOTICE}</NomiText>
            <NomiText variant="caption" tone="muted">Gravação de até {SPEECH_MAX_SECONDS} segundos.</NomiText>

            {speechState === 'denied' ? (
              <NomiFeedback kind="error" title="Microfone bloqueado" message={speechError ?? ''} />
            ) : null}
            {speechState === 'unavailable' ? (
              <NomiFeedback kind="error" title="Voz indisponível" message={speechError ?? ''} />
            ) : null}
            {speechState === 'error' ? (
              <NomiFeedback kind="error" title="Não consegui ouvir" message={speechError ?? ''} />
            ) : null}
            {speechState === 'error' ? (
              <NomiButton label="Tentar novamente" disabled={busy} onPress={() => void startSpeech()} />
            ) : null}
          </>
        ) : (
          <NomiTextField
            label="Descreva o compromisso"
            placeholder="Ex.: prova de Cálculo sexta às 10h"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={4000}
            editable={!busy}
            inputStyle={styles.describeInput}
            accessibilityHint="Descreva o compromisso com data e horário, se souber."
          />
        )}

        {busy ? <NomiText variant="caption" tone="muted" accessibilityLiveRegion="polite">Interpretando…</NomiText> : null}

        {unsupportedMessage ? (
          <NomiCard tone="error" padding={14} style={styles.feedbackCard}>
            <NomiText variant="heading" tone="error">Fora do tema acadêmico</NomiText>
            <NomiText variant="supporting" accessibilityLiveRegion="polite">{unsupportedMessage}</NomiText>
            <NomiButton label="Tentar outra frase" variant="secondary" disabled={busy} onPress={tryAnotherPhrase} />
          </NomiCard>
        ) : null}

        {interpretError ? (
          <NomiCard tone="error" padding={14} style={styles.feedbackCard}>
            <NomiText variant="supporting" accessibilityLiveRegion="polite">{interpretError}</NomiText>
            <NomiButton label="Tentar novamente" variant="secondary" disabled={busy} onPress={() => void interpretText()} />
          </NomiCard>
        ) : null}

        {isVoice ? (
          <>
            <NomiButton
              label="Revisar gravação"
              loading={busy}
              disabled={busy || !transcript.trim()}
              accessibilityHint="Para a gravação e interpreta o que você disse."
              onPress={() => void interpretText()}
            />
            <NomiButton
              label="Digitar em vez de falar"
              variant="secondary"
              disabled={busy}
              onPress={() => switchMode('text')}
            />
          </>
        ) : (
          <>
            <NomiButton
              label="Interpretar com o Nomi"
              loading={busy}
              disabled={busy || !text.trim()}
              onPress={() => void interpretText()}
            />
            <NomiButton label="Falar em vez de digitar" variant="secondary" disabled={busy} onPress={() => switchMode('voice')} />
            <NomiButton label="Preencher manualmente" variant="tertiary" disabled={busy} onPress={() => void fillManually()} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  topBar: { width: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  timer: { minWidth: 96, height: 39, borderRadius: 20, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  recordingDot: { width: 8, height: 8, borderRadius: 4 },
  timerText: { fontVariant: ['tabular-nums'], fontSize: 15, lineHeight: 19 },
  title: { marginTop: spacing.sm, fontSize: 38, lineHeight: 46, textAlign: 'center' },
  subtitle: { marginTop: 4, fontSize: 15, lineHeight: 20, textAlign: 'center' },
  mascotWrap: { width: 235, height: 235, marginTop: spacing.xs, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 202, height: 202, borderRadius: 101, top: 16.5, left: 16.5 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  meter: { height: 66, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  bar: { width: 7, borderRadius: 4 },
  liveRegion: { height: 1, overflow: 'hidden' },
  sectionLabel: { marginTop: spacing.xs, fontSize: 16, lineHeight: 20 },
  transcriptBox: { minHeight: 124, borderWidth: 2, borderRadius: 22, padding: 18 },
  transcriptText: { fontSize: 18, lineHeight: 26 },
  describeInput: { minHeight: 140, textAlignVertical: 'top' },
  feedbackCard: { gap: spacing.sm },
});
