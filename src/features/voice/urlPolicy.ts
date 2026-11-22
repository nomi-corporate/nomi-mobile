const localDevelopmentHosts = new Set(['localhost', '127.0.0.1', '10.0.2.2']);

/**
 * Accepts an origin (local API) or an origin plus a single path prefix such as
 * `https://host/assistant`, used when the Assistant sits behind the dev reverse proxy.
 */
export function normalizeAssistantApiUrl(value: string | undefined,
  development = typeof __DEV__ !== 'undefined' && __DEV__): string {
  if (!value) throw new Error('O Nomi Assistant não está configurado.');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('O endereço do Nomi Assistant é inválido.'); }
  const prefix = url.pathname.replace(/\/+$/, '');
  const local = development && url.protocol === 'http:' && localDevelopmentHosts.has(url.hostname);
  if ((url.protocol !== 'https:' && !local) || !/^(\/[a-z0-9-]+)?$/.test(prefix)
    || url.search || url.hash || url.username || url.password)
    throw new Error('O endereço do Nomi Assistant é inválido.');
  return url.origin + prefix;
}
