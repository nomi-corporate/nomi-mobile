import { environment } from '@/config/environment';
import { normalizeAssistantApiUrl } from './urlPolicy';
import {
  AssistantUnavailableError,
  INVALID_PROPOSAL_MESSAGE,
  parseCommitmentProposal,
  proposalErrorForStatus,
  type CommitmentProposal,
} from './proposalParsing';

export { AssistantUnavailableError } from './proposalParsing';
export type { CommitmentProposal, ProposalCandidate, ProposalDue, ProposalQuestion, ProposalStatus } from './proposalParsing';

export class AssistantProposalClient {
  private readonly baseUrl: string;

  constructor(
    private readonly getAccessToken: () => Promise<string | null>,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.baseUrl = normalizeAssistantApiUrl(environment.assistantApiUrl);
  }

  /**
   * Interprets free text into a commitment proposal. Reuse the same `idempotencyKey` when retrying the same text.
   * Throws AssistantUnavailableError when the Assistant cannot be reached or answers 5xx.
   */
  async createProposal(text: string, timeZone: string, idempotencyKey: string, signal?: AbortSignal): Promise<CommitmentProposal> {
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
        response = await this.fetchImpl(this.baseUrl + '/api/v1/commitment-proposals', {
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
        throw proposalErrorForStatus(response.status, body);
      }
      let body: unknown;
      try { body = await response.json(); }
      catch { throw new Error(INVALID_PROPOSAL_MESSAGE); }
      return parseCommitmentProposal(body);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }
}
