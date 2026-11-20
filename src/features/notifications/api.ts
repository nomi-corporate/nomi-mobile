import { environment } from '@/config/environment';

/**
 * Contrato de preferências de notificações e lembretes (TEC-003 v0.2 · seção 8).
 * Rotas no serviço Notifications:
 * - GET /api/v1/notification-preferences
 * - PUT /api/v1/notification-preferences (com If-Match)
 *
 * Preferências iniciam desativadas por padrão até o estudante configurar horários.
 * Antecedências (leadTimesMinutes): positivas, únicas, até 3 valores e até 30 dias (43.200 minutos).
 * dateOnlyReminder: { daysBefore, localTime } ou null (impede avisos de prazos sem horário).
 */
export const MAX_LEAD_TIMES_COUNT = 3;
export const MAX_LEAD_TIME_MINUTES = 30 * 24 * 60; // 43.200 minutos (30 dias)

export type DateOnlyReminderPreference = {
  daysBefore: number;
  localTime: string; // HH:mm:ss
};

export type NotificationPreferences = {
  enabled: boolean;
  leadTimesMinutes: number[];
  dateOnlyReminder: DateOnlyReminderPreference | null;
  version: number;
  updatedAt?: string;
};

export type UpdateNotificationPreferencesInput = {
  enabled: boolean;
  leadTimesMinutes: number[];
  dateOnlyReminder: DateOnlyReminderPreference | null;
};

export type NotificationPreferencesEnvelope = {
  preferences: NotificationPreferences;
  etag: string;
  simulated: boolean;
};

export type NotificationPreferencesErrorKind =
  | 'validation'
  | 'conflict'
  | 'unauthorized'
  | 'network'
  | 'server';

export type NotificationPreferencesFieldErrors = {
  leadTimesMinutes?: string;
  dateOnlyReminder?: string;
};

export class NotificationPreferencesApiError extends Error {
  readonly kind: NotificationPreferencesErrorKind;
  readonly status?: number;
  readonly fieldErrors?: NotificationPreferencesFieldErrors;

  constructor(
    message: string,
    kind: NotificationPreferencesErrorKind,
    options?: {
      status?: number;
      fieldErrors?: NotificationPreferencesFieldErrors;
    }
  ) {
    super(message);
    this.name = 'NotificationPreferencesApiError';
    this.kind = kind;
    this.status = options?.status;
    this.fieldErrors = options?.fieldErrors;
  }
}

export function validateLeadTimesMinutes(leadTimesMinutes: number[]): string | undefined {
  if (!Array.isArray(leadTimesMinutes) || leadTimesMinutes.length === 0) {
    return 'Informe pelo menos uma antecedência em minutos.';
  }
  if (leadTimesMinutes.length > MAX_LEAD_TIMES_COUNT) {
    return `Informe no máximo ${MAX_LEAD_TIMES_COUNT} antecedências.`;
  }
  const seen = new Set<number>();
  for (const minutes of leadTimesMinutes) {
    if (!Number.isInteger(minutes) || minutes <= 0) {
      return 'As antecedências devem ser números inteiros positivos (em minutos).';
    }
    if (minutes > MAX_LEAD_TIME_MINUTES) {
      return 'Cada antecedência deve ser de no máximo 30 dias (43.200 minutos).';
    }
    if (seen.has(minutes)) {
      return 'As antecedências não podem conter valores repetidos.';
    }
    seen.add(minutes);
  }
  return undefined;
}

const LOCAL_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

export function normalizeLocalTimeInput(raw: string): string | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const lowered = trimmed.toLowerCase();
  if (
    lowered === 'desativado' ||
    lowered === 'nenhum' ||
    lowered === 'sem aviso' ||
    lowered === 'null'
  ) {
    return null;
  }
  // Aceita formatos como "Às 09:00 no seu fuso", "09:00" ou "09:00:00"
  const extracted = trimmed
    .replace(/^às\s+/i, '')
    .replace(/\s+no\s+seu\s+fuso$/i, '')
    .trim();

  const match = LOCAL_TIME_REGEX.exec(extracted);
  if (!match) {
    return undefined;
  }
  const hours = match[1];
  const minutes = match[2];
  const seconds = match[3] ?? '00';
  return `${hours}:${minutes}:${seconds}`;
}

export function formatDateOnlyReminderDisplay(
  reminder: DateOnlyReminderPreference | null
): string {
  if (!reminder) {
    return 'Sem aviso para prazos sem horário';
  }
  const hhmm = reminder.localTime.slice(0, 5);
  return `Às ${hhmm} no seu fuso`;
}

export function parseLeadTimesInput(raw: string): number[] | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  // Aceita lista de minutos como "30", "30 minutos antes", "30, 60, 1440"
  const parts = trimmed
    .replace(/minutos?\s*antes/gi, '')
    .replace(/min/gi, '')
    .split(/[,;/]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const parsed: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      return null;
    }
    parsed.push(Number(part));
  }
  return parsed;
}

export function formatLeadTimesDisplay(leadTimesMinutes: number[]): string {
  if (leadTimesMinutes.length === 1) {
    return `${leadTimesMinutes[0]} minutos antes`;
  }
  return `${leadTimesMinutes.join(', ')} minutos antes`;
}

export function validateNotificationPreferencesInput(
  input: UpdateNotificationPreferencesInput
): NotificationPreferencesFieldErrors {
  const errors: NotificationPreferencesFieldErrors = {};

  const leadError = validateLeadTimesMinutes(input.leadTimesMinutes);
  if (leadError) {
    errors.leadTimesMinutes = leadError;
  }

  if (input.dateOnlyReminder !== null) {
    const { daysBefore, localTime } = input.dateOnlyReminder;
    if (!Number.isInteger(daysBefore) || daysBefore < 0 || daysBefore > 30) {
      errors.dateOnlyReminder =
        'A antecedência para prazos sem horário deve estar entre 0 e 30 dias.';
    } else if (!LOCAL_TIME_REGEX.test(localTime)) {
      errors.dateOnlyReminder =
        'Informe um horário válido no formato HH:mm (ex.: 09:00) ou deixe vazio para não avisar.';
    }
  }

  return errors;
}

export interface NotificationPreferencesApiAdapter {
  readonly isSimulated: boolean;
  getPreferences(accessToken?: string): Promise<NotificationPreferencesEnvelope>;
  putPreferences(
    input: UpdateNotificationPreferencesInput,
    ifMatch: string,
    accessToken?: string
  ): Promise<NotificationPreferencesEnvelope>;
}

export class HttpNotificationPreferencesApiAdapter
  implements NotificationPreferencesApiAdapter
{
  readonly isSimulated = false;
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private resolveUrl(): string {
    if (this.baseUrl.endsWith('/api/v1')) {
      return `${this.baseUrl}/notification-preferences`;
    }
    return `${this.baseUrl}/api/v1/notification-preferences`;
  }

  async getPreferences(accessToken?: string): Promise<NotificationPreferencesEnvelope> {
    let response: Response;
    try {
      response = await fetch(this.resolveUrl(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
    } catch {
      throw new NotificationPreferencesApiError(
        'Não foi possível conectar ao serviço Notifications. Verifique sua conexão e tente novamente.',
        'network'
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new NotificationPreferencesApiError(
        'Sua sessão não está autorizada para consultar as preferências de lembretes.',
        'unauthorized',
        { status: response.status }
      );
    }

    if (!response.ok) {
      throw new NotificationPreferencesApiError(
        `Falha ao carregar as preferências de lembretes (HTTP ${response.status}).`,
        'server',
        { status: response.status }
      );
    }

    const body = (await response.json()) as NotificationPreferences;
    const etag = response.headers.get('etag') ?? `"${body.version ?? 1}"`;

    return {
      preferences: body,
      etag,
      simulated: false,
    };
  }

  async putPreferences(
    input: UpdateNotificationPreferencesInput,
    ifMatch: string,
    accessToken?: string
  ): Promise<NotificationPreferencesEnvelope> {
    const fieldErrors = validateNotificationPreferencesInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      throw new NotificationPreferencesApiError(
        'Corrija os campos de lembretes antes de salvar.',
        'validation',
        { fieldErrors }
      );
    }

    if (!ifMatch) {
      throw new NotificationPreferencesApiError(
        'Cabeçalho If-Match ausente para atualização de preferências de lembretes.',
        'validation'
      );
    }

    let response: Response;
    try {
      response = await fetch(this.resolveUrl(), {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'If-Match': ifMatch,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(input),
      });
    } catch {
      throw new NotificationPreferencesApiError(
        'Não foi possível enviar as preferências ao serviço Notifications.',
        'network'
      );
    }

    if (response.status === 412) {
      throw new NotificationPreferencesApiError(
        'As preferências de lembretes foram alteradas em outra sessão (HTTP 412). Recarregue os valores atuais antes de salvar.',
        'conflict',
        { status: 412 }
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new NotificationPreferencesApiError(
        'Sua sessão não está autorizada para atualizar as preferências de lembretes.',
        'unauthorized',
        { status: response.status }
      );
    }

    if (response.status === 400 || response.status === 422) {
      throw new NotificationPreferencesApiError(
        'O servidor rejeitou as preferências enviadas.',
        'validation',
        { status: response.status }
      );
    }

    if (!response.ok) {
      throw new NotificationPreferencesApiError(
        `Não foi possível salvar as preferências de lembretes (HTTP ${response.status}).`,
        'server',
        { status: response.status }
      );
    }

    const body = (await response.json()) as NotificationPreferences;
    const etag = response.headers.get('etag') ?? `"${body.version ?? 1}"`;

    return {
      preferences: body,
      etag,
      simulated: false,
    };
  }
}

/**
 * Adapter simulado explicitamente identificado para quando o serviço
 * nomi-notifications não estiver acessível localmente.
 * Conforme a TEC-003 (seção 8), as preferências começam desativadas por padrão.
 */
export class SimulatedNotificationPreferencesApiAdapter
  implements NotificationPreferencesApiAdapter
{
  readonly isSimulated = true;

  private state: NotificationPreferences = {
    enabled: false,
    leadTimesMinutes: [30],
    dateOnlyReminder: {
      daysBefore: 0,
      localTime: '09:00:00',
    },
    version: 1,
    updatedAt: '2026-11-19T12:00:00Z',
  };

  private etag = '"1"';

  async getPreferences(): Promise<NotificationPreferencesEnvelope> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    return {
      preferences: {
        ...this.state,
        leadTimesMinutes: [...this.state.leadTimesMinutes],
        dateOnlyReminder: this.state.dateOnlyReminder
          ? { ...this.state.dateOnlyReminder }
          : null,
      },
      etag: this.etag,
      simulated: true,
    };
  }

  async putPreferences(
    input: UpdateNotificationPreferencesInput,
    ifMatch: string
  ): Promise<NotificationPreferencesEnvelope> {
    await new Promise((resolve) => setTimeout(resolve, 160));

    const fieldErrors = validateNotificationPreferencesInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      throw new NotificationPreferencesApiError(
        'Corrija os campos de lembretes antes de salvar.',
        'validation',
        { fieldErrors }
      );
    }

    if (!ifMatch || ifMatch !== this.etag) {
      throw new NotificationPreferencesApiError(
        'Conflito de versão detectado (HTTP 412 · If-Match divergente do ETag atual). Recarregue as preferências antes de salvar novamente.',
        'conflict',
        { status: 412 }
      );
    }

    const nextVersion = this.state.version + 1;
    this.state = {
      enabled: input.enabled,
      leadTimesMinutes: [...input.leadTimesMinutes],
      dateOnlyReminder: input.dateOnlyReminder ? { ...input.dateOnlyReminder } : null,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    };
    this.etag = `"${nextVersion}"`;

    return {
      preferences: {
        ...this.state,
        leadTimesMinutes: [...this.state.leadTimesMinutes],
        dateOnlyReminder: this.state.dateOnlyReminder
          ? { ...this.state.dateOnlyReminder }
          : null,
      },
      etag: this.etag,
      simulated: true,
    };
  }
}

const defaultSimulatedAdapter = new SimulatedNotificationPreferencesApiAdapter();

export function createNotificationPreferencesApiAdapter(): NotificationPreferencesApiAdapter {
  if (environment.notificationsApiUrl) {
    return new HttpNotificationPreferencesApiAdapter(environment.notificationsApiUrl);
  }
  return defaultSimulatedAdapter;
}
