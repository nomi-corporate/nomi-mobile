import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionManager } from '../src/features/auth/application/SessionManager.ts';
import { AuthFailure } from '../src/features/auth/domain/auth.ts';
import type { AuthGateway, AuthTokens, RefreshTokenStore } from '../src/features/auth/domain/auth.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function fixture(initial: string | null = null) {
  const vault = { token: initial, failWrite: false, failClear: false };
  const store: RefreshTokenStore = {
    read: async () => vault.token,
    write: async (value) => { if (vault.failWrite) throw new Error('storage unavailable'); vault.token = value; },
    clear: async () => { if (vault.failClear) throw new Error('storage unavailable'); vault.token = null; },
  };
  const clock = { now: 1_000_000 };
  const tokens = (): AuthTokens => ({ accessToken: 'test-access', refreshToken: 'test-refresh', expiresAt: clock.now + 300_000 });
  const calls = { refresh: 0, login: 0, revoked: [] as string[], logout: 0 };
  const gateway: AuthGateway = {
    signIn: async () => { calls.login++; return tokens(); },
    refresh: async () => { calls.refresh++; return tokens(); },
    revoke: async (token) => { calls.revoked.push(token); },
    endBrowserSession: async () => { calls.logout++; return true; },
  };
  const manager = new SessionManager(gateway, store, () => clock.now);
  return { vault, store, clock, tokens, calls, gateway, manager };
}

test('fresh installation is signed out; successful login persists only the refresh token', async () => {
  const f = fixture(); await f.manager.restore();
  assert.equal(f.manager.getSnapshot().status, 'signedOut');
  await f.manager.signIn();
  assert.equal(f.vault.token, 'test-refresh');
  assert.equal(await f.manager.getAccessToken(), 'test-access');
  assert.ok(!JSON.stringify(f.manager.getSnapshot()).includes('test-access'));
});
test('browser cancellation is not a successful login', async () => {
  const f = fixture(); f.gateway.signIn = async () => null;
  await f.manager.restore(); await f.manager.signIn();
  assert.equal(f.manager.getSnapshot().status, 'signedOut');
  assert.equal(f.vault.token, null);
});
test('reopening always exchanges the stored refresh token before exposing the private area', async () => {
  const f = fixture('stored'); const pending = deferred<AuthTokens>();
  f.gateway.refresh = async (token) => { assert.equal(token, 'stored'); return pending.promise; };
  const restoring = f.manager.restore();
  assert.equal(f.manager.getSnapshot().status, 'restoring');
  pending.resolve(f.tokens()); await restoring;
  assert.equal(f.manager.getSnapshot().status, 'signedIn');
  assert.equal(f.vault.token, 'test-refresh');
});
test('refresh responses without rotation retain the current refresh token', async () => {
  const f = fixture('stored'); f.gateway.refresh = async () => ({ ...f.tokens(), refreshToken: undefined });
  await f.manager.restore(); assert.equal(f.vault.token, 'stored');
});
test('offline restore keeps renewal credentials and exposes retry, never private content', async () => {
  const f = fixture('stored'); f.gateway.refresh = async () => { throw new AuthFailure('network'); };
  await f.manager.restore();
  assert.equal(f.manager.getSnapshot().status, 'unavailable');
  assert.equal(f.vault.token, 'stored'); assert.equal(await f.manager.getAccessToken(), null);
  f.gateway.refresh = async () => f.tokens(); await f.manager.restore();
  assert.equal(f.manager.getSnapshot().status, 'signedIn');
});
test('definitive expiration clears the vault and requires sign-in', async () => {
  const f = fixture('expired'); f.gateway.refresh = async () => { throw new AuthFailure('expired'); };
  await f.manager.restore(); assert.equal(f.vault.token, null);
  assert.equal(f.manager.getSnapshot().status, 'signedOut');
});
test('storage failures do not claim a successfully persisted session', async () => {
  const f = fixture(); f.vault.failWrite = true;
  await f.manager.restore(); await f.manager.signIn();
  assert.equal(f.manager.getSnapshot().status, 'signedOut');
  assert.equal(await f.manager.getAccessToken(), null);
});
test('concurrent token consumers share one refresh and receive the rotated access token', async () => {
  const f = fixture('stored'); await f.manager.restore(); f.clock.now += 260_000;
  const response = deferred<AuthTokens>();
  f.gateway.refresh = async () => { f.calls.refresh++; return response.promise; };
  const reads = [f.manager.getAccessToken(), f.manager.getAccessToken(), f.manager.getAccessToken()];
  response.resolve({ ...f.tokens(), accessToken: 'new-access', refreshToken: 'rotated' });
  assert.deepEqual(await Promise.all(reads), ['new-access', 'new-access', 'new-access']);
  assert.equal(f.calls.refresh, 2); assert.equal(f.vault.token, 'rotated');
});
test('a failed refresh never returns an old token', async () => {
  const f = fixture('stored'); await f.manager.restore(); f.clock.now += 260_000;
  f.gateway.refresh = async () => { throw new AuthFailure('network'); };
  assert.equal(await f.manager.getAccessToken(), null);
  assert.equal(f.manager.getSnapshot().status, 'unavailable'); assert.equal(f.vault.token, 'test-refresh');
});
test('logout clears local credentials even when remote revocation and browser logout fail', async () => {
  const f = fixture('stored'); await f.manager.restore();
  f.gateway.revoke = async () => { throw new AuthFailure('network'); };
  f.gateway.endBrowserSession = async () => false;
  await f.manager.signOut();
  assert.equal(f.vault.token, null); assert.equal(await f.manager.getAccessToken(), null);
  assert.equal(f.manager.getSnapshot().status, 'signedOut');
  assert.match(f.manager.getSnapshot().message!, /não foi possível/i);
});
test('logout during login prevents late responses from establishing or persisting a session', async () => {
  const f = fixture(); await f.manager.restore(); const response = deferred<AuthTokens>();
  f.gateway.signIn = async () => response.promise;
  const login = f.manager.signIn(); const logout = f.manager.signOut();
  response.resolve(f.tokens()); await Promise.all([login, logout]);
  assert.equal(f.manager.getSnapshot().status, 'signedOut'); assert.equal(f.vault.token, null);
});
test('logout during a secure write waits then removes and revokes the latest rotated token', async () => {
  const f = fixture('stored'); await f.manager.restore();
  const written = deferred<void>(); const started = deferred<void>();
  f.store.write = async (token) => { started.resolve(); await written.promise; f.vault.token = token; };
  f.gateway.refresh = async () => ({ ...f.tokens(), refreshToken: 'rotated' });
  const refreshing = f.manager.refresh(); await started.promise;
  const logout = f.manager.signOut(); written.resolve(); await Promise.all([refreshing, logout]);
  assert.equal(f.vault.token, null); assert.deepEqual(f.calls.revoked, ['rotated']);
  assert.equal(f.manager.getSnapshot().status, 'signedOut');
});
test('failed local deletion is actionable and is not reported as a completed logout', async () => {
  const f = fixture('stored'); await f.manager.restore(); f.vault.failClear = true;
  await f.manager.signOut(); assert.equal(f.manager.getSnapshot().status, 'unavailable');
  assert.equal(f.manager.getSnapshot().recovery, 'signOut');
  assert.equal(await f.manager.getAccessToken(), null);
  f.vault.failClear = false; await f.manager.signOut(); assert.equal(f.vault.token, null);
});
test('duplicate login requests only open one browser session', async () => {
  const f = fixture(); await f.manager.restore();
  await Promise.all([f.manager.signIn(), f.manager.signIn()]); assert.equal(f.calls.login, 1);
});
