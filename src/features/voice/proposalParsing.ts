// Pure parsing and error mapping for the Nomi Assistant commitment proposal contract (TEC-003 §7).
// Keep this file free of React Native / Expo imports so it can be tested with node:test.

export type ProposalStatus = 'readyForReview' | 'needsClarification' | 'unsupported';
export type ProposalKind = 'exam' | 'assignment' | 'reminder';
export type ProposalQuestionField = 'due' | 'subjectId' | 'title' | 'kind';

export type ProposalDue =
  | { precision: 'date'; localDate: string; timeZone: string }
  | { precision: 'dateTime'; localDate: string; localTime: string; offset: string; timeZone: string };

export type ProposalCandidate = {
  title: string;
  kind: ProposalKind;
  description: string | null;
  subjectId: string | null;
  professorId: string | null;
  due: ProposalDue | null;
};

export type ProposalQuestion = { field: ProposalQuestionField; message: string };

export type CommitmentProposal = {
  id: string;
  version: 1;
  status: ProposalStatus;
  message: string | null;
  candidate: ProposalCandidate | null;
  questions: ProposalQuestion[];
  expiresAt: string;
};

export const INVALID_PROPOSAL_MESSAGE = 'O Nomi Assistant retornou uma resposta inválida. Tente novamente.';
export const PROPOSAL_SESSION_MESSAGE = 'Sua sessão expirou. Entre novamente.';
export const PROPOSAL_GENERIC_ERROR_MESSAGE = 'Não foi possível interpretar o compromisso. Tente novamente.';
export const PROPOSAL_INVALID_TEXT_MESSAGE = 'Confira o texto e tente novamente.';

/** The Assistant cannot be reached or is unavailable (503, network or timeout). The user can still fill the manual form. */
export class AssistantUnavailableError extends Error {
  constructor() {
    super('O assistente está indisponível no momento.');
    this.name = 'AssistantUnavailableError';
  }
}

const STATUSES = ['readyForReview', 'needsClarification', 'unsupported'] as const;
const KINDS = ['exam', 'assignment', 'reminder'] as const;
const QUESTION_FIELDS = ['due', 'subjectId', 'title', 'kind'] as const;
const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;
const OFFSET = /^[+-](0\d|1[0-4]):[0-5]\d$/;

function invalid(): never {
  throw new Error(INVALID_PROPOSAL_MESSAGE);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function includesValue<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

function isValidLocalDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = LOCAL_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return month >= 1 && month <= 12
    && date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

function parseDue(value: unknown): ProposalDue | null {
  if (value === null) return null;
  if (!isRecord(value)) invalid();
  const localDate = value.localDate;
  const timeZone = value.timeZone;
  if (!isValidLocalDate(localDate) || typeof timeZone !== 'string' || !timeZone.trim()) invalid();
  if (value.precision === 'date') return { precision: 'date', localDate, timeZone };
  const localTime = value.localTime;
  const offset = value.offset;
  if (value.precision === 'dateTime' && typeof localTime === 'string' && LOCAL_TIME.test(localTime)
    && typeof offset === 'string' && OFFSET.test(offset)) {
    return { precision: 'dateTime', localDate, localTime, offset, timeZone };
  }
  return invalid();
}

function parseCandidate(value: unknown): ProposalCandidate {
  if (!isRecord(value)) invalid();
  if (typeof value.title !== 'string' || !includesValue(KINDS, value.kind)
    || !isNullableString(value.description) || !isNullableString(value.subjectId) || !isNullableString(value.professorId)) {
    invalid();
  }
  return {
    title: value.title,
    kind: value.kind,
    description: value.description,
    subjectId: value.subjectId,
    professorId: value.professorId,
    due: parseDue(value.due),
  };
}

function parseQuestions(value: unknown): ProposalQuestion[] {
  if (!Array.isArray(value)) invalid();
  return value.map((item) => {
    if (!isRecord(item) || !includesValue(QUESTION_FIELDS, item.field) || typeof item.message !== 'string') invalid();
    return { field: item.field, message: item.message };
  });
}

/** Validates a 201 body of POST /api/v1/commitment-proposals. Throws an Error with a Portuguese message when invalid. */
export function parseCommitmentProposal(value: unknown): CommitmentProposal {
  if (!isRecord(value)) invalid();
  if (typeof value.id !== 'string' || !value.id.trim()) invalid();
  if (value.version !== 1) invalid();
  if (!includesValue(STATUSES, value.status)) invalid();
  if (!isNullableString(value.message)) invalid();
  const candidate = value.candidate === null ? null : parseCandidate(value.candidate);
  if (value.status === 'readyForReview' && candidate === null) invalid();
  const questions = parseQuestions(value.questions);
  if (typeof value.expiresAt !== 'string' || Number.isNaN(Date.parse(value.expiresAt))) invalid();
  return {
    id: value.id,
    version: 1,
    status: value.status,
    message: value.message,
    candidate,
    questions,
    expiresAt: value.expiresAt,
  };
}

/** Maps a non-2xx response of the proposal endpoint to the error the screen should show. */
export function proposalErrorForStatus(status: number, body: unknown): Error {
  if (status === 401) return new Error(PROPOSAL_SESSION_MESSAGE);
  if (status === 422) {
    const detail = isRecord(body) && typeof body.detail === 'string' ? body.detail.trim() : '';
    return new Error(detail || PROPOSAL_INVALID_TEXT_MESSAGE);
  }
  if (status >= 500) return new AssistantUnavailableError();
  return new Error(PROPOSAL_GENERIC_ERROR_MESSAGE);
}
