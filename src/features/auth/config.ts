import { AuthFailure } from './domain/auth.ts';

export type AuthConfig = { apiUrl: string; webClientId: string };

const localDevelopmentHosts = new Set(['localhost', '127.0.0.1', '10.0.2.2']);

export function normalizeIdentityApiUrl(value: string | undefined, development = isDevelopmentRuntime()): string {
  if (!value) throw new AuthFailure('configuration');

  let url: URL;
  try { url = new URL(value); } catch { throw new AuthFailure('configuration'); }

  const hasOnlyOrigin = url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password;
  const isSecure = url.protocol === 'https:';
  const isLocalDevelopment = development && url.protocol === 'http:' && localDevelopmentHosts.has(url.hostname);
  if (!hasOnlyOrigin || (!isSecure && !isLocalDevelopment)) throw new AuthFailure('configuration');

  return url.origin;
}

export function parseAuthConfig(values: { apiUrl?: string; webClientId?: string }, development = isDevelopmentRuntime()): AuthConfig {
  let apiUrl: string;
  try { apiUrl = normalizeIdentityApiUrl(values.apiUrl, development); }
  catch { throw new AuthFailure('configuration'); }
  const webClientId = values.webClientId;
  if (!webClientId || !/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(webClientId)) {
    throw new AuthFailure('configuration');
  }
  return { apiUrl, webClientId };
}

export function loadAuthConfig(): AuthConfig {
  return parseAuthConfig({
    apiUrl: process.env.EXPO_PUBLIC_IDENTITY_API_URL,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
}

function isDevelopmentRuntime(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}
