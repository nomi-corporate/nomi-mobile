import { AuthRequest, CodeChallengeMethod, ResponseType, makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { AuthGateway, AuthTokens } from '../domain/auth.ts';
import type { AuthConfig } from '../config.ts';
import { CognitoTokenClient } from './CognitoTokenClient.ts';
import { authorizationResult } from './authorizationResult.ts';

export class ExpoCognitoGateway implements AuthGateway {
  private readonly client: CognitoTokenClient;
  constructor(private readonly config: AuthConfig) { this.client = new CognitoTokenClient(config); }

  async signIn(): Promise<AuthTokens | null> {
    const redirectUri = makeRedirectUri({ native: this.config.redirectUri });
    const request = new AuthRequest({
      clientId: this.config.clientId, redirectUri, responseType: ResponseType.Code,
      scopes: ['openid', 'email'], usePKCE: true, codeChallengeMethod: CodeChallengeMethod.S256,
    });
    // A new request owns a fresh state and verifier. AuthSession checks returned state.
    const response = await request.promptAsync({ authorizationEndpoint: `${this.config.domain}/oauth2/authorize` });
    const authorized = authorizationResult(response, request, redirectUri);
    return authorized ? this.client.exchange(authorized.code, authorized.verifier) : null;
  }

  refresh = (token: string) => this.client.refresh(token);
  revoke = (token: string) => this.client.revoke(token);

  async endBrowserSession(): Promise<boolean> {
    const query = new URLSearchParams({ client_id: this.config.clientId, logout_uri: this.config.logoutUri });
    const result = await WebBrowser.openAuthSessionAsync(`${this.config.domain}/logout?${query}`, this.config.logoutUri);
    return result.type === 'success' && result.url.split(/[?#]/)[0] === this.config.logoutUri;
  }
}
