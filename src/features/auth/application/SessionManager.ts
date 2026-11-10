import { AuthFailure } from '../domain/auth.ts';
import type { AuthGateway, AuthState, AuthTokens, RefreshTokenStore } from '../domain/auth.ts';

const messages = {
  network: 'Não foi possível conectar. Confira sua internet e tente novamente.',
  configuration: 'O login está indisponível neste ambiente. Confira a configuração do aplicativo.',
  invalidResponse: 'Não foi possível concluir o login com segurança. Tente novamente.',
  expired: 'Sua sessão expirou. Entre novamente.',
};

/** Owns session lifecycle. UI never receives tokens; provider and storage are replaceable ports. */
export class SessionManager {
  private state: AuthState = { status: 'restoring' };
  private tokens: AuthTokens | null = null;
  private listeners = new Set<() => void>();
  private flight: Promise<void> | null = null;
  private generation = 0;
  private readonly gateway: AuthGateway;
  private readonly store: RefreshTokenStore;
  private readonly now: () => number;

  constructor(
    gateway: AuthGateway,
    store: RefreshTokenStore,
    now: () => number = Date.now,
  ) { this.gateway = gateway; this.store = store; this.now = now; }

  getSnapshot = (): AuthState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private update(state: AuthState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }

  private run(action: () => Promise<void>): Promise<void> {
    if (this.flight) return this.flight;
    const pending = action().finally(() => {
      if (this.flight === pending) this.flight = null;
    });
    this.flight = pending;
    return pending;
  }

  private async accept(tokens: AuthTokens, generation: number, fallback?: string) {
    if (generation !== this.generation) return;
    const refreshToken = tokens.refreshToken || fallback;
    if (!refreshToken || !tokens.accessToken || !Number.isFinite(tokens.expiresAt) || tokens.expiresAt <= this.now()) {
      throw new AuthFailure('invalidResponse');
    }
    // Persist rotated refresh tokens before exposing the new access token.
    await this.store.write(refreshToken);
    if (generation !== this.generation) return;
    this.tokens = { ...tokens, refreshToken };
    this.update({ status: 'signedIn', expiresAt: tokens.expiresAt });
  }

  restore = (): Promise<void> => this.run(async () => {
    const generation = this.generation;
    this.update({ status: 'restoring' });
    this.tokens = null;
    try {
      const token = await this.store.read();
      if (generation !== this.generation) return;
      if (!token) { this.update({ status: 'signedOut' }); return; }
      await this.accept(await this.gateway.refresh(token), generation, token);
    } catch (error) {
      await this.handleFailure(error, generation);
    }
  });

  signIn = (): Promise<void> => this.run(async () => {
    if (this.state.status !== 'signedOut') return;
    const generation = this.generation;
    this.update({ status: 'signingIn' });
    try {
      const tokens = await this.gateway.signIn();
      if (generation !== this.generation) return;
      if (!tokens) {
        this.update({ status: 'signedOut', message: 'Entrada cancelada. Você pode tentar novamente.' });
        return;
      }
      await this.accept(tokens, generation);
    } catch (error) {
      if (generation !== this.generation) return;
      // A failed secure write may have partially completed. Never claim it is safely stored.
      try { await this.store.clear(); } catch {
        this.update({ status: 'unavailable', recovery: 'signOut', message: 'Não foi possível limpar a sessão no aparelho. Tente sair novamente.' });
        return;
      }
      this.tokens = null;
      this.update({ status: 'signedOut', message: error instanceof AuthFailure ? messages[error.kind] : 'Não foi possível salvar sua sessão com segurança. Tente novamente.' });
    }
  });

  refresh = (): Promise<void> => this.run(async () => {
    if (!this.tokens?.refreshToken || this.state.status === 'signingOut') return;
    const generation = this.generation;
    const token = this.tokens.refreshToken;
    this.update({ status: 'refreshing' });
    try { await this.accept(await this.gateway.refresh(token), generation, token); }
    catch (error) { await this.handleFailure(error, generation); }
  });

  private async handleFailure(error: unknown, generation: number) {
    if (generation !== this.generation) return;
    this.tokens = null;
    if (error instanceof AuthFailure && error.kind === 'expired') {
      try {
        await this.store.clear();
        if (generation === this.generation) this.update({ status: 'signedOut', message: messages.expired });
      } catch {
        if (generation === this.generation) this.update({ status: 'unavailable', recovery: 'signOut', message: 'Não foi possível limpar a sessão expirada. Tente sair novamente.' });
      }
      return;
    }
    // Network/storage failures do not silently destroy a renewable session.
    this.update({ status: 'unavailable', recovery: 'restore', message: error instanceof AuthFailure ? messages[error.kind] : 'Não foi possível acessar sua sessão com segurança. Tente novamente.' });
  }

  getAccessToken = async (): Promise<string | null> => {
    if (this.state.status === 'signingOut') return null;
    if (this.flight) await this.flight;
    if (!this.tokens) return null;
    if (this.tokens.expiresAt <= this.now() + 60_000) await this.refresh();
    return this.state.status === 'signedIn' && this.tokens && this.tokens.expiresAt > this.now()
      ? this.tokens.accessToken : null;
  };

  signOut = (): Promise<void> => {
    if (this.state.status === 'signingOut' && this.flight) return this.flight;
    const previous = this.flight;
    ++this.generation; // Any late sign-in/refresh response can no longer establish a session.
    const currentToken = this.tokens?.refreshToken;
    this.tokens = null;
    this.update({ status: 'signingOut' });
    const pending = (async () => {
      await previous;
      let token = currentToken;
      try { token = (await this.store.read()) ?? currentToken; } catch { /* still attempt deletion */ }
      try { await this.store.clear(); }
      catch {
        this.update({ status: 'unavailable', recovery: 'signOut', message: 'Não foi possível apagar a sessão do aparelho. Tente sair novamente.' });
        return;
      }
      let remoteComplete = true;
      if (token) {
        try { await this.gateway.revoke(token); } catch { remoteComplete = false; }
      }
      try { remoteComplete = (await this.gateway.endBrowserSession()) && remoteComplete; }
      catch { remoteComplete = false; }
      this.update({ status: 'signedOut', message: remoteComplete ? 'Você saiu da sua conta.' : 'Sessão removida deste aparelho. Não foi possível confirmar a saída no provedor; uma sessão pode permanecer no navegador.' });
    })().finally(() => { if (this.flight === pending) this.flight = null; });
    this.flight = pending;
    return pending;
  };
}
