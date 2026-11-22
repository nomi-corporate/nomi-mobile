import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AssistantUnavailableError,
  MAX_SEMESTER_SUBJECTS,
  joinSubjectNames,
  normalizeMatchKey,
  parseSemesterProposal,
  semesterErrorForStatus,
} from '../src/features/semester/semesterParsing.ts';

const base = {
  id: 'proposal-1',
  version: 1,
  message: null,
  expiresAt: '2026-11-22T15:00:00Z',
};
const subject = (overrides: Record<string, unknown> = {}) => ({
  name: 'Cálculo I',
  code: 'MAT101',
  professorName: 'Ana',
  existingSubjectId: null,
  existingProfessorId: null,
  ...overrides,
});

test('parses a ready semester proposal with trimmed subjects', () => {
  const parsed = parseSemesterProposal({
    ...base,
    status: 'readyForReview',
    subjects: [subject({ name: '  Cálculo I  ', code: '  ', professorName: ' Ana ' }), subject({ name: 'Física', code: null, professorName: null, existingSubjectId: 'subject-2' })],
    questions: [{ field: 'professor', message: 'Qual o professor de Física?' }],
  });
  assert.equal(parsed.status, 'readyForReview');
  assert.equal(parsed.subjects[0].name, 'Cálculo I');
  assert.equal(parsed.subjects[0].code, null);
  assert.equal(parsed.subjects[0].professorName, 'Ana');
  assert.equal(parsed.subjects[1].existingSubjectId, 'subject-2');
  assert.deepEqual(parsed.questions, [{ field: 'professor', message: 'Qual o professor de Física?' }]);
});

test('accepts needsClarification without subjects and unsupported with no subjects', () => {
  assert.equal(parseSemesterProposal({ ...base, status: 'needsClarification', subjects: [], questions: [{ field: 'subjects', message: 'Quais matérias?' }] }).status, 'needsClarification');
  assert.equal(parseSemesterProposal({ ...base, status: 'unsupported', message: 'Fora do tema.', subjects: [], questions: [] }).message, 'Fora do tema.');
});

test('rejects readyForReview without subjects', () => {
  assert.throws(() => parseSemesterProposal({ ...base, status: 'readyForReview', subjects: [], questions: [] }), /resposta inválida/);
});

test('rejects malformed envelopes', () => {
  const ok = { ...base, status: 'readyForReview', subjects: [subject()], questions: [] };
  assert.throws(() => parseSemesterProposal(null), /resposta inválida/);
  assert.throws(() => parseSemesterProposal({ ...ok, id: ' ' }), /resposta inválida/);
  assert.throws(() => parseSemesterProposal({ ...ok, version: 2 }), /resposta inválida/);
  assert.throws(() => parseSemesterProposal({ ...ok, status: 'done' }), /resposta inválida/);
  assert.throws(() => parseSemesterProposal({ ...ok, message: 42 }), /resposta inválida/);
  assert.throws(() => parseSemesterProposal({ ...ok, expiresAt: 'amanhã' }), /resposta inválida/);
  assert.throws(() => parseSemesterProposal({ ...ok, questions: [{ field: 'due', message: 'x' }] }), /resposta inválida/);
  assert.throws(() => parseSemesterProposal({ ...ok, questions: [{ field: 'subjects' }] }), /resposta inválida/);
});

test('rejects invalid subjects', () => {
  const ok = { ...base, status: 'readyForReview', questions: [] };
  assert.throws(() => parseSemesterProposal({ ...ok, subjects: [subject({ name: '   ' })] }), /resposta inválida/);
  assert.throws(() => parseSemesterProposal({ ...ok, subjects: [subject({ name: 'x'.repeat(121) })] }), /resposta inválida/);
  assert.throws(() => parseSemesterProposal({ ...ok, subjects: [subject({ code: 'C'.repeat(31) })] }), /resposta inválida/);
  assert.throws(() => parseSemesterProposal({ ...ok, subjects: [subject({ professorName: 'P'.repeat(121) })] }), /resposta inválida/);
  assert.throws(() => parseSemesterProposal({ ...ok, subjects: [subject({ existingSubjectId: '' })] }), /resposta inválida/);
  assert.throws(() => parseSemesterProposal({ ...ok, subjects: [subject({ code: 12 })] }), /resposta inválida/);
  assert.throws(() => parseSemesterProposal({ ...ok, subjects: 'Cálculo' }), /resposta inválida/);
});

test('caps the proposal at twenty subjects', () => {
  const ok = { ...base, status: 'readyForReview', questions: [] };
  const twenty = Array.from({ length: MAX_SEMESTER_SUBJECTS }, (_, index) => subject({ name: `Matéria ${index}` }));
  assert.equal(parseSemesterProposal({ ...ok, subjects: twenty }).subjects.length, 20);
  assert.throws(() => parseSemesterProposal({ ...ok, subjects: [...twenty, subject({ name: 'Extra' })] }), /resposta inválida/);
});

test('maps proposal statuses to screen errors', () => {
  assert.equal(semesterErrorForStatus(401, null).message, 'Sua sessão expirou. Entre novamente.');
  assert.equal(semesterErrorForStatus(422, { detail: 'Texto muito curto.' }).message, 'Texto muito curto.');
  assert.equal(semesterErrorForStatus(422, {}).message, 'Confira o texto e tente novamente.');
  assert.match(semesterErrorForStatus(429, null).message, /Muitas tentativas/);
  assert.ok(semesterErrorForStatus(503, null) instanceof AssistantUnavailableError);
  assert.ok(semesterErrorForStatus(500, null) instanceof AssistantUnavailableError);
  assert.equal(semesterErrorForStatus(400, null).message, 'Não foi possível interpretar as matérias. Tente novamente.');
});

test('joins subject names in Brazilian Portuguese', () => {
  assert.equal(joinSubjectNames([]), '');
  assert.equal(joinSubjectNames(['Cálculo']), 'Cálculo');
  assert.equal(joinSubjectNames(['Cálculo', 'Física']), 'Cálculo e Física');
  assert.equal(joinSubjectNames(['Cálculo', 'Física', 'Química']), 'Cálculo, Física e Química');
});

test('matches names regardless of case and accents', () => {
  assert.equal(normalizeMatchKey('  Ana   Gómez '), normalizeMatchKey('ana gomez'));
  assert.equal(normalizeMatchKey('Cálculo'), 'calculo');
});
