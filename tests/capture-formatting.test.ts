import assert from 'node:assert/strict';
import test from 'node:test';
import { commitmentDetail, eventDateLine, eyebrowFor, longDate, reminderLabel } from '../src/features/capture/formatting.ts';

const zone = 'America/Sao_Paulo';
// 2026-11-22 12:00 in São Paulo (UTC-3)
const now = new Date('2026-11-22T15:00:00.000Z');

test('eyebrowFor builds the uppercase card eyebrow with and without time', () => {
  assert.equal(eyebrowFor('2026-11-06', '10:00'), 'SEX 06 NOV · 10:00');
  assert.equal(eyebrowFor('2026-11-06', null), 'SEX 06 NOV');
  assert.equal(eyebrowFor('2026-11-06', '10:00:00'), 'SEX 06 NOV · 10:00');
});

test('longDate writes the weekday and month in pt-BR', () => {
  assert.equal(longDate('2026-11-06'), 'sexta, 6 de novembro');
  assert.equal(longDate('2026-11-22'), 'domingo, 22 de novembro');
});

test('eventDateLine uses the capitalised saved-item format', () => {
  assert.equal(eventDateLine('2026-11-06', '10:00'), 'Sex, 6 de novembro · 10:00');
  assert.equal(eventDateLine('2026-11-06', null), 'Sex, 6 de novembro');
});

test('commitmentDetail joins subject and professor or falls back', () => {
  assert.equal(commitmentDetail(null, null), 'Sem matéria');
  assert.equal(commitmentDetail('Cálculo I', null), 'Cálculo I');
  assert.equal(commitmentDetail('Cálculo I', 'Profa. Ana'), 'Cálculo I · Profa. Ana');
});

test('reminderLabel is "Sem lembrete" without a trigger', () => {
  assert.equal(reminderLabel(null, now, zone), 'Sem lembrete');
});

test('reminderLabel says Hoje for a trigger on the same local day', () => {
  // 2026-11-22 18:00 in São Paulo
  assert.equal(reminderLabel(new Date('2026-11-22T21:00:00.000Z'), now, zone), 'Hoje, às 18:00');
});

test('reminderLabel says Amanhã for a trigger on the next local day', () => {
  // 2026-11-23 09:00 in São Paulo
  assert.equal(reminderLabel(new Date('2026-11-23T12:00:00.000Z'), now, zone), 'Amanhã, às 09:00');
});

test('reminderLabel uses the short date for later triggers', () => {
  // 2026-11-06 09:00 in São Paulo
  assert.equal(reminderLabel(new Date('2026-11-06T12:00:00.000Z'), now, zone), 'Sex, 6 de nov · 09:00');
});

test('reminderLabel resolves the civil day in the profile time zone, not UTC', () => {
  // 2026-11-23 01:30 UTC is still 2026-11-22 22:30 in São Paulo, so it is "Hoje" there.
  assert.equal(reminderLabel(new Date('2026-11-23T01:30:00.000Z'), now, zone), 'Hoje, às 22:30');
});
