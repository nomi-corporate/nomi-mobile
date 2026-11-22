import assert from 'node:assert/strict';
import test from 'node:test';
import { AcademicClient, type AgendaItem, type CreateCommitmentInput } from '../src/features/academic/infrastructure/AcademicClient.ts';
import { proposalToFormValues } from '../src/features/voice/proposalForm.ts';
import {
  AssistantUnavailableError,
  INVALID_PROPOSAL_MESSAGE,
  parseCommitmentProposal,
  proposalErrorForStatus,
} from '../src/features/voice/proposalParsing.ts';

const candidate = {
  title: 'Prova de Cálculo',
  kind: 'exam',
  description: null,
  subjectId: 'subject-1',
  professorId: null,
  due: { precision: 'dateTime', localDate: '2026-11-20', localTime: '14:00:00', offset: '-03:00', timeZone: 'America/Sao_Paulo' },
};

const readyProposal = {
  id: 'proposal-1',
  version: 1,
  status: 'readyForReview',
  message: null,
  candidate,
  questions: [],
  expiresAt: '2026-11-22T15:00:00Z',
};

const invalidMessage = (value: unknown) => () => parseCommitmentProposal(value);

test('accepts a ready proposal with a dateTime due', () => {
  const proposal = parseCommitmentProposal(readyProposal);
  assert.equal(proposal.status, 'readyForReview');
  assert.equal(proposal.candidate?.kind, 'exam');
  assert.deepEqual(proposal.candidate?.due, {
    precision: 'dateTime', localDate: '2026-11-20', localTime: '14:00:00', offset: '-03:00', timeZone: 'America/Sao_Paulo',
  });
});

test('accepts a date-only due and needsClarification questions', () => {
  const proposal = parseCommitmentProposal({
    ...readyProposal,
    status: 'needsClarification',
    candidate: { ...candidate, due: { precision: 'date', localDate: '2026-11-20', timeZone: 'America/Sao_Paulo' } },
    questions: [{ field: 'due', message: 'Qual horário da prova?' }],
  });
  assert.equal(proposal.candidate?.due?.precision, 'date');
  assert.deepEqual(proposal.questions, [{ field: 'due', message: 'Qual horário da prova?' }]);
});

test('accepts an unsupported proposal with a null candidate and a user-facing message', () => {
  const proposal = parseCommitmentProposal({
    ...readyProposal,
    status: 'unsupported',
    message: 'Aceitamos apenas temas acadêmicos.',
    candidate: null,
  });
  assert.equal(proposal.status, 'unsupported');
  assert.equal(proposal.candidate, null);
  assert.equal(proposal.message, 'Aceitamos apenas temas acadêmicos.');
});

test('rejects an invalid kind', () => {
  assert.throws(invalidMessage({ ...readyProposal, candidate: { ...candidate, kind: 'party' } }), { message: INVALID_PROPOSAL_MESSAGE });
});

test('rejects an unknown status and a wrong version', () => {
  assert.throws(invalidMessage({ ...readyProposal, status: 'approved' }), { message: INVALID_PROPOSAL_MESSAGE });
  assert.throws(invalidMessage({ ...readyProposal, version: 2 }), { message: INVALID_PROPOSAL_MESSAGE });
});

test('rejects readyForReview without a candidate', () => {
  assert.throws(invalidMessage({ ...readyProposal, candidate: null }), { message: INVALID_PROPOSAL_MESSAGE });
});

test('rejects impossible calendar dates and malformed offsets', () => {
  const impossibleDate = { ...candidate, due: { precision: 'date', localDate: '2026-02-30', timeZone: 'America/Sao_Paulo' } };
  assert.throws(invalidMessage({ ...readyProposal, candidate: impossibleDate }), { message: INVALID_PROPOSAL_MESSAGE });
  const badOffset = { ...candidate, due: { ...candidate.due, offset: '-0300' } };
  assert.throws(invalidMessage({ ...readyProposal, candidate: badOffset }), { message: INVALID_PROPOSAL_MESSAGE });
  const badTime = { ...candidate, due: { ...candidate.due, localTime: '24:00:00' } };
  assert.throws(invalidMessage({ ...readyProposal, candidate: badTime }), { message: INVALID_PROPOSAL_MESSAGE });
});

test('rejects unknown question fields and missing questions array', () => {
  assert.throws(invalidMessage({ ...readyProposal, questions: [{ field: 'location', message: 'Onde?' }] }), { message: INVALID_PROPOSAL_MESSAGE });
  const { questions: _questions, ...withoutQuestions } = readyProposal;
  assert.throws(invalidMessage(withoutQuestions), { message: INVALID_PROPOSAL_MESSAGE });
});

test('rejects a non-object body and an invalid expiresAt', () => {
  assert.throws(invalidMessage(null), { message: INVALID_PROPOSAL_MESSAGE });
  assert.throws(invalidMessage(['proposal']), { message: INVALID_PROPOSAL_MESSAGE });
  assert.throws(invalidMessage({ ...readyProposal, expiresAt: 'amanhã' }), { message: INVALID_PROPOSAL_MESSAGE });
});

test('maps 401 to a session message', () => {
  assert.equal(proposalErrorForStatus(401, null).message, 'Sua sessão expirou. Entre novamente.');
});

test('maps 422 to the server detail, with a fallback when there is none', () => {
  assert.equal(proposalErrorForStatus(422, { title: 'Texto inválido', detail: 'O texto está vazio.' }).message, 'O texto está vazio.');
  assert.equal(proposalErrorForStatus(422, { title: 'Texto inválido' }).message, 'Confira o texto e tente novamente.');
});

test('maps 503 and other server errors to AssistantUnavailableError', () => {
  assert.ok(proposalErrorForStatus(503, null) instanceof AssistantUnavailableError);
  assert.ok(proposalErrorForStatus(500, null) instanceof AssistantUnavailableError);
});

test('maps other client errors to a retry message', () => {
  const error = proposalErrorForStatus(409, null);
  assert.equal(error instanceof AssistantUnavailableError, false);
  assert.equal(error.message, 'Não foi possível interpretar o compromisso. Tente novamente.');
});

test('prefills the manual form from a dateTime proposal', () => {
  const values = proposalToFormValues(parseCommitmentProposal(readyProposal), 'prova de Cálculo dia 20 às 14h');
  assert.deepEqual(values, {
    title: 'Prova de Cálculo',
    kind: 'exam',
    description: 'prova de Cálculo dia 20 às 14h',
    subjectId: 'subject-1',
    date: '20/11/2026',
    time: '14:00',
  });
});

test('keeps the candidate description when present and leaves time empty for date precision', () => {
  const proposal = parseCommitmentProposal({
    ...readyProposal,
    candidate: { ...candidate, description: 'Capítulos 1 a 3', due: { precision: 'date', localDate: '2026-12-01', timeZone: 'America/Sao_Paulo' } },
  });
  const values = proposalToFormValues(proposal, 'texto original');
  assert.equal(values.description, 'Capítulos 1 a 3');
  assert.equal(values.date, '01/12/2026');
  assert.equal(values.time, '');
});

test('an unsupported or candidate-less proposal yields an empty form that keeps the source text', () => {
  const proposal = parseCommitmentProposal({ ...readyProposal, status: 'unsupported', candidate: null });
  assert.deepEqual(proposalToFormValues(proposal, 'receita de bolo'), {
    title: '', kind: 'reminder', description: 'receita de bolo', subjectId: null, date: '', time: '',
  });
});

test('createCommitment accepts a dateTime response and sends the dateTime due', async () => {
  const item: AgendaItem = {
    id: 'item-1', itemType: 'commitment', title: 'Prova de Cálculo', description: null, kind: 'exam',
    subjectId: 'subject-1', subjectName: 'Cálculo I', status: 'pending', displayDate: '2026-11-20', displayTime: '14:00',
    due: { precision: 'dateTime', localDate: '2026-11-20', localTime: '14:00:00', offset: '-03:00', timeZone: 'America/Sao_Paulo' },
    version: 1,
  };
  const input: CreateCommitmentInput = {
    title: 'Prova de Cálculo', description: null, kind: 'exam', subjectId: 'subject-1',
    due: { precision: 'dateTime', localDate: '2026-11-20', localTime: '14:00:00', offset: '-03:00', timeZone: 'America/Sao_Paulo' },
  };
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, 'https://academic.example.test/api/v1/commitments');
    assert.equal(new Headers(options?.headers).get('Idempotency-Key'), 'key-1');
    assert.deepEqual(JSON.parse(String(options?.body)), input);
    return Response.json(item, { status: 201 });
  };
  const created = await new AcademicClient('https://academic.example.test', async () => 'access-token', request).createCommitment(input, 'key-1');
  assert.equal(created.due.precision, 'dateTime');
});

test('createCommitment rejects a response with an unknown due precision', async () => {
  const request: typeof fetch = async () => Response.json({
    id: 'item-1', title: 'Prova', status: 'pending', version: 1, due: { precision: 'week', localDate: '2026-11-20', timeZone: 'America/Sao_Paulo' },
  }, { status: 201 });
  await assert.rejects(
    new AcademicClient('https://academic.example.test', async () => 'access-token', request)
      .createCommitment({ title: 'Prova', description: null, kind: 'exam', subjectId: null, due: { precision: 'date', localDate: '2026-11-20', timeZone: 'America/Sao_Paulo' } }, 'key-2'),
    (error: unknown) => error instanceof Error && error.message.includes('não confirmou'),
  );
});
