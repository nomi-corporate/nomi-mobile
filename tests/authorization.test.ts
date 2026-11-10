import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizationResult } from '../src/features/auth/infrastructure/authorizationResult.ts';
import { AuthFailure } from '../src/features/auth/domain/auth.ts';

const redirect = 'nomi://auth/callback';
const request = { state: 'fresh-state', codeVerifier: 'in-memory-verifier' };
const result = { type: 'success', url: `${redirect}?code=one-time-code&state=fresh-state`, params: { code: 'one-time-code', state: 'fresh-state' } };
test('only the active PKCE request with its exact callback and matching state can exchange a code', () => {
  assert.deepEqual(authorizationResult(result, request, redirect), { code: 'one-time-code', verifier: 'in-memory-verifier' });
});
test('cancel and browser dismissal never produce a code exchange', () => {
  for (const type of ['cancel', 'dismiss']) assert.equal(authorizationResult({ type }, request, redirect), null);
});
test('forged, duplicated, unsolicited and stale callbacks are rejected', () => {
  for (const response of [
    { ...result, type: 'error' }, { ...result, type: 'locked' },
    { ...result, url: `nomi://attacker/callback?code=one-time-code&state=fresh-state` },
    { ...result, url: `${result.url}&code=other` }, { ...result, url: `${result.url}&state=other` },
    { ...result, url: `${result.url}&error=access_denied` }, { ...result, url: `${result.url}#access_token=ignored` },
    { ...result, params: { ...result.params, state: 'stale-state' } },
    { ...result, params: { ...result.params, code: 'different-code' } },
  ]) assert.throws(() => authorizationResult(response, request, redirect), AuthFailure);
  assert.throws(() => authorizationResult(result, { state: 'stale-state', codeVerifier: 'old' }, redirect), AuthFailure);
  assert.throws(() => authorizationResult(result, { state: request.state }, redirect), AuthFailure);
});
