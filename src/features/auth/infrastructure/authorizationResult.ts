import { AuthFailure } from '../domain/auth.ts';

type BrowserResult = { type: string; url?: string; params?: Record<string, string> };

export function authorizationResult(
  result: BrowserResult,
  request: { state: string; codeVerifier?: string },
  redirectUri: string,
): { code: string; verifier: string } | null {
  if (result.type === 'cancel' || result.type === 'dismiss') return null;
  if (result.type !== 'success' || !result.url || !request.codeVerifier
      || result.url.split(/[?#]/)[0] !== redirectUri || result.url.includes('#')) {
    throw new AuthFailure('invalidResponse');
  }
  const parameters = new URL(result.url).searchParams;
  const code = parameters.get('code');
  if (!code || parameters.getAll('code').length !== 1 || parameters.getAll('state').length !== 1
      || parameters.has('error') || parameters.get('state') !== request.state
      || result.params?.state !== request.state || result.params.code !== code) {
    throw new AuthFailure('invalidResponse');
  }
  return { code, verifier: request.codeVerifier };
}
