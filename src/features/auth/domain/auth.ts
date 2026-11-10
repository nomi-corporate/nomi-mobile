export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

export interface AuthGateway {
  signIn(): Promise<AuthTokens | null>;
  refresh(refreshToken: string): Promise<AuthTokens>;
  revoke(refreshToken: string): Promise<void>;
  endBrowserSession(): Promise<boolean>;
}

export interface RefreshTokenStore {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  clear(): Promise<void>;
}

export class AuthFailure extends Error {
  readonly kind: 'expired' | 'network' | 'configuration' | 'invalidResponse';
  constructor(kind: AuthFailure['kind']) {
    super(kind);
    this.kind = kind;
    this.name = 'AuthFailure';
  }
}

export type AuthState = {
  status: 'restoring' | 'signedOut' | 'signingIn' | 'signedIn' | 'refreshing' | 'signingOut' | 'unavailable';
  expiresAt?: number;
  message?: string;
  recovery?: 'restore' | 'signOut';
};
