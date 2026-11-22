import { normalizeAcademicApiUrl } from '../urlPolicy.ts';
import type { CreateProfessorInput, ProfessorList, UpdateProfessorInput } from '../domain/academic.ts';

export type AcademicSubject = {
  id: string;
  version: number;
  name: string;
  code: string | null;
  colorToken: string;
  iconKey: string;
  professorIds: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SubjectList = { items: AcademicSubject[]; nextCursor: string | null };

export type CreateSubjectInput = {
  name: string;
  code?: string | null;
  colorToken?: string;
  iconKey?: string;
};

export type UpdateSubjectInput = {
  name?: string;
  code?: string | null;
  colorToken?: string | null;
  iconKey?: string | null;
};

export type AcademicProfile = {
  id: string;
  displayName: string;
  email: string | null;
  theme: 'system' | 'light' | 'dark';
  locale: 'pt-BR';
  timeZone: string;
  version: number;
  avatarUrl: string | null;
};
export type ProfilePatch = Partial<Pick<AcademicProfile, 'displayName' | 'theme' | 'locale' | 'timeZone'>>;

export type AgendaItem = {
  id: string;
  itemType: 'commitment';
  title: string;
  description: string | null;
  kind: string;
  subjectId: string | null;
  subjectName: string | null;
  status: 'pending' | 'completed';
  displayDate: string;
  displayTime: string | null;
  due: { precision: 'date' | 'dateTime'; localDate: string; timeZone: string; instant?: string; localTime?: string; offset?: string };
  version: number;
  createdAt?: string;
  updatedAt?: string;
};
export type CreateCommitmentInput = {
  title: string;
  description: string | null;
  kind: 'exam' | 'assignment' | 'reminder';
  subjectId: string | null;
  due: { precision: 'date'; localDate: string; timeZone: string };
};
export type AgendaPage = {
  items: AgendaItem[];
  nextCursor: string | null;
  fromDate: string;
  toDate: string;
  timeZone: string;
  generatedAt: string;
  classOccurrencesAvailable: boolean;
};
export type HomeSummary = {
  date: string;
  timeZone: string;
  generatedAt: string;
  items: AgendaItem[];
  upcoming: AgendaItem[];
  overdue: AgendaItem[];
  hasMore: boolean;
  classOccurrencesAvailable: boolean;
};
export type StudyGroup = {
  id: string;
  name: string;
  description: string | null;
  role: 'owner' | 'admin' | 'member';
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type StudyGroupPage = { items: StudyGroup[]; nextCursor: string | null };

export class AcademicApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'AcademicApiError';
  }
}

export class AcademicClient {
  private readonly baseUrl: string;
  private readonly request: typeof fetch;
  private readonly accessToken: () => Promise<string | null>;
  private readonly onUnauthorized?: () => Promise<void> | void;

  constructor(
    baseUrl: string,
    accessToken: () => Promise<string | null>,
    request: typeof fetch = fetch,
    development?: boolean,
    onUnauthorized?: () => Promise<void> | void,
  ) {
    this.baseUrl = normalizeAcademicApiUrl(baseUrl, development);
    this.accessToken = accessToken;
    this.request = request;
    this.onUnauthorized = onUnauthorized;
  }

  async listSubjects(options: { archived?: boolean; query?: string; cursor?: string; limit?: number } = {}): Promise<SubjectList> {
    const params = new URLSearchParams();
    params.set('archived', String(options.archived ?? false));
    if (options.query?.trim()) params.set('query', options.query.trim());
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.limit) params.set('limit', String(Math.min(100, Math.max(1, options.limit))));
    return this.send<SubjectList>(`/subjects?${params.toString()}`);
  }

  async getProfile(): Promise<AcademicProfile> {
    return validateProfile(await this.send<AcademicProfile>('/me'));
  }

  async getAgenda(fromDate: string, toDate: string, timeZone: string, cursor?: string): Promise<AgendaPage> {
    const query = new URLSearchParams({ fromDate, toDate, timeZone });
    if (cursor) query.set('cursor', cursor);
    const value = await this.send<AgendaPage>(`/agenda?${query.toString()}`);
    if (!value || !Array.isArray(value.items) || (value.nextCursor !== null && typeof value.nextCursor !== 'string'))
      throw new AcademicApiError(502, 'A agenda retornou uma resposta inválida. Tente novamente.');
    return value;
  }

  async getHome(date: string, timeZone: string): Promise<HomeSummary> {
    const query = new URLSearchParams({ date, timeZone });
    const value = await this.send<HomeSummary>(`/home?${query.toString()}`);
    if (!value || !Array.isArray(value.items) || !Array.isArray(value.upcoming) || !Array.isArray(value.overdue))
      throw new AcademicApiError(502, 'O resumo do dia retornou uma resposta inválida. Tente novamente.');
    return value;
  }

  getCommitment(id: string, timeZone?: string): Promise<AgendaItem> {
    const query = timeZone ? `?${new URLSearchParams({ timeZone })}` : '';
    return this.send<AgendaItem>(`/commitments/${encodeURIComponent(id)}${query}`);
  }

  async createCommitment(input: CreateCommitmentInput, idempotencyKey: string): Promise<AgendaItem> {
    requireIdempotencyKey(idempotencyKey);
    const value = await this.send<AgendaItem>('/commitments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(input),
    });
    if (!value || typeof value.id !== 'string' || typeof value.title !== 'string' || value.status !== 'pending'
      || value.due?.precision !== 'date' || !Number.isInteger(value.version))
      throw new AcademicApiError(502, 'O serviço acadêmico não confirmou o compromisso. Tente novamente.');
    return value;
  }

  async listGroups(cursor?: string): Promise<StudyGroupPage> {
    const query = new URLSearchParams();
    if (cursor) query.set('cursor', cursor);
    const value = await this.send<StudyGroupPage>(`/groups${query.size ? `?${query}` : ''}`);
    if (!value || !Array.isArray(value.items) || (value.nextCursor !== null && typeof value.nextCursor !== 'string'))
      throw new AcademicApiError(502, 'A lista de grupos retornou uma resposta inválida. Tente novamente.');
    return value;
  }

  getGroup(id: string): Promise<StudyGroup> {
    return this.send<StudyGroup>(`/groups/${encodeURIComponent(id)}`);
  }

  createGroup(name: string, description: string | null, idempotencyKey: string): Promise<StudyGroup> {
    requireIdempotencyKey(idempotencyKey);
    return this.send<StudyGroup>('/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ name: name.trim(), description: description?.trim() || null }),
    });
  }

  async updateProfile(version: number, input: ProfilePatch): Promise<AcademicProfile> {
    return validateProfile(await this.send<AcademicProfile>('/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'If-Match': etag(version) },
      body: JSON.stringify(input),
    }));
  }

  createSubject(input: CreateSubjectInput, idempotencyKey: string): Promise<AcademicSubject> {
    requireIdempotencyKey(idempotencyKey);
    return this.send<AcademicSubject>('/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({
        name: input.name.trim(),
        code: input.code?.trim() || null,
        colorToken: input.colorToken ?? 'lavender',
        iconKey: input.iconKey ?? 'book',
      }),
    });
  }

  updateSubject(id: string, version: number, input: UpdateSubjectInput): Promise<AcademicSubject> {
    return this.send<AcademicSubject>(`/subjects/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'If-Match': etag(version) },
      body: JSON.stringify(input),
    });
  }

  getSubject(id: string): Promise<AcademicSubject> {
    return this.send<AcademicSubject>(`/subjects/${encodeURIComponent(id)}`);
  }

  replaceSubjectProfessors(id: string, version: number, professorIds: string[]): Promise<AcademicSubject> {
    return this.send<AcademicSubject>(`/subjects/${encodeURIComponent(id)}/professors`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'If-Match': etag(version) },
      body: JSON.stringify({ professorIds }),
    });
  }

  archiveSubject(id: string, version: number, archived = true): Promise<AcademicSubject> {
    return this.send<AcademicSubject>(`/subjects/${encodeURIComponent(id)}/archive`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'If-Match': etag(version) },
      body: JSON.stringify({ archived }),
    });
  }

  async listProfessors(options: { archived?: boolean; query?: string; cursor?: string; limit?: number } = {}): Promise<ProfessorList> {
    const params = new URLSearchParams();
    params.set('archived', String(options.archived ?? false));
    if (options.query?.trim()) params.set('query', options.query.trim());
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.limit) params.set('limit', String(Math.min(100, Math.max(1, options.limit))));
    return this.send<ProfessorList>(`/professors?${params.toString()}`);
  }

  createProfessor(input: CreateProfessorInput, idempotencyKey: string): Promise<ProfessorList['items'][number]> {
    requireIdempotencyKey(idempotencyKey);
    return this.send('/professors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({
        name: input.name.trim(),
        email: input.email?.trim() || null,
        office: input.office?.trim() || null,
      }),
    });
  }

  updateProfessor(id: string, version: number, input: UpdateProfessorInput): Promise<ProfessorList['items'][number]> {
    return this.send(`/professors/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'If-Match': etag(version) },
      body: JSON.stringify({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
        ...(input.office !== undefined ? { office: input.office?.trim() || null } : {}),
      }),
    });
  }

  archiveProfessor(id: string, version: number, archived = true): Promise<ProfessorList['items'][number]> {
    return this.send(`/professors/${encodeURIComponent(id)}/archive`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'If-Match': etag(version) },
      body: JSON.stringify({ archived }),
    });
  }

  private async send<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.accessToken();
    if (!token) {
      await this.expireSession();
      throw new AcademicApiError(401, 'Sua sessão expirou. Entre novamente.');
    }
    let response: Response;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 15_000);
    try {
      response = await this.request(`${this.baseUrl}/api/v1${path}`, {
        ...init,
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
        signal: abort.signal,
        redirect: 'error',
      });
    } catch {
      clearTimeout(timer);
      throw new AcademicApiError(0, 'Não foi possível acessar o serviço acadêmico. Confira sua conexão e tente novamente.');
    }
    try {
      if (!response.ok) {
        if (response.status === 401) await this.expireSession();
        throw new AcademicApiError(response.status, safeErrorMessage(response.status));
      }
      if (response.status === 204) return undefined as T;
      try { return await response.json() as T; }
      catch { throw new AcademicApiError(502, 'O serviço acadêmico retornou uma resposta inválida. Tente novamente.'); }
    } finally { clearTimeout(timer); }
  }

  private async expireSession(): Promise<void> {
    try { await this.onUnauthorized?.(); } catch { /* preserve the safe API error for the screen */ }
  }
}

function safeErrorMessage(status: number): string {
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (status === 403) return 'Você não tem permissão para realizar esta ação.';
  if (status === 404) return 'O item solicitado não foi encontrado.';
  if (status === 409) return 'Este item já foi alterado. Atualize a tela e tente novamente.';
  if (status === 412) return 'Os dados mudaram desde a última atualização. Atualize a tela e tente novamente.';
  if (status === 422) return 'Confira os dados informados e tente novamente.';
  if (status === 429) return 'Muitas solicitações em pouco tempo. Aguarde e tente novamente.';
  if (status >= 500) return 'O serviço acadêmico está temporariamente indisponível.';
  return 'Não foi possível concluir a operação. Tente novamente.';
}

function etag(version: number): string {
  return `"${version}"`;
}

function validateProfile(value: AcademicProfile): AcademicProfile {
  if (!value || typeof value.id !== 'string' || typeof value.displayName !== 'string'
    || !['system', 'light', 'dark'].includes(value.theme) || value.locale !== 'pt-BR'
    || typeof value.timeZone !== 'string' || !Number.isInteger(value.version)
    || (value.email !== null && typeof value.email !== 'string')) {
    throw new AcademicApiError(502, 'Não foi possível carregar seu perfil com segurança. Tente novamente.');
  }
  return value;
}

export function createIdempotencyKey(): string {
  const randomUuid = globalThis.crypto?.randomUUID;
  if (randomUuid) return randomUuid.call(globalThis.crypto);
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function requireIdempotencyKey(value: string) {
  if (!value.trim() || value.length > 128) throw new AcademicApiError(400, 'Não foi possível iniciar a operação com segurança. Tente novamente.');
}
