import { AuthFailure } from '../domain/auth.ts';
import type { AuthTokens } from '../domain/auth.ts';
import type { AuthConfig } from '../config.ts';

export class NomiIdentityClient {
  private readonly config: AuthConfig;
  private readonly request: typeof fetch;
  private recoveryToken?: string;
  constructor(config: AuthConfig, request: typeof fetch = fetch) {
    this.config = config;
    this.request = request;
  }

  private async post(path: string, data: Record<string, string>): Promise<unknown> {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 15_000);
    try {
      const response = await this.request(`${this.config.apiUrl}/v1/auth/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data), signal: abort.signal, redirect: 'error',
      });
      if (!response.ok) {
        if (response.status === 401) throw new AuthFailure(path === 'refresh' ? 'expired' : 'invalidResponse');
        if (response.status === 429 || response.status >= 500) throw new AuthFailure('network', response.status);
        throw new AuthFailure('invalidResponse', response.status);
      }
      const body = await response.text();
      return body.trim() ? JSON.parse(body) : null;
    } catch (error) {
      if (error instanceof AuthFailure) throw error;
      throw new AuthFailure('network');
    } finally { clearTimeout(timer); }
  }

  private async postAction(path: string, data: Record<string, string>): Promise<void> {
    await this.post(path, data);
  }

  private parse(data: unknown): AuthTokens {
    if (!data || typeof data !== 'object') throw new AuthFailure('invalidResponse');
    const value = data as Record<string, unknown>;
    const expiresAt = Date.parse(String(value.accessExpiresAt));
    if (typeof value.accessToken !== 'string' || !value.accessToken
        || typeof value.refreshToken !== 'string' || !value.refreshToken
        || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new AuthFailure('invalidResponse');
    return { accessToken: value.accessToken, refreshToken: value.refreshToken, expiresAt };
  }

  signIn = async (idToken: string): Promise<AuthTokens> => this.parse(await this.post('google', { idToken }));
  signInWithEmail = async (email: string, password: string, register: boolean): Promise<AuthTokens> =>
    this.parse(await this.post(register ? 'register' : 'login', { email, password }));
  registerAccount = async (name: string, email: string, password: string): Promise<void> =>
    this.postAction('register/start', { name, email, password });
  confirmEmail = async (email: string, code: string): Promise<void> =>
    this.postAction('register/confirm', { email, code });
  resendConfirmation = async (email: string): Promise<void> =>
    this.postAction('register/resend', { email });
  requestPasswordRecovery = async (email: string): Promise<void> =>
    this.postAction('password/recovery/start', { email });
  resetPassword = async (email: string, code: string, password: string): Promise<void> => {
    const result = await this.post('password/recovery/verify', { email, code });
    if (!result || typeof result !== 'object' || typeof (result as Record<string, unknown>).recoveryToken !== 'string') {
      throw new AuthFailure('invalidResponse');
    }
    this.recoveryToken = (result as Record<string, string>).recoveryToken;
    try {
      await this.postAction('password/reset', { recoveryToken: this.recoveryToken, newPassword: password });
    } finally {
      this.recoveryToken = undefined;
    }
  };
  refresh = async (refreshToken: string): Promise<AuthTokens> => this.parse(await this.post('refresh', { refreshToken }));
  revoke = async (refreshToken: string): Promise<void> => { await this.post('logout', { refreshToken }); };
}
