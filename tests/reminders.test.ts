import assert from 'node:assert/strict';
import test from 'node:test';
import type { AgendaItem } from '../src/features/academic/infrastructure/AcademicClient.ts';
import { DEFAULT_PREFERENCES, notificationId, reminderContent, reminderTrigger, type ReminderPreferences } from '../src/features/reminders/schedule.ts';

const now = new Date('2026-11-22T12:00:00.000Z');

function item(overrides: Partial<AgendaItem> = {}, due: Partial<AgendaItem['due']> = {}): AgendaItem {
  return {
    id: 'c1',
    itemType: 'commitment',
    title: 'Prova de cálculo',
    description: null,
    kind: 'exam',
    subjectId: 's1',
    subjectName: 'Cálculo I',
    status: 'pending',
    displayDate: '25/11/2026',
    displayTime: '11:00',
    due: { precision: 'dateTime', localDate: '2026-11-25', timeZone: 'America/Sao_Paulo', instant: '2026-11-25T14:00:00.000Z', localTime: '11:00', offset: '-03:00', ...due },
    version: 1,
    ...overrides,
  };
}

const prefs = (overrides: Partial<ReminderPreferences> = {}): ReminderPreferences => ({ ...DEFAULT_PREFERENCES, ...overrides });

test('dateTime commitment uses the stored instant minus the lead time', () => {
  const trigger = reminderTrigger(item(), prefs({ leadMinutes: 30 }), now);
  assert.equal(trigger?.toISOString(), '2026-11-25T13:30:00.000Z');
});

test('dateTime commitment without instant resolves local time in its zone', () => {
  const trigger = reminderTrigger(item({}, { instant: undefined }), prefs({ leadMinutes: 60 }), now);
  assert.equal(trigger?.toISOString(), '2026-11-25T13:00:00.000Z');
});

test('dateTime commitment with a 1 day lead', () => {
  const trigger = reminderTrigger(item(), prefs({ leadMinutes: 1440 }), now);
  assert.equal(trigger?.toISOString(), '2026-11-24T14:00:00.000Z');
});

test('date-only commitment fires at 09:00 in the commitment time zone', () => {
  const dateOnly = item({ kind: 'assignment', displayTime: null }, { precision: 'date', localDate: '2026-11-25', instant: undefined, localTime: undefined });
  assert.equal(reminderTrigger(dateOnly, DEFAULT_PREFERENCES, now)?.toISOString(), '2026-11-25T12:00:00.000Z');
});

test('completed commitments have no reminder', () => {
  assert.equal(reminderTrigger(item({ status: 'completed' }), DEFAULT_PREFERENCES, now), null);
});

test('disabled preferences have no reminder', () => {
  assert.equal(reminderTrigger(item(), prefs({ enabled: false }), now), null);
});

test('triggers in the past or less than a minute away have no reminder', () => {
  assert.equal(reminderTrigger(item({}, { instant: '2026-11-22T11:00:00.000Z' }), DEFAULT_PREFERENCES, now), null);
  assert.equal(reminderTrigger(item({}, { instant: '2026-11-22T12:30:30.000Z' }), prefs({ leadMinutes: 30 }), now), null);
});

test('unresolvable dateTime commitments have no reminder', () => {
  assert.equal(reminderTrigger(item({}, { instant: undefined, localTime: undefined }), DEFAULT_PREFERENCES, now), null);
});

test('content uses kind labels, subject and display time', () => {
  assert.deepEqual(reminderContent(item()), {
    title: 'Lembrete: Prova de cálculo',
    body: 'Prova · Cálculo I · 25/11/2026 às 11:00',
  });
});

test('content labels assignments and generic reminders without subject or time', () => {
  assert.deepEqual(reminderContent(item({ kind: 'assignment', subjectName: null, displayTime: null, title: 'Relatório' })), {
    title: 'Lembrete: Relatório',
    body: 'Trabalho · 25/11/2026',
  });
  assert.equal(reminderContent(item({ kind: 'reminder', subjectName: null, displayTime: null })).body, 'Lembrete · 25/11/2026');
});

test('notification identifier is derived from the commitment id', () => {
  assert.equal(notificationId('abc-123'), 'commitment-abc-123');
});
