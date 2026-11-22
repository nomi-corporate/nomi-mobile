import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAcademic } from '@/features/academic/AcademicProvider';
import { createIdempotencyKey } from '@/features/academic/infrastructure/AcademicClient';
import { useProfile } from '@/features/profile/ProfileProvider';
import { AssistantUnavailableError, SemesterProposalClient } from './SemesterProposalClient';
import { normalizeMatchKey, type SemesterProposal, type SemesterQuestion, type SemesterSubjectProposal } from './semesterParsing';

/**
 * Shared state of the semester flow (Figma 02.01–02.05): voice or text → Assistant interpretation → review → edit → saved.
 * Screens only render this state and call its actions; nothing here is presentational.
 */
export type SemesterItemStatus = 'pending' | 'saving' | 'saved' | 'failed';

export type SemesterItem = {
  /** Stable client identity for idempotency keys; survives reordering and removal. */
  clientKey: string;
  name: string;
  code: string | null;
  professorName: string | null;
  existingSubjectId: string | null;
  existingProfessorId: string | null;
  status: SemesterItemStatus;
  error?: string;
};

export type SemesterItemInput = {
  name: string;
  code: string | null;
  professorName: string | null;
  existingSubjectId: string | null;
  existingProfessorId: string | null;
};

export type SemesterInterpretation =
  | { status: 'idle' }
  | { status: 'interpreting' }
  | { status: 'ready'; questions: SemesterQuestion[] }
  | { status: 'unsupported'; message: string }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

export const SEMESTER_UNAVAILABLE_MESSAGE = 'O assistente está indisponível. Adicione as matérias manualmente.';
export const SEMESTER_UNSUPPORTED_FALLBACK = 'O Nomi cadastra apenas matérias e professores do seu semestre.';
export const SEMESTER_SAVE_PARTIAL_MESSAGE = 'Algumas matérias não foram salvas. Revise a lista e tente novamente.';
const SAVE_FALLBACK_MESSAGE = 'Não foi possível salvar esta matéria. Tente novamente.';

type IntentRecord = { signature: string; key: string };

type SemesterContextValue = {
  /** Transcript (voice) or typed description. */
  text: string;
  setText(value: string): void;
  items: SemesterItem[];
  questions: SemesterQuestion[];
  interpretation: SemesterInterpretation;
  /** Sends the text to the Assistant and replaces the list with its subjects. Resolves with the resulting state. */
  interpret(text?: string): Promise<SemesterInterpretation>;
  updateItem(index: number, patch: Partial<SemesterItemInput>): void;
  addItem(input: SemesterItemInput): void;
  removeItem(index: number): void;
  /** Saves the pending items in order. Returns true only when every item is saved. */
  save(): Promise<boolean>;
  saving: boolean;
  saveError: string | null;
  /** Names of the subjects saved by the last complete save, in list order. */
  savedNames: string[];
  reset(): void;
};

const SemesterContext = createContext<SemesterContextValue | null>(null);

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

function itemFromProposal(subject: SemesterSubjectProposal): SemesterItem {
  return {
    clientKey: createIdempotencyKey(),
    name: subject.name,
    code: subject.code,
    professorName: subject.professorName,
    existingSubjectId: subject.existingSubjectId,
    existingProfessorId: subject.existingProfessorId,
    status: 'pending',
  };
}

/** Reuses the key recorded for `id` while the signature is unchanged, so retries replay the same server intent. */
function intentKeyFor(records: Map<string, IntentRecord>, id: string, signature: string): string {
  const current = records.get(id);
  if (current && current.signature === signature) return current.key;
  const next = { signature, key: createIdempotencyKey() };
  records.set(id, next);
  return next.key;
}

export function SemesterProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const academic = useAcademic();
  const { profile } = useProfile();
  const timeZone = profile?.timeZone ?? null;
  const proposalClient = useMemo(() => {
    try { return new SemesterProposalClient(auth.getAccessToken); } catch { return null; }
  }, [auth.getAccessToken]);

  const [text, setTextState] = useState('');
  const [items, setItems] = useState<SemesterItem[]>([]);
  const [questions, setQuestions] = useState<SemesterQuestion[]>([]);
  const [interpretation, setInterpretation] = useState<SemesterInterpretation>({ status: 'idle' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedNames, setSavedNames] = useState<string[]>([]);

  // Refs mirror state for the sequential save loop and keep retries on the same idempotency keys.
  const itemsRef = useRef<SemesterItem[]>([]);
  const interpretKey = useRef<{ text: string; key: string } | null>(null);
  const subjectIntents = useRef(new Map<string, IntentRecord>());
  const professorIntents = useRef(new Map<string, IntentRecord>());
  /** Active professors keyed by normalized name, loaded once per flow; professors created here are added so the batch dedupes them. */
  const professorsByName = useRef<Map<string, string> | null>(null);
  const inFlight = useRef(false);

  const writeItems = useCallback((next: SemesterItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const patchItem = useCallback((clientKey: string, patch: Partial<SemesterItem>) => {
    writeItems(itemsRef.current.map((item) => (item.clientKey === clientKey ? { ...item, ...patch } : item)));
  }, [writeItems]);

  const setText = useCallback((value: string) => { setTextState(value); }, []);

  const interpret = useCallback(async (override?: string): Promise<SemesterInterpretation> => {
    const source = (override ?? text).trim();
    if (override !== undefined) setTextState(override);
    const commit = (state: SemesterInterpretation) => { setInterpretation(state); return state; };
    if (!source) return commit({ status: 'error', message: 'Descreva as matérias antes de continuar.' });
    if (!timeZone) return commit({ status: 'error', message: 'Aguarde o carregamento do seu perfil e tente novamente.' });
    if (!proposalClient) return commit({ status: 'unavailable', message: SEMESTER_UNAVAILABLE_MESSAGE });

    if (interpretKey.current?.text !== source) interpretKey.current = { text: source, key: createIdempotencyKey() };
    setInterpretation({ status: 'interpreting' });
    let next: SemesterInterpretation;
    try {
      const proposal: SemesterProposal = await proposalClient.createProposal(source, timeZone, interpretKey.current.key);
      if (proposal.status === 'unsupported') {
        writeItems([]);
        setQuestions([]);
        next = { status: 'unsupported', message: proposal.message?.trim() || SEMESTER_UNSUPPORTED_FALLBACK };
      } else {
        writeItems(proposal.subjects.map(itemFromProposal));
        setQuestions(proposal.questions);
        setSavedNames([]);
        next = { status: 'ready', questions: proposal.questions };
      }
    } catch (cause) {
      if (cause instanceof AssistantUnavailableError) {
        writeItems([]);
        setQuestions([]);
        next = { status: 'unavailable', message: SEMESTER_UNAVAILABLE_MESSAGE };
      } else {
        next = { status: 'error', message: messageOf(cause, 'Não foi possível interpretar. Tente novamente.') };
      }
    }
    return commit(next);
  }, [proposalClient, text, timeZone, writeItems]);

  const updateItem = useCallback((index: number, patch: Partial<SemesterItemInput>) => {
    writeItems(itemsRef.current.map((item, position) => {
      if (position !== index) return item;
      const changed: SemesterItem = { ...item, ...patch };
      // A saved item keeps its status; any other edit makes it pending again so the next save picks it up.
      return item.status === 'saved' ? changed : { ...changed, status: 'pending', error: undefined };
    }));
    setSaveError(null);
  }, [writeItems]);

  const addItem = useCallback((input: SemesterItemInput) => {
    writeItems([...itemsRef.current, { ...input, clientKey: createIdempotencyKey(), status: 'pending' }]);
    setSaveError(null);
  }, [writeItems]);

  const removeItem = useCallback((index: number) => {
    writeItems(itemsRef.current.filter((_, position) => position !== index));
    setSaveError(null);
  }, [writeItems]);

  /** Loads all active professors once for this flow, keyed by normalized name. */
  const ensureRoster = useCallback(async (): Promise<Map<string, string>> => {
    if (professorsByName.current) return professorsByName.current;
    const roster = new Map<string, string>();
    const visited = new Set<string>();
    let cursor: string | undefined;
    for (let page = 0; page < 50; page += 1) {
      const result = await academic.listProfessors({ archived: false, cursor, limit: 100 });
      for (const professor of result.items) {
        const key = normalizeMatchKey(professor.name);
        if (!roster.has(key)) roster.set(key, professor.id);
      }
      if (!result.nextCursor) break;
      if (visited.has(result.nextCursor)) throw new Error('A lista de professores retornou uma paginação repetida. Tente novamente.');
      visited.add(result.nextCursor);
      cursor = result.nextCursor;
    }
    professorsByName.current = roster;
    return roster;
  }, [academic]);

  const resolveProfessorId = useCallback(async (item: SemesterItem): Promise<string | null> => {
    if (item.existingProfessorId) return item.existingProfessorId;
    const name = item.professorName?.trim();
    if (!name) return null;
    const key = normalizeMatchKey(name);
    const roster = await ensureRoster();
    const known = roster.get(key);
    if (known) return known;
    const created = await academic.createProfessor({ name }, intentKeyFor(professorIntents.current, key, name));
    roster.set(key, created.id);
    return created.id;
  }, [academic, ensureRoster]);

  const saveItem = useCallback(async (item: SemesterItem) => {
    const professorId = await resolveProfessorId(item);
    if (item.existingSubjectId) {
      const subject = await academic.getSubject(item.existingSubjectId);
      const linked = subject.professorIds ?? [];
      if (professorId && !linked.includes(professorId)) {
        await academic.replaceSubjectProfessors(subject.id, subject.version, [...linked, professorId]);
      }
      return;
    }
    const created = await academic.createSubject(
      { name: item.name, code: item.code },
      intentKeyFor(subjectIntents.current, item.clientKey, JSON.stringify({ name: item.name, code: item.code })),
    );
    if (professorId) await academic.replaceSubjectProfessors(created.id, created.version, [professorId]);
  }, [academic, resolveProfessorId]);

  const save = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) return false;
    const snapshot = itemsRef.current;
    if (snapshot.length === 0) {
      setSaveError('Adicione pelo menos uma matéria antes de salvar.');
      return false;
    }
    inFlight.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      for (const item of snapshot) {
        if (item.status === 'saved') continue;
        patchItem(item.clientKey, { status: 'saving', error: undefined });
        try {
          await saveItem(item);
          patchItem(item.clientKey, { status: 'saved', error: undefined });
        } catch (cause) {
          patchItem(item.clientKey, { status: 'failed', error: messageOf(cause, SAVE_FALLBACK_MESSAGE) });
        }
      }
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
    const current = itemsRef.current;
    const allSaved = current.length > 0 && current.every((item) => item.status === 'saved');
    if (allSaved) {
      setSavedNames(current.map((item) => item.name));
    } else {
      setSaveError(SEMESTER_SAVE_PARTIAL_MESSAGE);
    }
    return allSaved;
  }, [patchItem, saveItem]);

  const reset = useCallback(() => {
    setTextState('');
    writeItems([]);
    setQuestions([]);
    setInterpretation({ status: 'idle' });
    setSaving(false);
    setSaveError(null);
    setSavedNames([]);
    interpretKey.current = null;
    subjectIntents.current.clear();
    professorIntents.current.clear();
    professorsByName.current = null;
  }, [writeItems]);

  const value = useMemo<SemesterContextValue>(() => ({
    text,
    setText,
    items,
    questions,
    interpretation,
    interpret,
    updateItem,
    addItem,
    removeItem,
    save,
    saving,
    saveError,
    savedNames,
    reset,
  }), [text, setText, items, questions, interpretation, interpret, updateItem, addItem, removeItem, save, saving, saveError, savedNames, reset]);

  return <SemesterContext.Provider value={value}>{children}</SemesterContext.Provider>;
}

export function useSemester(): SemesterContextValue {
  const value = useContext(SemesterContext);
  if (!value) throw new Error('SemesterProvider is required');
  return value;
}
