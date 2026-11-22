import assert from 'node:assert/strict';
import test from 'node:test';
import { formatOffset, zonedToInstant } from '../src/features/agenda/zonedTime.ts';

test('resolves São Paulo civil time to instant and offset', () => {
  const value = zonedToInstant('2026-11-20', '14:00', 'America/Sao_Paulo');
  assert.ok(value);
  assert.equal(value.offset, '-03:00');
  assert.equal(value.instant.toISOString(), '2026-11-20T17:00:00.000Z');
});

test('handles daylight saving time zones on both sides of the change', () => {
  assert.equal(zonedToInstant('2026-01-15', '09:00', 'America/New_York')?.offset, '-05:00');
  assert.equal(zonedToInstant('2026-07-15', '09:00', 'America/New_York')?.offset, '-04:00');
  // 02:30 does not exist on 2026-03-08 in New York (clocks jump to 03:00).
  assert.equal(zonedToInstant('2026-03-08', '02:30', 'America/New_York'), null);
});

test('rejects invalid dates, times and zones', () => {
  assert.equal(zonedToInstant('2026-02-30', '10:00', 'America/Sao_Paulo'), null);
  assert.equal(zonedToInstant('2026-11-20', '25:00', 'America/Sao_Paulo'), null);
  assert.equal(zonedToInstant('2026-11-20', '10:00', 'Not/AZone'), null);
});

test('formats offsets', () => {
  assert.equal(formatOffset(-180), '-03:00');
  assert.equal(formatOffset(330), '+05:30');
  assert.equal(formatOffset(0), '+00:00');
});
