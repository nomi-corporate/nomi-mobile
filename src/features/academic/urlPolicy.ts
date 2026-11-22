const localDevelopmentHosts = new Set(['localhost', '127.0.0.1', '10.0.2.2']);

export function normalizeAcademicApiUrl(value: string | undefined, development = isDevelopmentRuntime()): string {
  if (!value) throw new Error('Academic API não configurada.');

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Academic API não configurada.');
  }

  const hasOnlyOrigin = url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password;
  const isSecure = url.protocol === 'https:';
  const isLocalDevelopment = development && url.protocol === 'http:' && localDevelopmentHosts.has(url.hostname);
  if (!hasOnlyOrigin || (!isSecure && !isLocalDevelopment)) {
    throw new Error('Academic API exige HTTPS; HTTP só é permitido para hosts locais em desenvolvimento.');
  }

  return url.origin;
}

function isDevelopmentRuntime(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}
