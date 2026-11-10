import { AuthFailure } from './domain/auth.ts';

export type AuthConfig = {
  domain: string;
  clientId: string;
  userPoolId: string;
  redirectUri: string;
  logoutUri: string;
};

export function parseAuthConfig(values: { domain?: string; clientId?: string; userPoolId?: string }): AuthConfig {
  const domain = values.domain?.replace(/\/$/, '');
  const userPoolId = values.userPoolId;
  const clientId = values.clientId;
  // Restrict the browser/token endpoints to the configured regional Cognito origin.
  if (!domain || !/^https:\/\/[a-z0-9-]+\.auth\.us-east-2\.amazoncognito\.com$/.test(domain)
      || !userPoolId || !/^us-east-2_[A-Za-z0-9]+$/.test(userPoolId)
      || !clientId || !/^[a-z0-9]{10,128}$/.test(clientId)) {
    throw new AuthFailure('configuration');
  }
  return { domain, clientId, userPoolId, redirectUri: 'nomi://auth/callback', logoutUri: 'nomi://auth/logout' };
}

export function loadAuthConfig(): AuthConfig {
  return parseAuthConfig({
    domain: process.env.EXPO_PUBLIC_COGNITO_DOMAIN,
    clientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID,
    userPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID,
  });
}
