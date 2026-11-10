import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { SessionManager } from './application/SessionManager';
import { loadAuthConfig } from './config';
import { ExpoCognitoGateway } from './infrastructure/ExpoCognitoGateway';
import { SecureRefreshTokenStore } from './infrastructure/SecureRefreshTokenStore';
import type { AuthState } from './domain/auth';

type Composition = { manager: SessionManager; error?: never } | { manager?: never; error: string };
function createAuth(): Composition {
  if (Platform.OS === 'web') return { error: 'O login está disponível no aplicativo Android. Esta prévia web ainda não oferece autenticação.' };
  try {
    const config = loadAuthConfig();
    return { manager: new SessionManager(new ExpoCognitoGateway(config),
      new SecureRefreshTokenStore(`nomi.refresh.v1.${config.userPoolId}.${config.clientId}`)) };
  } catch { return { error: 'O login ainda não foi configurado nesta versão do aplicativo.' }; }
}
type AuthContextValue = {
  state: AuthState;
  configurationError?: string;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
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
    signOut: () => manager?.signOut() ?? Promise.resolve(),
    retry: () => (state.recovery === 'signOut' ? manager?.signOut() : manager?.restore()) ?? Promise.resolve(),
    getAccessToken: () => manager?.getAccessToken() ?? Promise.resolve(null),
  }}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is required');
  return value;
}
