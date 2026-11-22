import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NomiButton, NomiCard, NomiText, NomiTextField } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAcademic } from '@/features/academic/AcademicProvider';
import { createIdempotencyKey, type AcademicSubject, type AgendaItem, type CreateCommitmentInput } from '@/features/academic/infrastructure/AcademicClient';
import { todayInZone } from '@/features/agenda/agendaDate';
import { zonedToInstant } from '@/features/agenda/zonedTime';
import { syncCommitmentReminder } from '@/features/reminders';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { palettes, spacing } from '@/theme/tokens';
import { displayBrazilianDate, parseBrazilianDate } from './commitmentDate';
import { AssistantProposalClient, AssistantUnavailableError } from './AssistantProposalClient';
import { AwsVoiceCapture } from './AwsVoiceCapture';
import { proposalToFormValues } from './proposalForm';
import type { CommitmentProposal } from './proposalParsing';

type Props = { timeZone?: string; onCreated: (item: AgendaItem) => void };
type Kind = CreateCommitmentInput['kind'];
type Step = 'describe' | 'form';
type Interpretation = { status: 'unsupported' | 'failed'; message: string };

const UNSUPPORTED_FALLBACK = 'O Nomi registra apenas compromissos acadêmicos, como provas, trabalhos e entregas.';
const UNAVAILABLE_NOTE = 'O assistente está indisponível. Revise os campos manualmente.';
const INTERPRET_FALLBACK = 'Não foi possível interpretar o compromisso. Tente novamente.';
const TIME_PATTERN = /^(\d{1,2}):([0-5]\d)$/;

export function VoiceDraft({ timeZone, onCreated }: Props) {
  const client = useAcademic();
  const auth = useAuth();
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const insets = useSafeAreaInsets();
  const proposalClient = useMemo(() => {
    try { return new AssistantProposalClient(auth.getAccessToken); }
    catch { return null; }
  }, [auth.getAccessToken]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('describe');
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<Kind>('reminder');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<AcademicSubject[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectError, setSubjectError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [draftText, setDraftText] = useState('');
  const [interpreting, setInterpreting] = useState(false);
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [formNotes, setFormNotes] = useState<string[]>([]);
  const key = useRef<string | null>(null);
  const interpretKey = useRef<{ text: string; key: string } | null>(null);
  const interpretAbort = useRef<AbortController | null>(null);
  const inFlight = useRef(false);

  useEffect(() => () => { interpretAbort.current?.abort(); }, []);

  useEffect(() => {
    if (!open || step !== 'form') return;
    let active = true;
    setLoadingSubjects(true);
    setSubjectError(undefined);
    void client.listSubjects({ limit: 100 }).then((page) => {
      if (active) { setSubjects(page.items); setNextCursor(page.nextCursor); }
    }).catch(() => {
      if (active) setSubjectError('Não foi possível carregar as matérias. Você pode salvar sem matéria.');
    }).finally(() => { if (active) setLoadingSubjects(false); });
    return () => { active = false; };
  }, [client, open, step]);

  const change = () => { key.current = null; setError(undefined); };
  const defaultDate = () => (timeZone ? displayBrazilianDate(todayInZone(timeZone)) : '');
  /** Opens the modal in the describe step (the "Descrever por texto" action). */
  const openDescribe = () => {
    setMessage(undefined);
    setStep('describe');
    setOpen(true);
  };
  /** Skips to the manual form fields ("Preencher manualmente"). */
  const openForm = () => {
    if (!date) setDate(defaultDate());
    setFormNotes([]);
    setStep('form');
    setOpen(true);
  };
  const backToDescribe = () => {
    setFormNotes([]);
    setInterpretation(null);
    setStep('describe');
  };
  /** One idempotency key per text: retrying the same text reuses it; a changed text gets a new one. */
  const keyFor = (text: string) => {
    const current = interpretKey.current;
    if (current && current.text === text) return current.key;
    const next = { text, key: createIdempotencyKey() };
    interpretKey.current = next;
    return next.key;
  };
  const openProposal = (proposal: CommitmentProposal, text: string) => {
    const values = proposalToFormValues(proposal, text);
    change();
    setTitle(values.title);
    setDescription(values.description);
    setKind(values.kind);
    setSubjectId(values.subjectId);
    setDate(values.date || defaultDate());
    setTime(values.time);
    const questions = proposal.questions.map((question) => question.message);
    setFormNotes(proposal.status === 'needsClarification' && proposal.message ? [proposal.message, ...questions] : questions);
    setStep('form');
    setOpen(true);
  };
  const openManual = (text: string, note: string) => {
    change();
    setTitle(text.length <= 160 ? text : '');
    setDescription(text);
    setKind('reminder');
    setSubjectId(null);
    setDate(defaultDate());
    setTime('');
    setFormNotes([note]);
    setStep('form');
    setOpen(true);
  };
  const interpret = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || interpreting || inFlight.current) return;
    setMessage(undefined);
    setInterpretation(null);
    setFormNotes([]);
    if (!proposalClient) { openManual(text, UNAVAILABLE_NOTE); return; }
    if (!timeZone) {
      setInterpretation({ status: 'failed', message: 'Aguarde o carregamento do seu fuso no perfil e tente novamente.' });
      return;
    }
    const controller = new AbortController();
    interpretAbort.current?.abort();
    interpretAbort.current = controller;
    setInterpreting(true);
    try {
      const proposal = await proposalClient.createProposal(text, timeZone, keyFor(text), controller.signal);
      if (controller.signal.aborted) return;
      if (proposal.status === 'unsupported') {
        setInterpretation({ status: 'unsupported', message: proposal.message?.trim() || UNSUPPORTED_FALLBACK });
        return;
      }
      openProposal(proposal, text);
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof AssistantUnavailableError) { openManual(text, UNAVAILABLE_NOTE); return; }
      setInterpretation({ status: 'failed', message: cause instanceof Error ? cause.message : INTERPRET_FALLBACK });
    } finally {
      if (interpretAbort.current === controller) interpretAbort.current = null;
      setInterpreting(false);
    }
  };
  /** A voice transcript opens the modal in the describe step with the text filled in and interpretation running. */
  const receivedTranscript = (text: string) => {
    if (inFlight.current) return;
    setMessage(undefined);
    setDraftText(text);
    setStep('describe');
    setOpen(true);
    void interpret(text);
  };
  const reset = () => {
    interpretAbort.current?.abort();
    interpretAbort.current = null;
    interpretKey.current = null;
    setOpen(false);
    setStep('describe');
    setTitle('');
    setDescription('');
    setKind('reminder');
    setDate('');
    setTime('');
    setSubjectId(null);
    setSubjects([]);
    setNextCursor(null);
    setMessage(undefined);
    setError(undefined);
    setDraftText('');
    setInterpreting(false);
    setInterpretation(null);
    setFormNotes([]);
    key.current = null;
  };
  const loadMoreSubjects = async () => {
    if (!nextCursor || loadingSubjects) return;
    setLoadingSubjects(true);
    setSubjectError(undefined);
    try {
      const page = await client.listSubjects({ limit: 100, cursor: nextCursor });
      setSubjects((current) => current.concat(page.items));
      setNextCursor(page.nextCursor);
    } catch {
      setSubjectError('Não foi possível carregar mais matérias. Tente novamente.');
    } finally { setLoadingSubjects(false); }
  };
  const save = async () => {
    if (inFlight.current) return;
    const localDate = parseBrazilianDate(date);
    if (!title.trim() || title.trim().length > 160) { setError('Informe um título de até 160 caracteres.'); return; }
    if (!localDate) { setError('Informe uma data válida no formato DD/MM/AAAA.'); return; }
    if (!timeZone) { setError('Aguarde o carregamento do seu fuso no perfil e tente novamente.'); return; }
    const timeText = time.trim();
    const timeMatch = timeText ? TIME_PATTERN.exec(timeText) : null;
    if (timeText && (!timeMatch || Number(timeMatch[1]) > 23)) { setError('Informe o horário no formato HH:MM, entre 00:00 e 23:59.'); return; }
    let due: CreateCommitmentInput['due'];
    if (timeMatch) {
      const localTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
      const resolved = zonedToInstant(localDate, localTime, timeZone);
      if (!resolved) { setError('Esse horário não existe nesse dia no seu fuso.'); return; }
      due = { precision: 'dateTime', localDate, localTime: `${localTime}:00`, offset: resolved.offset, timeZone };
    } else {
      due = { precision: 'date', localDate, timeZone };
    }
    const input: CreateCommitmentInput = {
      title: title.trim(), description: description.trim() || null, kind, subjectId, due,
    };
    key.current ??= createIdempotencyKey();
    inFlight.current = true;
    setSaving(true);
    setError(undefined);
    try {
      const item = await client.createCommitment(input, key.current);
      reset();
      void syncCommitmentReminder(item);
      onCreated(item);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível confirmar o cadastro. Tente novamente.');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  const subjectSuggestionKept = Boolean(subjectId) && !loadingSubjects && !nextCursor
    && !subjects.some((subject) => subject.id === subjectId);
  const describeStep = step === 'describe';

  return <>
    <View style={styles.actions}>
      <AwsVoiceCapture onTranscript={receivedTranscript} />
      <NomiButton label="Descrever por texto" variant="secondary" onPress={openDescribe} style={styles.action} />
    </View>
    <Modal visible={open} animationType="slide" transparent onRequestClose={() => { if (!inFlight.current) reset(); }}>
      <View style={styles.backdrop}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.modalContent, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
          <NomiCard style={[styles.panel, { backgroundColor: colors.background }]}>
            {describeStep ? <>
              <NomiText accessibilityRole="header" variant="heading">Descrever compromisso</NomiText>
              <NomiText variant="supporting" tone="muted">Conte em uma frase. O Nomi sugere título, tipo, prazo e matéria para você revisar.</NomiText>
              {message ? <NomiCard tone="error" padding={14}><NomiText variant="supporting">{message}</NomiText></NomiCard> : null}
              <NomiTextField label="Descreva o compromisso" placeholder="Ex.: prova de Cálculo dia 20 às 14h"
                value={draftText} onChangeText={(value) => { setDraftText(value); setInterpretation(null); }}
                multiline maxLength={4000} editable={!interpreting} inputStyle={styles.describeInput} />
              {interpreting ? <NomiText variant="caption" tone="muted" accessibilityLiveRegion="polite">Interpretando…</NomiText> : null}
              {interpretation?.status === 'unsupported' ? <NomiCard tone="error" padding={14}>
                <NomiText variant="label" tone="error">Fora do tema acadêmico</NomiText>
                <NomiText variant="supporting" accessibilityLiveRegion="polite">{interpretation.message}</NomiText>
                <NomiButton label="Tentar outra frase" variant="secondary" onPress={() => { setInterpretation(null); setDraftText(''); }} />
              </NomiCard> : null}
              {interpretation?.status === 'failed' ? <NomiCard tone="error" padding={14}>
                <NomiText variant="supporting" accessibilityLiveRegion="polite">{interpretation.message}</NomiText>
                <NomiButton label="Tentar interpretar novamente" variant="secondary" disabled={!draftText.trim() || interpreting}
                  onPress={() => void interpret(draftText)} />
              </NomiCard> : null}
              <NomiButton label="Interpretar com o Nomi" disabled={!draftText.trim() || interpreting} loading={interpreting}
                onPress={() => void interpret(draftText)} />
              <NomiButton label="Preencher manualmente" variant="tertiary" disabled={interpreting} onPress={openForm} />
              <NomiButton label="Fechar" variant="tertiary" onPress={reset} />
            </> : <>
              <NomiButton label="Voltar para a descrição" variant="tertiary" disabled={saving} onPress={backToDescribe} />
              <NomiText accessibilityRole="header" variant="heading">Cadastrar compromisso</NomiText>
              <NomiText variant="supporting" tone="muted">Confira os campos antes de salvar. A transcrição pode conter erros.</NomiText>
              {message ? <NomiCard tone="error" padding={14}><NomiText variant="supporting">{message}</NomiText></NomiCard> : null}
              {formNotes.map((note, index) => <NomiText key={index} variant="caption" tone="accent" accessibilityLiveRegion="polite">{note}</NomiText>)}
              <NomiTextField label="Título" value={title} onChangeText={(value) => { change(); setTitle(value); }} maxLength={160} placeholder="Ex.: Entregar trabalho de Cálculo" />
              <NomiTextField label="Descrição ou texto transcrito (opcional)" value={description} onChangeText={(value) => { change(); setDescription(value); }} multiline maxLength={4000} inputStyle={styles.textInput} />
              <NomiText variant="caption" tone="muted">Confira o prazo abaixo antes de salvar.</NomiText>
              <NomiText variant="label">Tipo</NomiText>
              <View style={styles.options}>
                {([['reminder', 'Lembrete'], ['assignment', 'Trabalho'], ['exam', 'Prova']] as const).map(([value, label]) =>
                  <NomiButton key={value} label={kind === value ? 'Selecionado: ' + label : label} variant={kind === value ? 'primary' : 'secondary'}
                    onPress={() => { change(); setKind(value); }} style={styles.option} />)}
              </View>
              <NomiTextField label="Data do prazo (DD/MM/AAAA)" value={date} onChangeText={(value) => { change(); setDate(value); }}
                keyboardType="numbers-and-punctuation" maxLength={10} placeholder="21/11/2026" />
              <NomiTextField label="Horário (opcional)" value={time} onChangeText={(value) => { change(); setTime(value); }}
                keyboardType="numbers-and-punctuation" maxLength={5} placeholder="14:00" />
              <NomiText variant="caption" tone="muted">Prazo {time.trim() ? 'com horário' : 'sem horário'} · Fuso: {timeZone ?? 'carregando'}</NomiText>
              <NomiText variant="label">Matéria (opcional)</NomiText>
              {loadingSubjects && subjects.length === 0 ? <NomiText tone="muted">Carregando matérias...</NomiText> : null}
              {subjectError ? <NomiText tone="error">{subjectError}</NomiText> : null}
              {subjectSuggestionKept ? <NomiText variant="caption" tone="muted">A matéria sugerida pelo Nomi continua selecionada.</NomiText> : null}
              <NomiButton label={subjectId === null ? 'Selecionado: sem matéria' : 'Sem matéria'} variant={subjectId === null ? 'primary' : 'secondary'}
                onPress={() => { change(); setSubjectId(null); }} />
              {subjects.map((subject) => <NomiButton key={subject.id}
                label={subject.id === subjectId ? 'Selecionada: ' + subject.name : subject.name}
                variant={subject.id === subjectId ? 'primary' : 'secondary'}
                onPress={() => { change(); setSubjectId(subject.id); }} />)}
              {nextCursor ? <NomiButton label="Carregar mais matérias" variant="tertiary" loading={loadingSubjects} onPress={() => void loadMoreSubjects()} /> : null}
              {error ? <NomiCard tone="error" padding={14}><NomiText>{error}</NomiText></NomiCard> : null}
              <NomiButton label="Confirmar e salvar" loading={saving} onPress={() => void save()} />
              <NomiButton label="Descartar rascunho" variant="tertiary" disabled={saving} onPress={reset} />
            </>}
          </NomiCard>
        </ScrollView>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  actions: { width: 170, gap: 8 },
  action: { minHeight: 44, paddingHorizontal: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', justifyContent: 'flex-end' },
  modalContent: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.lg },
  panel: { gap: 14 },
  textInput: { minHeight: 80, textAlignVertical: 'top' },
  describeInput: { minHeight: 120, textAlignVertical: 'top' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 44 },
});
