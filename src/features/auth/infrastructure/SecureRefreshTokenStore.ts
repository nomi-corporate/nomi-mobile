import * as SecureStore from 'expo-secure-store';
import type { RefreshTokenStore } from '../domain/auth.ts';

export class SecureRefreshTokenStore implements RefreshTokenStore {
  constructor(private readonly key: string) {}
  read = () => SecureStore.getItemAsync(this.key);
  write = (token: string) => SecureStore.setItemAsync(this.key, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  clear = () => SecureStore.deleteItemAsync(this.key);
}
