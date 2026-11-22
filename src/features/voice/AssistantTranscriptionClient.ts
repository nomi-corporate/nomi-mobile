import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { environment } from '@/config/environment';
import { normalizeAssistantApiUrl } from './urlPolicy';

export { normalizeAssistantApiUrl } from './urlPolicy';

export type TranscriptionState = {
  id: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  text?: string | null;
  errorCode?: string | null;
  expiresAt: string;
};

export class AssistantTranscriptionClient {
  private readonly baseUrl: string;
  constructor(private readonly getAccessToken: () => Promise<string | null>) {
    this.baseUrl = normalizeAssistantApiUrl(environment.assistantApiUrl);
  }

  async upload(file: File, durationSeconds: number, signal?: AbortSignal): Promise<string> {
    const sizeBytes = file.size;
    if (!file.exists || sizeBytes < 1 || sizeBytes > 10_000_000 || durationSeconds <= 0 || durationSeconds > 60)
      throw new Error('A gravação deve ter até 60 segundos e 10 MB.');
    const sha256 = await file.digest('SHA-256');
    const slot = await this.send<{ audioId: string; uploadUrl: string; expiresAt: string }>('/audio-uploads', {
      method: 'POST', body: JSON.stringify({
        contentType: 'audio/mp4', sizeBytes, durationSeconds, sha256, locale: 'pt-BR',
      }),
    });
    const uploadUrl = new URL(slot.uploadUrl);
    if (uploadUrl.protocol !== 'https:' || !uploadUrl.hostname.endsWith('.amazonaws.com'))
      throw new Error('O serviço não forneceu um destino seguro para o áudio.');
    const result = await expoFetch(slot.uploadUrl, {
      method: 'PUT', headers: { 'Content-Type': 'audio/mp4' }, body: file, signal,
    });
    if (!result.ok) throw new Error('Não foi possível enviar a gravação. Tente novamente.');
    return slot.audioId;
  }

  start(audioId: string, key: string): Promise<TranscriptionState> {
    return this.send('/transcriptions', {
      method: 'POST', headers: { 'Idempotency-Key': key },
      body: JSON.stringify({ audioId, locale: 'pt-BR' }),
    });
  }
  get(id: string): Promise<TranscriptionState> { return this.send('/transcriptions/' + encodeURIComponent(id)); }
  delete(id: string): Promise<void> { return this.send('/transcriptions/' + encodeURIComponent(id), { method: 'DELETE' }); }

  private async send<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
    let response: Response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      response = await fetch(this.baseUrl + '/api/v1' + path, {
        ...init, headers: { Accept: 'application/json', Authorization: 'Bearer ' + token,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
        signal: controller.signal, redirect: 'error',
      });
    } catch {
      throw new Error('Não foi possível acessar o Nomi Assistant. Confira sua conexão.');
    } finally { clearTimeout(timeout); }
    if (!response.ok) {
      if (response.status === 401) throw new Error('Sua sessão expirou. Entre novamente.');
      if (response.status === 410) throw new Error('A gravação expirou. Grave novamente.');
      if (response.status === 422) throw new Error('A gravação não pôde ser processada. Grave novamente.');
      if (response.status === 503) throw new Error('A transcrição está indisponível no momento. Tente novamente.');
      throw new Error('Não foi possível concluir a transcrição. Tente novamente.');
    }
    if (response.status === 204) return undefined as T;
    try { return await response.json() as T; }
    catch { throw new Error('O Nomi Assistant retornou uma resposta inválida.'); }
  }
}
