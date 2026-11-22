import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIdentityApiUrl, parseAuthConfig } from '../src/features/auth/config.ts';

const validClientId = '123456789-local.apps.googleusercontent.com';

test('Identity allows HTTPS in every runtime', () => {
  assert.equal(normalizeIdentityApiUrl('https://identity.example.test/', false), 'https://identity.example.test');
  assert.equal(normalizeIdentityApiUrl('https://identity.example.test/', true), 'https://identity.example.test');
});

test('Identity allows HTTP only for emulator/loopback in development', () => {
  for (const host of ['localhost', '127.0.0.1', '10.0.2.2']) {
    assert.equal(normalizeIdentityApiUrl(`http://${host}:5104/`, true), `http://${host}:5104`);
    assert.throws(() => normalizeIdentityApiUrl(`http://${host}:5104/`, false));
  }
});

test('Identity rejects remote HTTP and non-origin URLs in development', () => {
  assert.throws(() => normalizeIdentityApiUrl('http://identity.example.test', true));
  assert.throws(() => normalizeIdentityApiUrl('https://identity.example.test/path', true));
  assert.throws(() => normalizeIdentityApiUrl('https://user:pass@identity.example.test', true));
});

test('auth config accepts local emulator endpoint only when development is explicit', () => {
  assert.deepEqual(parseAuthConfig({
    apiUrl: 'http://10.0.2.2:5104',
    webClientId: validClientId,
  }, true), {
    apiUrl: 'http://10.0.2.2:5104',
    webClientId: validClientId,
  });
  assert.throws(() => parseAuthConfig({
    apiUrl: 'http://10.0.2.2:5104',
    webClientId: validClientId,
  }, false));
});
