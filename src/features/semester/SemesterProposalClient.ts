import { environment } from '@/config/environment';
import { normalizeAssistantApiUrl } from '../voice/urlPolicy';
import { AssistantUnavailableError, SEMESTER_INVALID_MESSAGE, parseSemesterProposal, semesterErrorForStatus, type SemesterProposal } from './semesterParsing';

export { AssistantUnavailableError } from './semesterParsing';
export type { SemesterProposal, SemesterQuestion, SemesterSubjectProposal } from './semesterParsing';

export class SemesterProposalClient {
  private readonly baseUrl: string;

  constructor(
    private readonly getAccessToken: () => Promise<string | null>,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.baseUrl = normalizeAssistantApiUrl(environment.assistantApiUrl);
  }

  /**
   * Interprets free text (voice transcript or typed description) into semester subjects.
   * Reuse the same `idempotencyKey` when retrying the same text.
   * Throws AssistantUnavailableError when the Assistant cannot be reached or answers 5xx.
   */
  async createProposal(text: string, timeZone: string, idempotencyKey: string, signal?: AbortSignal): Promise<SemesterProposal> {
    const token = await this.getAccessToken();
    if (!token) throw new Error('Sua sessão expirou. Entre novamente.');

    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 20_000);
    try {
      let response: Response;
      try {
        response = await this.fetchImpl(this.baseUrl + '/api/v1/semester-proposals', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({ text, locale: 'pt-BR', timeZone }),
          signal: controller.signal,
          redirect: 'error',
        });
      } catch {
        throw new AssistantUnavailableError();
      }

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        throw semesterErrorForStatus(response.status, body);
      }
      let body: unknown;
      try { body = await response.json(); }
      catch { throw new Error(SEMESTER_INVALID_MESSAGE); }
      return parseSemesterProposal(body);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }
}
