export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

export interface AuthGateway {
  signIn(): Promise<AuthTokens | null>;
  signInWithEmail(email: string, password: string, register: boolean): Promise<AuthTokens>;
  refresh(refreshToken: string): Promise<AuthTokens>;
  revoke(refreshToken: string): Promise<void>;
  endProviderSession(): Promise<boolean>;
}

export interface RefreshTokenStore {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  clear(): Promise<void>;
}

export interface SessionRecoveryStore {
  readReason(): Promise<'expired' | 'selected' | null>;
  markRequired(reason: 'expired' | 'selected'): Promise<void>;
  clear(): Promise<void>;
}

export class AuthFailure extends Error {
  readonly kind: 'expired' | 'network' | 'configuration' | 'invalidResponse';
  readonly status?: number;
  constructor(kind: AuthFailure['kind'], status?: number) {
    super(kind);
    this.kind = kind;
    this.status = status;
    this.name = 'AuthFailure';
  }
}

export type AuthState = {
  status: 'restoring' | 'signedOut' | 'signingIn' | 'signedIn' | 'refreshing' | 'signingOut' | 'unavailable';
  expiresAt?: number;
  message?: string;
  recovery?: 'restore' | 'signOut';
};
