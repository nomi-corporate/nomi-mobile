import assert from 'node:assert/strict';
import test from 'node:test';
import { NomiIdentityClient } from '../src/features/auth/infrastructure/NomiIdentityClient.ts';
import { AuthFailure } from '../src/features/auth/domain/auth.ts';

const config = {
  apiUrl: 'https://identity.example.test',
  webClientId: '123-example.apps.googleusercontent.com',
};

test('Google ID token is sent to Nomi and response is parsed', async () => {
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, `${config.apiUrl}/v1/auth/google`);
    assert.equal(options?.method, 'POST');
    assert.deepEqual(JSON.parse(String(options?.body)), { idToken: 'google-id-token' });
    return Response.json({ accessToken: 'access', refreshToken: 'refresh', accessExpiresAt: new Date(Date.now() + 900_000).toISOString() });
  };
  const tokens = await new NomiIdentityClient(config, request).signIn('google-id-token');
  assert.equal(tokens.accessToken, 'access');
  assert.equal(tokens.refreshToken, 'refresh');
});

test('refresh denial expires local session without exposing response body', async () => {
  const request: typeof fetch = async () => new Response('private error', { status: 401 });
  await assert.rejects(new NomiIdentityClient(config, request).refresh('old'),
    (error: unknown) => error instanceof AuthFailure && error.kind === 'expired' && !error.message.includes('private'));
});

test('invalid token response cannot establish a session', async () => {
  const request: typeof fetch = async () => Response.json({ accessToken: 'access', accessExpiresAt: new Date(Date.now() + 900_000).toISOString() });
  await assert.rejects(new NomiIdentityClient(config, request).signIn('google-id-token'),
    (error: unknown) => error instanceof AuthFailure && error.kind === 'invalidResponse');
});

test('account and recovery actions use the Identity flow contract', async () => {
  const calls: Array<{ path: string; body: unknown }> = [];
  const request: typeof fetch = async (url, options) => {
    calls.push({ path: String(url), body: JSON.parse(String(options?.body)) });
    if (String(url).endsWith('/password/recovery/verify')) {
      return Response.json({ recoveryToken: 'recovery-token', expiresAt: new Date(Date.now() + 900_000).toISOString() });
    }
    return new Response(null, { status: 204 });
  };
  const client = new NomiIdentityClient(config, request);
  await client.registerAccount('Willian', 'willian@example.com', 'Password1234');
  await client.confirmEmail('willian@example.com', '123456');
  await client.resendConfirmation('willian@example.com');
  await client.requestPasswordRecovery('willian@example.com');
  await client.resetPassword('willian@example.com', '654321', 'NewPassword1234');
  assert.deepEqual(calls, [
    { path: `${config.apiUrl}/v1/auth/register/start`, body: { name: 'Willian', email: 'willian@example.com', password: 'Password1234' } },
    { path: `${config.apiUrl}/v1/auth/register/confirm`, body: { email: 'willian@example.com', code: '123456' } },
    { path: `${config.apiUrl}/v1/auth/register/resend`, body: { email: 'willian@example.com' } },
    { path: `${config.apiUrl}/v1/auth/password/recovery/start`, body: { email: 'willian@example.com' } },
    { path: `${config.apiUrl}/v1/auth/password/recovery/verify`, body: { email: 'willian@example.com', code: '654321' } },
    { path: `${config.apiUrl}/v1/auth/password/reset`, body: { recoveryToken: 'recovery-token', newPassword: 'NewPassword1234' } },
  ]);
});
