import { AuthFailure } from '../domain/auth.ts';
import type { AuthTokens } from '../domain/auth.ts';
import type { AuthConfig } from '../config.ts';

export class CognitoTokenClient {
  private readonly config: AuthConfig;
  private readonly request: typeof fetch;
  private readonly now: () => number;
  constructor(
    config: AuthConfig,
    request: typeof fetch = fetch,
    now: () => number = Date.now,
  ) { this.config = config; this.request = request; this.now = now; }

  private async post(path: string, fields: Record<string, string>, tokens: boolean): Promise<unknown> {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 15_000);
    try {
      const response = await this.request(`${this.config.domain}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: this.config.clientId, ...fields }).toString(),
        signal: abort.signal, redirect: 'error',
      });
      if (!response.ok) {
        let body: { error?: unknown } = {};
        try { body = await response.json(); } catch { /* no provider text in UI or logs */ }
        if (body?.error === 'invalid_grant') throw new AuthFailure('expired');
        if (response.status >= 500 || response.status === 429) throw new AuthFailure('network');
        throw new AuthFailure('configuration');
      }
      if (!tokens) return null;
      return await response.json();
    } catch (error) {
      if (error instanceof AuthFailure) throw error;
      throw new AuthFailure('network');
    } finally { clearTimeout(timer); }
  }

  private parse(value: unknown): AuthTokens {
    if (!value || typeof value !== 'object') throw new AuthFailure('invalidResponse');
    const data = value as Record<string, unknown>;
    if (typeof data.access_token !== 'string' || !data.access_token
        || typeof data.token_type !== 'string' || data.token_type.toLowerCase() !== 'bearer'
        || typeof data.expires_in !== 'number' || !Number.isFinite(data.expires_in)
        || data.expires_in <= 0 || data.expires_in > 86_400
        || (data.refresh_token !== undefined && (typeof data.refresh_token !== 'string' || !data.refresh_token))) {
      throw new AuthFailure('invalidResponse');
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token as string | undefined,
      expiresAt: this.now() + data.expires_in * 1000,
    };
  }

  exchange = async (code: string, verifier: string): Promise<AuthTokens> => this.parse(await this.post('/oauth2/token', {
    grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: this.config.redirectUri,
  }, true));

  refresh = async (refreshToken: string): Promise<AuthTokens> => this.parse(await this.post('/oauth2/token', {
    grant_type: 'refresh_token', refresh_token: refreshToken,
  }, true));

  revoke = async (refreshToken: string): Promise<void> => {
    await this.post('/oauth2/revoke', { token: refreshToken }, false);
  };
}
