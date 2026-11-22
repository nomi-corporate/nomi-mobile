import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { SessionManager } from './application/SessionManager';
import { loadAuthConfig } from './config';
import { NativeGoogleGateway } from './infrastructure/NativeGoogleGateway';
import { NomiIdentityClient } from './infrastructure/NomiIdentityClient';
import { SecureRefreshTokenStore } from './infrastructure/SecureRefreshTokenStore';
import { SecureSessionRecoveryStore } from './infrastructure/SecureSessionRecoveryStore';
import type { AuthState } from './domain/auth';

type Composition = { manager: SessionManager; client: NomiIdentityClient; error?: never } | { manager?: never; client?: never; error: string };
function createAuth(): Composition {
  if (Platform.OS === 'web') return { error: 'O login está disponível no aplicativo Android. Esta prévia web ainda não oferece autenticação.' };
  try {
    const config = loadAuthConfig();
    const client = new NomiIdentityClient(config);
    return { client, manager: new SessionManager(new NativeGoogleGateway(config),
      new SecureRefreshTokenStore('nomi.refresh.v2.google'), Date.now, new SecureSessionRecoveryStore()) };
  } catch { return { error: 'O login ainda não foi configurado nesta versão do aplicativo.' }; }
}
type AuthContextValue = {
  state: AuthState;
  configurationError?: string;
  signIn(): Promise<void>;
  signInWithEmail(email: string, password: string, register: boolean): Promise<void>;
  registerAccount(name: string, email: string, password: string): Promise<void>;
  confirmEmail(email: string, code: string): Promise<void>;
  resendConfirmation(email: string): Promise<void>;
  requestPasswordRecovery(email: string): Promise<void>;
  resetPassword(email: string, code: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  expireSession(): Promise<void>;
  rememberSignIn(): Promise<void>;
  clearSignInReminder(): Promise<void>;
  retry(): Promise<void>;
  getAccessToken(): Promise<string | null>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
const unavailable: AuthState = { status: 'signedOut' };
const noopSubscribe = () => () => {};
const unavailableSnapshot = () => unavailable;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [composition] = useState(createAuth);
  const manager = composition.manager;
  const getAccessToken = useCallback(() => manager?.getAccessToken() ?? Promise.resolve(null), [manager]);
  const expireSession = useCallback(() => manager?.expireSession() ?? Promise.resolve(), [manager]);
  const state = useSyncExternalStore(manager?.subscribe ?? noopSubscribe, manager?.getSnapshot ?? unavailableSnapshot, unavailableSnapshot);
  useEffect(() => { void manager?.restore(); }, [manager]);
  useEffect(() => {
    if (!manager) return;
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void manager.getAccessToken();
    });
    return () => subscription.remove();
  }, [manager]);
  useEffect(() => {
    if (!manager || state.status !== 'signedIn' || !state.expiresAt) return;
    const timer = setTimeout(() => { void manager.refresh(); }, Math.max(1000, state.expiresAt - Date.now() - 60_000));
    return () => clearTimeout(timer);
  }, [manager, state]);
  return <AuthContext.Provider value={{
    state, configurationError: composition.error,
    signIn: () => manager?.signIn() ?? Promise.resolve(),
    signInWithEmail: (email, password, register) => manager?.signInWithEmail(email, password, register) ?? Promise.resolve(),
    registerAccount: (name, email, password) => composition.client?.registerAccount(name, email, password) ?? Promise.reject(new Error('Auth is not configured')),
    confirmEmail: (email, code) => composition.client?.confirmEmail(email, code) ?? Promise.reject(new Error('Auth is not configured')),
    resendConfirmation: (email) => composition.client?.resendConfirmation(email) ?? Promise.reject(new Error('Auth is not configured')),
    requestPasswordRecovery: (email) => composition.client?.requestPasswordRecovery(email) ?? Promise.reject(new Error('Auth is not configured')),
    resetPassword: (email, code, password) => composition.client?.resetPassword(email, code, password) ?? Promise.reject(new Error('Auth is not configured')),
    signOut: () => manager?.signOut() ?? Promise.resolve(),
    expireSession,
    rememberSignIn: () => manager?.rememberSignIn() ?? Promise.resolve(),
    clearSignInReminder: () => manager?.clearSignInReminder() ?? Promise.resolve(),
    retry: () => (state.recovery === 'signOut' ? manager?.signOut() : manager?.restore()) ?? Promise.resolve(),
    getAccessToken,
  }}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is required');
  return value;
}
