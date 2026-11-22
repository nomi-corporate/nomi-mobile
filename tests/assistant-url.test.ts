import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAssistantApiUrl } from '../src/features/voice/urlPolicy.ts';

test('assistant URL accepts an origin or a single reverse-proxy prefix', () => {
  assert.equal(normalizeAssistantApiUrl('https://nomi.example.test', false), 'https://nomi.example.test');
  assert.equal(normalizeAssistantApiUrl('https://nomi.example.test/assistant', false), 'https://nomi.example.test/assistant');
  assert.equal(normalizeAssistantApiUrl('https://nomi.example.test/assistant/', false), 'https://nomi.example.test/assistant');
  assert.equal(normalizeAssistantApiUrl('http://10.0.2.2:5102', true), 'http://10.0.2.2:5102');
});

test('assistant URL rejects insecure or ambiguous addresses', () => {
  for (const value of [undefined, '', 'not a url', 'http://10.0.2.2:5102', 'http://nomi.example.test',
    'https://nomi.example.test/a/b', 'https://nomi.example.test/assistant?x=1', 'https://user:pw@nomi.example.test'])
    assert.throws(() => normalizeAssistantApiUrl(value, false));
  assert.throws(() => normalizeAssistantApiUrl('http://nomi.example.test', true));
});
