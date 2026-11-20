import { environment } from '@/config/environment';
import { SIMULATED_PROFILE } from '@/features/profile/mock';
import type { ThemePreference } from '@/theme/tokens';

/**
 * Contrato de perfil e preferências (TEC-003 v0.2 · seção 14.2).
 * Rotas no serviço Academic: GET /api/v1/me e PATCH /api/v1/me.
 * Recursos versionados retornam ETag e exigem If-Match em atualizações.
 */
export type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  theme: ThemePreference;
  locale: 'pt-BR';
  timeZone: string;
  avatarUrl?: string;
  courseLabel?: string;
  termLabel?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type PatchProfileInput = {
  displayName?: string;
  theme?: ThemePreference;
  locale?: 'pt-BR';
  timeZone?: string;
};

export type ProfileEnvelope = {
  profile: UserProfile;
  etag: string;
  simulated: boolean;
};

export type ProfileErrorKind = 'validation' | 'conflict' | 'unauthorized' | 'network' | 'server';

export class ProfileApiError extends Error {
  readonly kind: ProfileErrorKind;
  readonly status?: number;
  readonly fieldErrors?: Partial<Record<keyof PatchProfileInput, string>>;

  constructor(
    message: string,
    kind: ProfileErrorKind,
    options?: {
      status?: number;
      fieldErrors?: Partial<Record<keyof PatchProfileInput, string>>;
    }
  ) {
    super(message);
    this.name = 'ProfileApiError';
    this.kind = kind;
    this.status = options?.status;
    this.fieldErrors = options?.fieldErrors;
  }
}

export function normalizeLocaleInput(raw: string): 'pt-BR' | null {
  const trimmed = raw.trim().toLowerCase();
  if (
    trimmed === 'pt-br' ||
    trimmed === 'português (brasil)' ||
    trimmed === 'portugues (brasil)' ||
    trimmed === 'português' ||
    trimmed === 'portugues'
  ) {
    return 'pt-BR';
  }
  return null;
}

export function formatLocaleDisplay(locale: string): string {
  return locale === 'pt-BR' ? 'Português (Brasil)' : locale;
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  const trimmed = timeZone.trim();
  if (!trimmed || trimmed.length > 100) {
    return false;
  }
  try {
    Intl.DateTimeFormat('pt-BR', { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

export function validatePatchProfileInput(
  input: PatchProfileInput
): Partial<Record<keyof PatchProfileInput, string>> {
  const errors: Partial<Record<keyof PatchProfileInput, string>> = {};

  if (input.displayName !== undefined) {
    const trimmed = input.displayName.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      errors.displayName = 'O nome deve ter entre 1 e 100 caracteres.';
    }
  }

  if (input.locale !== undefined && input.locale !== 'pt-BR') {
    errors.locale = 'O idioma inicial suportado pelo contrato é Português (Brasil) (pt-BR).';
  }

  if (input.timeZone !== undefined && !isValidIanaTimeZone(input.timeZone)) {
    errors.timeZone = 'Informe um fuso horário IANA válido (ex.: America/Sao_Paulo).';
  }

  if (
    input.theme !== undefined &&
    input.theme !== 'system' &&
    input.theme !== 'light' &&
    input.theme !== 'dark'
  ) {
    errors.theme = 'Escolha entre Claro, Escuro ou Acompanhar o sistema.';
  }

  return errors;
}

export interface ProfileApiAdapter {
  readonly isSimulated: boolean;
  getMe(accessToken?: string): Promise<ProfileEnvelope>;
  patchMe(
    input: PatchProfileInput,
    ifMatch: string,
    accessToken?: string
  ): Promise<ProfileEnvelope>;
}

/**
 * Adapter HTTP real para o serviço Academic (GET/PATCH /api/v1/me).
 */
export class HttpProfileApiAdapter implements ProfileApiAdapter {
  readonly isSimulated = false;
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private resolveMeUrl(): string {
    if (this.baseUrl.endsWith('/api/v1')) {
      return `${this.baseUrl}/me`;
    }
    return `${this.baseUrl}/api/v1/me`;
  }

  async getMe(accessToken?: string): Promise<ProfileEnvelope> {
    let response: Response;
    try {
      response = await fetch(this.resolveMeUrl(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
    } catch {
      throw new ProfileApiError(
        'Não foi possível conectar ao serviço Academic. Verifique sua conexão e tente novamente.',
        'network'
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new ProfileApiError(
        'Sua sessão não está autorizada para consultar o perfil.',
        'unauthorized',
        { status: response.status }
      );
    }

    if (!response.ok) {
      throw new ProfileApiError(
        `Falha ao carregar o perfil (HTTP ${response.status}).`,
        'server',
        { status: response.status }
      );
    }

    const body = (await response.json()) as UserProfile;
    const etag = response.headers.get('etag') ?? `"${body.version ?? 1}"`;

    return {
      profile: body,
      etag,
      simulated: false,
    };
  }

  async patchMe(
    input: PatchProfileInput,
    ifMatch: string,
    accessToken?: string
  ): Promise<ProfileEnvelope> {
    const fieldErrors = validatePatchProfileInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      throw new ProfileApiError(
        'Corrija os campos inválidos antes de salvar.',
        'validation',
        { fieldErrors }
      );
    }

    if (!ifMatch) {
      throw new ProfileApiError(
        'Cabeçalho If-Match ausente para atualização de perfil versionado.',
        'validation'
      );
    }

    const payload: PatchProfileInput = {
      ...(input.displayName !== undefined ? { displayName: input.displayName.trim() } : {}),
      ...(input.theme !== undefined ? { theme: input.theme } : {}),
      ...(input.locale !== undefined ? { locale: input.locale } : {}),
      ...(input.timeZone !== undefined ? { timeZone: input.timeZone.trim() } : {}),
    };

    let response: Response;
    try {
      response = await fetch(this.resolveMeUrl(), {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'If-Match': ifMatch,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new ProfileApiError(
        'Não foi possível enviar as alterações ao serviço Academic.',
        'network'
      );
    }

    if (response.status === 412) {
      throw new ProfileApiError(
        'O perfil foi alterado em outro dispositivo ou sessão (HTTP 412). Recarregue os dados atuais para reconciliar antes de salvar.',
        'conflict',
        { status: 412 }
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new ProfileApiError(
        'Sua sessão não está autorizada para alterar este perfil.',
        'unauthorized',
        { status: response.status }
      );
    }

    if (response.status === 400 || response.status === 422) {
      throw new ProfileApiError(
        'O servidor rejeitou os dados enviados. Verifique os campos informados.',
        'validation',
        { status: response.status }
      );
    }

    if (!response.ok) {
      throw new ProfileApiError(
        `Não foi possível salvar o perfil (HTTP ${response.status}).`,
        'server',
        { status: response.status }
      );
    }

    const body = (await response.json()) as UserProfile;
    const etag = response.headers.get('etag') ?? `"${body.version ?? 1}"`;

    return {
      profile: body,
      etag,
      simulated: false,
    };
  }
}

/**
 * Adapter simulado explicitamente identificado para quando o endpoint
 * GET/PATCH /me ainda não estiver disponível no ambiente local.
 * A simulação reproduz ETag/If-Match e erro 412 de versão, mas NÃO substitui
 * integração real nos critérios de aceite.
 */
export class SimulatedProfileApiAdapter implements ProfileApiAdapter {
  readonly isSimulated = true;

  private state: UserProfile = {
    id: SIMULATED_PROFILE.id,
    displayName: SIMULATED_PROFILE.displayName,
    email: SIMULATED_PROFILE.email,
    theme: SIMULATED_PROFILE.theme,
    locale: 'pt-BR',
    timeZone: SIMULATED_PROFILE.timeZone,
    courseLabel: SIMULATED_PROFILE.courseLabel,
    termLabel: SIMULATED_PROFILE.termLabel,
    version: SIMULATED_PROFILE.version,
    createdAt: '2026-11-01T12:00:00Z',
    updatedAt: '2026-11-19T12:00:00Z',
  };

  private etag = SIMULATED_PROFILE.etag;

  async getMe(): Promise<ProfileEnvelope> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    return {
      profile: { ...this.state },
      etag: this.etag,
      simulated: true,
    };
  }

  async patchMe(input: PatchProfileInput, ifMatch: string): Promise<ProfileEnvelope> {
    await new Promise((resolve) => setTimeout(resolve, 160));

    const fieldErrors = validatePatchProfileInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      throw new ProfileApiError(
        'Corrija os campos inválidos antes de salvar.',
        'validation',
        { fieldErrors }
      );
    }

    if (!ifMatch || ifMatch !== this.etag) {
      throw new ProfileApiError(
        'Conflito de versão detectado (HTTP 412 · If-Match divergente do ETag atual). Recarregue o perfil antes de tentar salvar novamente.',
        'conflict',
        { status: 412 }
      );
    }

    const nextVersion = this.state.version + 1;
    this.state = {
      ...this.state,
      ...(input.displayName !== undefined ? { displayName: input.displayName.trim() } : {}),
      ...(input.theme !== undefined ? { theme: input.theme } : {}),
      ...(input.locale !== undefined ? { locale: input.locale } : {}),
      ...(input.timeZone !== undefined ? { timeZone: input.timeZone.trim() } : {}),
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    };
    this.etag = `"${nextVersion}"`;

    return {
      profile: { ...this.state },
      etag: this.etag,
      simulated: true,
    };
  }

  bumpRemoteVersionForTesting(): void {
    const nextVersion = this.state.version + 1;
    this.state = {
      ...this.state,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    };
    this.etag = `"${nextVersion}"`;
  }
}

const defaultSimulatedAdapter = new SimulatedProfileApiAdapter();

export function createProfileApiAdapter(): ProfileApiAdapter {
  if (environment.academicApiUrl) {
    return new HttpProfileApiAdapter(environment.academicApiUrl);
  }
  return defaultSimulatedAdapter;
}
