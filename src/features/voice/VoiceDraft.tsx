import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NomiButton, NomiCard, NomiText, NomiTextField } from '@/components';
import { useAcademic } from '@/features/academic/AcademicProvider';
import { createIdempotencyKey, type AcademicSubject, type AgendaItem, type CreateCommitmentInput } from '@/features/academic/infrastructure/AcademicClient';
import { todayInZone } from '@/features/agenda/agendaDate';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { palettes, spacing } from '@/theme/tokens';
import { displayBrazilianDate, parseBrazilianDate } from './commitmentDate';
import { AwsVoiceCapture } from './AwsVoiceCapture';

type Props = { timeZone?: string; onCreated: (item: AgendaItem) => void };
type Kind = CreateCommitmentInput['kind'];

export function VoiceDraft({ timeZone, onCreated }: Props) {
  const client = useAcademic();
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<Kind>('reminder');
  const [date, setDate] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<AcademicSubject[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectError, setSubjectError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const key = useRef<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingSubjects(true);
    setSubjectError(undefined);
    void client.listSubjects({ limit: 100 }).then((page) => {
      if (active) { setSubjects(page.items); setNextCursor(page.nextCursor); }
    }).catch(() => {
      if (active) setSubjectError('Não foi possível carregar as matérias. Você pode salvar sem matéria.');
    }).finally(() => { if (active) setLoadingSubjects(false); });
    return () => { active = false; };
  }, [client, open]);

  const change = () => { key.current = null; setError(undefined); };
  const openForm = () => {
    if (!date && timeZone) setDate(displayBrazilianDate(todayInZone(timeZone)));
    setOpen(true);
  };
  const receivedTranscript = (text: string) => {
    if (inFlight.current) return;
    setMessage(undefined);
    change();
    setDescription(text);
    setTitle(text.length <= 160 ? text : '');
    openForm();
  };
  const reset = () => {
    setOpen(false);
    setTitle('');
    setDescription('');
    setKind('reminder');
    setDate('');
    setSubjectId(null);
    setSubjects([]);
    setNextCursor(null);
    setMessage(undefined);
    setError(undefined);
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
    const input: CreateCommitmentInput = {
      title: title.trim(), description: description.trim() || null, kind, subjectId,
      due: { precision: 'date', localDate, timeZone },
    };
    key.current ??= createIdempotencyKey();
    inFlight.current = true;
    setSaving(true);
    setError(undefined);
    try {
      const item = await client.createCommitment(input, key.current);
      reset();
      onCreated(item);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível confirmar o cadastro. Tente novamente.');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return <>
    <View style={styles.actions}>
      <AwsVoiceCapture onTranscript={receivedTranscript} />
      <NomiButton label="Cadastrar por texto" variant="secondary" onPress={openForm} style={styles.action} />
    </View>
    <Modal visible={open} animationType="slide" transparent onRequestClose={() => { if (!inFlight.current) reset(); }}>
      <View style={styles.backdrop}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.modalContent, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
          <NomiCard style={[styles.panel, { backgroundColor: colors.background }]}>
            <NomiText accessibilityRole="header" variant="heading">Cadastrar compromisso</NomiText>
            <NomiText variant="supporting" tone="muted">Confira os campos antes de salvar. A transcrição pode conter erros.</NomiText>
            {message ? <NomiCard tone="error" padding={14}><NomiText variant="supporting">{message}</NomiText></NomiCard> : null}
            <NomiTextField label="Título" value={title} onChangeText={(value) => { change(); setTitle(value); }} maxLength={160} placeholder="Ex.: Entregar trabalho de Cálculo" />
            <NomiTextField label="Descrição ou texto transcrito (opcional)" value={description} onChangeText={(value) => { change(); setDescription(value); }} multiline maxLength={4000} inputStyle={styles.textInput} />
            <NomiText variant="caption" tone="muted">A data falada não é interpretada automaticamente. Informe o prazo abaixo.</NomiText>
            <NomiText variant="label">Tipo</NomiText>
            <View style={styles.options}>
              {([['reminder', 'Lembrete'], ['assignment', 'Trabalho'], ['exam', 'Prova']] as const).map(([value, label]) =>
                <NomiButton key={value} label={kind === value ? 'Selecionado: ' + label : label} variant={kind === value ? 'primary' : 'secondary'}
                  onPress={() => { change(); setKind(value); }} style={styles.option} />)}
            </View>
            <NomiTextField label="Data do prazo (DD/MM/AAAA)" value={date} onChangeText={(value) => { change(); setDate(value); }}
              keyboardType="numbers-and-punctuation" maxLength={10} placeholder="21/11/2026" />
            <NomiText variant="caption" tone="muted">Prazo sem horário · Fuso: {timeZone ?? 'carregando'}</NomiText>
            <NomiText variant="label">Matéria (opcional)</NomiText>
            {loadingSubjects && subjects.length === 0 ? <NomiText tone="muted">Carregando matérias...</NomiText> : null}
            {subjectError ? <NomiText tone="error">{subjectError}</NomiText> : null}
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
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 44 },
});
