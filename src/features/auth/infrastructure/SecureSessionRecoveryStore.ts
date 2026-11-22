import * as SecureStore from 'expo-secure-store';
import type { SessionRecoveryStore } from '../domain/auth';

const RECOVERY_KEY = 'nomi.auth.recovery.v1';

/** Persists only the need to sign in again; it never contains credentials or account data. */
export class SecureSessionRecoveryStore implements SessionRecoveryStore {
  async readReason(): Promise<'expired' | 'selected' | null> {
    const value = await SecureStore.getItemAsync(RECOVERY_KEY);
    return value === 'expired' || value === 'selected' ? value : null;
  }

  async markRequired(reason: 'expired' | 'selected'): Promise<void> {
    await SecureStore.setItemAsync(RECOVERY_KEY, reason);
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(RECOVERY_KEY);
  }
}
