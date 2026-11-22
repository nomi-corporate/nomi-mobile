import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAcademic } from '@/features/academic/AcademicProvider';
import { createIdempotencyKey, type AgendaItem, type CreateCommitmentInput } from '@/features/academic/infrastructure/AcademicClient';
import { zonedToInstant } from '@/features/agenda/zonedTime';
import { useProfile } from '@/features/profile/ProfileProvider';
import { reminderTrigger, type ReminderPreferences } from '@/features/reminders/schedule';
import { loadReminderPreferences, syncCommitmentReminder } from '@/features/reminders';
import { AssistantProposalClient, AssistantUnavailableError, type CommitmentProposal } from '@/features/voice/AssistantProposalClient';
import type { ProposalKind, ProposalQuestion } from '@/features/voice/proposalParsing';

/**
 * Shared state of the capture flow (Figma 04.01–04.05):
 * listening/typing → interpretation by the Assistant → clarify → review → edit → saved.
 * Screens only render this state and call its actions; nothing here is presentational.
 */
export type CaptureDraft = {
  title: string;
  kind: ProposalKind;
  description: string | null;
  subjectId: string | null;
  professorId: string | null;
  /** Civil date "YYYY-MM-DD" in the profile time zone, or null when still unknown. */
  localDate: string | null;
  /** "HH:MM" or null for a deadline without time. */
  localTime: string | null;
};

export type InterpretationState =
  | { status: 'idle' }
  | { status: 'interpreting' }
  | { status: 'ready'; questions: ProposalQuestion[] }
  | { status: 'unsupported'; message: string }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

type CaptureContextValue = {
  /** Transcript (voice) or typed description. */
  text: string;
  setText(value: string): void;
  timeZone: string | null;
  interpretation: InterpretationState;
  draft: CaptureDraft | null;
  /** Merge a partial change into the draft (Editar compromisso / Confirmar data). */
  updateDraft(patch: Partial<CaptureDraft>): void;
  /** Starts a manual draft from the current text, skipping the Assistant. */
  startManualDraft(): void;
  /** Sends the text to the Assistant. Resolves with the resulting state. */
  interpret(text?: string): Promise<InterpretationState>;
  saving: boolean;
  saveError: string | null;
  /** Validates the draft and creates the commitment in the Academic. Returns the item on success. */
  save(): Promise<AgendaItem | null>;
  saved: AgendaItem | null;
  /** When the local reminder for the saved commitment will fire, if any. */
  savedReminderAt: Date | null;
  reset(): void;
};

export const UNSUPPORTED_FALLBACK = 'O Nomi registra apenas compromissos acadêmicos, como provas, trabalhos, entregas e aulas.';
export const UNAVAILABLE_MESSAGE = 'O assistente está indisponível. Revise os campos manualmente.';

const CaptureContext = createContext<CaptureContextValue | null>(null);

export function CaptureProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const academic = useAcademic();
  const { profile } = useProfile();
  const timeZone = profile?.timeZone ?? null;
  const proposalClient = useMemo(() => {
    try { return new AssistantProposalClient(auth.getAccessToken); } catch { return null; }
  }, [auth.getAccessToken]);

  const [text, setTextState] = useState('');
  const [interpretation, setInterpretation] = useState<InterpretationState>({ status: 'idle' });
  const [draft, setDraft] = useState<CaptureDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<AgendaItem | null>(null);
  const [savedReminderAt, setSavedReminderAt] = useState<Date | null>(null);
  const interpretKey = useRef<{ text: string; key: string } | null>(null);
  const saveKey = useRef<string | null>(null);
  const inFlight = useRef(false);

  const setText = useCallback((value: string) => { setTextState(value); }, []);

  const manualDraft = useCallback((source: string): CaptureDraft => ({
    title: source.trim().length <= 160 ? source.trim() : '',
    kind: 'reminder',
    description: source.trim() || null,
    subjectId: null,
    professorId: null,
    localDate: null,
    localTime: null,
  }), []);

  const updateDraft = useCallback((patch: Partial<CaptureDraft>) => {
    saveKey.current = null;
    setSaveError(null);
    setDraft((current) => ({ ...(current ?? manualDraft('')), ...patch }));
  }, [manualDraft]);

  const startManualDraft = useCallback(() => {
    saveKey.current = null;
    setDraft(manualDraft(text));
    setInterpretation({ status: 'idle' });
  }, [manualDraft, text]);

  const interpret = useCallback(async (override?: string): Promise<InterpretationState> => {
    const source = (override ?? text).trim();
    if (override !== undefined) setTextState(override);
    if (!source) { const state = { status: 'error', message: 'Descreva o compromisso antes de continuar.' } as const; setInterpretation(state); return state; }
    if (!proposalClient || !timeZone) {
      const state = { status: 'unavailable', message: UNAVAILABLE_MESSAGE } as const;
      setDraft(manualDraft(source)); setInterpretation(state); return state;
    }
    if (interpretKey.current?.text !== source) interpretKey.current = { text: source, key: createIdempotencyKey() };
    setInterpretation({ status: 'interpreting' });
    let next: InterpretationState;
    try {
      const proposal = await proposalClient.createProposal(source, timeZone, interpretKey.current.key);
      next = applyProposal(proposal, source);
    } catch (cause) {
      if (cause instanceof AssistantUnavailableError) {
        setDraft(manualDraft(source));
        next = { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
      } else {
        next = { status: 'error', message: cause instanceof Error ? cause.message : 'Não foi possível interpretar. Tente novamente.' };
      }
    }
    setInterpretation(next);
    return next;

    function applyProposal(proposal: CommitmentProposal, sourceText: string): InterpretationState {
      if (proposal.status === 'unsupported' || !proposal.candidate) {
        setDraft(null);
        return { status: 'unsupported', message: proposal.message?.trim() || UNSUPPORTED_FALLBACK };
      }
      const candidate = proposal.candidate;
      saveKey.current = null;
      setDraft({
        title: candidate.title,
        kind: candidate.kind,
        description: candidate.description ?? sourceText,
        subjectId: candidate.subjectId,
        professorId: candidate.professorId,
        localDate: candidate.due?.localDate ?? null,
        localTime: candidate.due?.precision === 'dateTime' ? candidate.due.localTime.slice(0, 5) : null,
      });
      return { status: 'ready', questions: proposal.questions };
    }
  }, [manualDraft, proposalClient, text, timeZone]);

  const save = useCallback(async (): Promise<AgendaItem | null> => {
    if (inFlight.current || !draft) return null;
    const title = draft.title.trim();
    if (!title || title.length > 160) { setSaveError('Informe um título de até 160 caracteres.'); return null; }
    if (!draft.localDate) { setSaveError('Escolha a data do compromisso.'); return null; }
    if (!timeZone) { setSaveError('Aguarde o carregamento do seu fuso no perfil e tente novamente.'); return null; }
    let due: CreateCommitmentInput['due'];
    if (draft.localTime) {
      const resolved = zonedToInstant(draft.localDate, draft.localTime, timeZone);
      if (!resolved) { setSaveError('Esse horário não existe nesse dia no seu fuso.'); return null; }
      due = { precision: 'dateTime', localDate: draft.localDate, localTime: `${draft.localTime}:00`, offset: resolved.offset, timeZone };
    } else {
      due = { precision: 'date', localDate: draft.localDate, timeZone };
    }
    saveKey.current ??= createIdempotencyKey();
    inFlight.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const item = await academic.createCommitment({
        title, description: draft.description?.trim() || null, kind: draft.kind, subjectId: draft.subjectId, due,
      }, saveKey.current);
      setSaved(item);
      const prefs: ReminderPreferences = await loadReminderPreferences();
      setSavedReminderAt(reminderTrigger(item, prefs, new Date()));
      void syncCommitmentReminder(item);
      return item;
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Não foi possível salvar. Tente novamente.');
      return null;
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }, [academic, draft, timeZone]);

  const reset = useCallback(() => {
    setTextState('');
    setInterpretation({ status: 'idle' });
    setDraft(null);
    setSaving(false);
    setSaveError(null);
    setSaved(null);
    setSavedReminderAt(null);
    interpretKey.current = null;
    saveKey.current = null;
  }, []);

  const value: CaptureContextValue = {
    text, setText, timeZone, interpretation, draft, updateDraft, startManualDraft, interpret,
    saving, saveError, save, saved, savedReminderAt, reset,
  };
  return <CaptureContext.Provider value={value}>{children}</CaptureContext.Provider>;
}

export function useCapture(): CaptureContextValue {
  const value = useContext(CaptureContext);
  if (!value) throw new Error('CaptureProvider is required');
  return value;
}
