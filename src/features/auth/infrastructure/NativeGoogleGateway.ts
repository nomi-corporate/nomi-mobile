import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { AuthFailure } from '../domain/auth.ts';
import type { AuthGateway, AuthTokens } from '../domain/auth.ts';
import type { AuthConfig } from '../config.ts';
import { NomiIdentityClient } from './NomiIdentityClient.ts';

export class NativeGoogleGateway implements AuthGateway {
  private readonly client: NomiIdentityClient;
  constructor(config: AuthConfig) {
    GoogleSignin.configure({ webClientId: config.webClientId });
    this.client = new NomiIdentityClient(config);
  }

  async signIn(): Promise<AuthTokens | null> {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (!isSuccessResponse(result)) return null;
      const idToken = result.data.idToken;
      if (!idToken) throw new AuthFailure('invalidResponse');
      return await this.client.signIn(idToken);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (isErrorWithCode(error) && error.code === '10') throw new AuthFailure('configuration');
      if (error instanceof AuthFailure) throw error;
      throw new AuthFailure('network');
    }
  }

  refresh = (token: string) => this.client.refresh(token);
  signInWithEmail = (email: string, password: string, register: boolean) =>
    this.client.signInWithEmail(email, password, register);
  revoke = (token: string) => this.client.revoke(token);
  async endProviderSession(): Promise<boolean> {
    try { await GoogleSignin.signOut(); return true; }
    catch { return false; }
  }
}
