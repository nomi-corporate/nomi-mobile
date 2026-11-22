// Pure parsing and error mapping for the Nomi Assistant semester proposal contract (POST /api/v1/semester-proposals).
// Keep this file free of React Native / Expo imports so it can be tested with node:test.
import { AssistantUnavailableError, INVALID_PROPOSAL_MESSAGE, PROPOSAL_SESSION_MESSAGE } from '../voice/proposalParsing.ts';

export { AssistantUnavailableError } from '../voice/proposalParsing.ts';

export type SemesterProposalStatus = 'readyForReview' | 'needsClarification' | 'unsupported';
export type SemesterQuestionField = 'subjects' | 'professor';

export type SemesterSubjectProposal = {
  name: string;
  code: string | null;
  professorName: string | null;
  existingSubjectId: string | null;
  existingProfessorId: string | null;
};

export type SemesterQuestion = { field: SemesterQuestionField; message: string };

export type SemesterProposal = {
  id: string;
  version: 1;
  status: SemesterProposalStatus;
  message: string | null;
  subjects: SemesterSubjectProposal[];
  questions: SemesterQuestion[];
  expiresAt: string;
};

export const MAX_SEMESTER_SUBJECTS = 20;
export const SEMESTER_SUBJECT_NAME_MAX = 120;
export const SEMESTER_SUBJECT_CODE_MAX = 30;
export const SEMESTER_PROFESSOR_NAME_MAX = 120;
export const SEMESTER_TEXT_MAX = 4000;

export const SEMESTER_INVALID_MESSAGE = INVALID_PROPOSAL_MESSAGE;
export const SEMESTER_SESSION_MESSAGE = PROPOSAL_SESSION_MESSAGE;
export const SEMESTER_INVALID_TEXT_MESSAGE = 'Confira o texto e tente novamente.';
export const SEMESTER_TOO_MANY_MESSAGE = 'Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.';
export const SEMESTER_GENERIC_ERROR_MESSAGE = 'Não foi possível interpretar as matérias. Tente novamente.';

const STATUSES = ['readyForReview', 'needsClarification', 'unsupported'] as const;
const QUESTION_FIELDS = ['subjects', 'professor'] as const;

function invalid(): never {
  throw new Error(SEMESTER_INVALID_MESSAGE);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

/** Trims an optional text; empty text becomes null. Throws when longer than `max`. */
function optionalText(value: unknown, max: number): string | null {
  if (!isNullableString(value)) invalid();
  const trimmed = value?.trim() ?? '';
  if (trimmed.length > max) invalid();
  return trimmed || null;
}

function optionalId(value: unknown): string | null {
  if (!isNullableString(value)) invalid();
  if (value !== null && !value.trim()) invalid();
  return value;
}

function parseSubject(value: unknown): SemesterSubjectProposal {
  if (!isRecord(value) || typeof value.name !== 'string') invalid();
  const name = value.name.trim();
  if (name.length < 1 || name.length > SEMESTER_SUBJECT_NAME_MAX) invalid();
  return {
    name,
    code: optionalText(value.code, SEMESTER_SUBJECT_CODE_MAX),
    professorName: optionalText(value.professorName, SEMESTER_PROFESSOR_NAME_MAX),
    existingSubjectId: optionalId(value.existingSubjectId),
    existingProfessorId: optionalId(value.existingProfessorId),
  };
}

function parseSubjects(value: unknown): SemesterSubjectProposal[] {
  if (!Array.isArray(value) || value.length > MAX_SEMESTER_SUBJECTS) invalid();
  return value.map(parseSubject);
}

function parseQuestions(value: unknown): SemesterQuestion[] {
  if (!Array.isArray(value)) invalid();
  return value.map((item) => {
    if (!isRecord(item) || typeof item.field !== 'string'
      || !(QUESTION_FIELDS as readonly string[]).includes(item.field) || typeof item.message !== 'string') {
      invalid();
    }
    return { field: item.field as SemesterQuestionField, message: item.message as string };
  });
}

/** Validates a 201 body of POST /api/v1/semester-proposals. Throws an Error with a Portuguese message when invalid. */
export function parseSemesterProposal(value: unknown): SemesterProposal {
  if (!isRecord(value)) invalid();
  if (typeof value.id !== 'string' || !value.id.trim()) invalid();
  if (value.version !== 1) invalid();
  if (typeof value.status !== 'string' || !(STATUSES as readonly string[]).includes(value.status)) invalid();
  if (!isNullableString(value.message)) invalid();
  const subjects = parseSubjects(value.subjects);
  if (value.status === 'readyForReview' && subjects.length === 0) invalid();
  const questions = parseQuestions(value.questions);
  if (typeof value.expiresAt !== 'string' || Number.isNaN(Date.parse(value.expiresAt))) invalid();
  return {
    id: value.id,
    version: 1,
    status: value.status as SemesterProposalStatus,
    message: value.message,
    subjects,
    questions,
    expiresAt: value.expiresAt,
  };
}

/** Maps a non-2xx response of the semester proposal endpoint to the error the screen should show. */
export function semesterErrorForStatus(status: number, body: unknown): Error {
  if (status === 401) return new Error(SEMESTER_SESSION_MESSAGE);
  if (status === 422) {
    const detail = isRecord(body) && typeof body.detail === 'string' ? body.detail.trim() : '';
    return new Error(detail || SEMESTER_INVALID_TEXT_MESSAGE);
  }
  if (status === 429) return new Error(SEMESTER_TOO_MANY_MESSAGE);
  if (status >= 500) return new AssistantUnavailableError();
  return new Error(SEMESTER_GENERIC_ERROR_MESSAGE);
}

/** Builds the pt-BR enumeration used in the done screen: "A", "A e B", "A, B e C". */
export function joinSubjectNames(names: readonly string[]): string {
  const items = names.map((name) => name.trim()).filter(Boolean);
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

/** Case- and accent-insensitive key used to match professors and subjects typed by the user. */
export function normalizeMatchKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}
