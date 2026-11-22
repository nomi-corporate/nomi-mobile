import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NomiButton, NomiCard, NomiFeedback, NomiScreenHeader, NomiText, NomiTextField } from '@/components';
import { MascotHalo } from '@/features/capture/MascotHalo';
import { SPEECH_MAX_SECONDS, SPEECH_NOTICE, useSpeechCapture } from '@/features/capture/useSpeechCapture';
import { useSemester } from '@/features/semester/SemesterProvider';
import { SEMESTER_TEXT_MAX } from '@/features/semester/semesterParsing';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';

/** Figma 02.02 "Cadastrar matérias": voice listening, with a text mode through the `mode` param. */
type SemesterMode = 'voice' | 'text';

const BAR_COUNT = 14;
const BAR_MIN = 6;
const BAR_MAX = 44;
/** Relative height of each bar so the meter does not move as one block. */
const BAR_WEIGHTS = [0.35, 0.6, 0.5, 0.8, 0.45, 0.9, 0.7, 1, 0.6, 0.85, 0.5, 0.75, 0.4, 0.55];

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function SemesterListenScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const dark = colorScheme === 'dark';
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const requestedMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const mode: SemesterMode = requestedMode === 'text' ? 'text' : 'voice';

  const { text, setText, interpret } = useSemester();
  // When the user stops talking, review automatically (same as tapping "Terminar e revisar").
  const autoReviewRef = useRef<(() => void) | null>(null);
  const speech = useSpeechCapture({ onSilence: () => autoReviewRef.current?.() });
  const [busy, setBusy] = useState(false);
  const [unsupportedMessage, setUnsupportedMessage] = useState<string | null>(null);
  const [interpretError, setInterpretError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const captureSurface = dark ? colors.tint : '#F5ECFF';
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

  const switchMode = (next: SemesterMode) => {
    setUnsupportedMessage(null);
    setInterpretError(null);
    router.setParams({ mode: next });
  };

  const interpretSource = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setUnsupportedMessage(null);
    setInterpretError(null);
    try {
      const source = (mode === 'voice' ? await stopSpeech() : text).trim();
      if (!source) {
        setInterpretError('Fale ou digite as matérias antes de continuar.');
        return;
      }
      const result = await interpret(source);
      switch (result.status) {
        case 'ready':
        case 'unavailable':
          // Unavailable opens the review with an empty list; the review explains that the user adds subjects manually.
          router.push('/semester/review');
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

  autoReviewRef.current = () => { void interpretSource(); };

  const tryAnotherPhrase = () => {
    setUnsupportedMessage(null);
    setInterpretError(null);
    setText('');
    if (mode === 'voice') void startSpeech();
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
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.lg) }]}
      showsVerticalScrollIndicator={false}
    >
      <NomiScreenHeader title="Cadastrar matérias" />
      <NomiText variant="supporting" tone="muted">Fale as matérias e os professores do seu semestre.</NomiText>

      <View style={styles.mascot}>
        <MascotHalo pose={isVoice ? 'listening' : 'attentive'} size={160} />
      </View>

      {isVoice ? (
        <NomiCard tone="tint" padding={16} style={styles.listenCard} accessibilityLabel={listening ? `Escutando, ${formatElapsed(elapsedSeconds)}` : 'Gravação parada'}>
          <View style={styles.cardHeader}>
            <NomiText variant="label" tone="accent" accessibilityLabel="Fio de áudio">Fio / áudio</NomiText>
            <NomiText variant="label" style={{ color: strongAccent }}>
              {`● ${listening ? 'ESCUTANDO' : 'PARADO'} · ${formatElapsed(elapsedSeconds)}`}
            </NomiText>
          </View>
          <View accessible accessibilityLabel="Nível do microfone" style={[styles.meter, { backgroundColor: captureSurface }]}>
            {meterBars.map((bar, index) => (
              <View key={index} style={[styles.bar, { height: bar.height, backgroundColor: bar.color }]} />
            ))}
          </View>
          <View style={styles.liveRegion}>
            <NomiText variant="caption" accessibilityLiveRegion="polite">{timeAnnouncement}</NomiText>
          </View>
          {transcript.trim() ? (
            <NomiText variant="heading" accessibilityLabel={`Transcrição: ${transcript.trim()}`}>{`“${transcript.trim()}”`}</NomiText>
          ) : (
            <NomiText variant="heading" tone="muted">
              {'“Tenho Cálculo com a Ana e Engenharia de Software com o Bruno.”'}
            </NomiText>
          )}
          <NomiText variant="caption" tone="muted">Revise os detalhes antes de salvar.</NomiText>
        </NomiCard>
      ) : (
        <NomiTextField
          label="Descreva suas matérias"
          placeholder="Ex.: Cálculo com a Ana e Engenharia de Software com o Bruno."
          value={text}
          onChangeText={setText}
          multiline
          maxLength={SEMESTER_TEXT_MAX}
          editable={!busy}
          inputStyle={styles.describeInput}
          accessibilityHint="Descreva as matérias e, se souber, o professor de cada uma."
        />
      )}

      {isVoice ? (
        <>
          <NomiText variant="caption" tone="muted">{SPEECH_NOTICE}</NomiText>
          <NomiText variant="caption" tone="muted">Gravação de até {SPEECH_MAX_SECONDS} segundos.</NomiText>
        </>
      ) : null}

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
        <NomiButton label="Tentar novamente" variant="secondary" disabled={busy} onPress={() => void startSpeech()} />
      ) : null}

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
          <NomiButton label="Tentar novamente" variant="secondary" disabled={busy} onPress={() => void interpretSource()} />
        </NomiCard>
      ) : null}

      <View style={styles.spacer} />

      {isVoice ? (
        <View style={styles.actions}>
          <NomiButton
            label="Terminar e revisar"
            loading={busy}
            disabled={busy || !transcript.trim()}
            accessibilityHint="Para a gravação e interpreta o que você disse."
            onPress={() => void interpretSource()}
          />
          <NomiButton label="Cadastrar por texto" variant="secondary" disabled={busy} onPress={() => switchMode('text')} />
        </View>
      ) : (
        <View style={styles.actions}>
          <NomiButton
            label="Interpretar com o Nomi"
            loading={busy}
            disabled={busy || !text.trim()}
            onPress={() => void interpretSource()}
          />
          <NomiButton label="Falar em vez de digitar" variant="secondary" disabled={busy} onPress={() => switchMode('voice')} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  mascot: { alignItems: 'center' },
  listenCard: { gap: spacing.sm, borderWidth: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  meter: { height: 60, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  bar: { width: 6, borderRadius: 3 },
  liveRegion: { height: 1, overflow: 'hidden' },
  describeInput: { minHeight: 160, textAlignVertical: 'top' },
  feedbackCard: { gap: spacing.sm },
  spacer: { flexGrow: 1, minHeight: spacing.md },
  actions: { gap: spacing.sm },
});
