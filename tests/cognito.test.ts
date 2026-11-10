import test from 'node:test';
import assert from 'node:assert/strict';
import { CognitoTokenClient } from '../src/features/auth/infrastructure/CognitoTokenClient.ts';
import { parseAuthConfig } from '../src/features/auth/config.ts';
import { AuthFailure } from '../src/features/auth/domain/auth.ts';

const config = parseAuthConfig({ domain: 'https://nomi-test.auth.us-east-2.amazoncognito.com', clientId: 'testclient012345', userPoolId: 'us-east-2_TestPool' });
const success = { access_token: 'access', refresh_token: 'refresh', token_type: 'Bearer', expires_in: 300 };
test('code exchange binds client, verifier and exact registered redirect; no client secret', async () => {
  const request: typeof fetch = async (url, init) => {
    assert.equal(url, `${config.domain}/oauth2/token`); assert.equal(init?.method, 'POST');
    assert.equal(init?.redirect, 'error'); assert.ok(init?.signal);
    const fields = new URLSearchParams(init?.body as string);
    assert.equal(fields.get('grant_type'), 'authorization_code'); assert.equal(fields.get('code_verifier'), 'verifier');
    assert.equal(fields.get('code'), 'code'); assert.equal(fields.get('redirect_uri'), 'nomi://auth/callback');
    assert.equal(fields.get('client_id'), config.clientId); assert.equal(fields.has('client_secret'), false);
    return Response.json(success);
  };
  assert.deepEqual(await new CognitoTokenClient(config, request, () => 1000).exchange('code', 'verifier'), {
    accessToken: 'access', refreshToken: 'refresh', expiresAt: 301000,
  });
});
test('refresh and revocation send the public client ID and correct token fields', async () => {
  const paths: string[] = [];
  const request: typeof fetch = async (url, init) => {
    paths.push(String(url)); const fields = new URLSearchParams(init?.body as string);
    assert.equal(fields.get('client_id'), config.clientId);
    if (String(url).endsWith('/revoke')) { assert.equal(fields.get('token'), 'refresh'); return new Response(null, { status: 200 }); }
    assert.equal(fields.get('grant_type'), 'refresh_token'); assert.equal(fields.get('refresh_token'), 'refresh');
    return Response.json({ ...success, refresh_token: undefined });
  };
  const client = new CognitoTokenClient(config, request);
  assert.equal((await client.refresh('refresh')).refreshToken, undefined); await client.revoke('refresh');
  assert.equal(paths.length, 2);
});
test('only invalid_grant is a definitive session expiration; provider messages are never exposed', async () => {
  for (const [status, error, kind] of [[400, 'invalid_grant', 'expired'], [400, 'invalid_client', 'configuration'], [429, 'limit', 'network'], [503, 'down', 'network']] as const) {
    const request: typeof fetch = async () => Response.json({ error, error_description: 'private-provider-content' }, { status });
    await assert.rejects(new CognitoTokenClient(config, request).refresh('secret'), (e: unknown) => e instanceof AuthFailure && e.kind === kind && !e.message.includes('private'));
  }
});
test('network failures do not leak exceptions containing tokens', async () => {
  const request: typeof fetch = async () => { throw new Error('private-refresh-token'); };
  await assert.rejects(new CognitoTokenClient(config, request).refresh('secret'), (e: unknown) => e instanceof AuthFailure && e.kind === 'network' && !e.message.includes('private'));
});
test('malformed token responses cannot establish an authenticated session', async () => {
  for (const data of [null, {}, { ...success, token_type: 'MAC' }, { ...success, expires_in: -1 }, { ...success, access_token: '' }, { ...success, refresh_token: 12 }]) {
    const request: typeof fetch = async () => Response.json(data);
    await assert.rejects(new CognitoTokenClient(config, request).refresh('refresh'), (e: unknown) => e instanceof AuthFailure && e.kind === 'invalidResponse');
  }
});
test('missing or untrusted provider origins fail closed before any network request', () => {
  for (const domain of ['', 'http://nomi-test.auth.us-east-2.amazoncognito.com', 'https://attacker.example', `${config.domain}/path`, `${config.domain}?token=x`]) {
    assert.throws(() => parseAuthConfig({ ...config, domain }), AuthFailure);
  }
});
