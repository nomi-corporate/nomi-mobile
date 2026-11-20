import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createNotificationPreferencesApiAdapter,
  NotificationPreferencesApiError,
  type NotificationPreferences,
  type NotificationPreferencesApiAdapter,
  type NotificationPreferencesFieldErrors,
  type UpdateNotificationPreferencesInput,
} from '@/features/notifications/api';

export type ReminderPreferencesStatus =
  | 'loading'
  | 'ready'
  | 'saving'
  | 'error'
  | 'conflict';

export type UseReminderPreferencesValue = {
  preferences: NotificationPreferences | null;
  etag: string | null;
  status: ReminderPreferencesStatus;
  isSimulated: boolean;
  errorMessage: string | null;
  fieldErrors: NotificationPreferencesFieldErrors;
  lastSavedMessage: string | null;
  reload: () => Promise<void>;
  savePreferences: (input: UpdateNotificationPreferencesInput) => Promise<boolean>;
  clearFeedback: () => void;
};

export function useReminderPreferences(
  adapter?: NotificationPreferencesApiAdapter
): UseReminderPreferencesValue {
  const api = useMemo(
    () => adapter ?? createNotificationPreferencesApiAdapter(),
    [adapter]
  );

  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [status, setStatus] = useState<ReminderPreferencesStatus>('loading');
  const [isSimulated, setIsSimulated] = useState<boolean>(api.isSimulated);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<NotificationPreferencesFieldErrors>({});
  const [lastSavedMessage, setLastSavedMessage] = useState<string | null>(null);

  const etagRef = useRef<string | null>(null);

  const reload = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);
    setFieldErrors({});
    try {
      const result = await api.getPreferences();
      setPreferences(result.preferences);
      setEtag(result.etag);
      etagRef.current = result.etag;
      setIsSimulated(result.simulated);
      setStatus('ready');
    } catch (error) {
      const message =
        error instanceof NotificationPreferencesApiError
          ? error.message
          : 'Não foi possível carregar as preferências de lembretes.';
      setErrorMessage(message);
      setStatus('error');
    }
  }, [api]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const clearFeedback = useCallback(() => {
    setErrorMessage(null);
    setFieldErrors({});
    setLastSavedMessage(null);
    if (status === 'conflict' && preferences) {
      setStatus('ready');
    }
  }, [preferences, status]);

  const savePreferences = useCallback(
    async (input: UpdateNotificationPreferencesInput): Promise<boolean> => {
      setErrorMessage(null);
      setFieldErrors({});
      setLastSavedMessage(null);

      const currentEtag = etagRef.current ?? etag ?? '';
      setStatus('saving');

      try {
        const result = await api.putPreferences(input, currentEtag);
        setPreferences(result.preferences);
        setEtag(result.etag);
        etagRef.current = result.etag;
        setIsSimulated(result.simulated);
        setStatus('ready');
        setLastSavedMessage(
          result.simulated
            ? 'Preferências confirmadas no adapter simulado (PUT /api/v1/notification-preferences com If-Match).'
            : 'Preferências de lembretes salvas com sucesso.'
        );
        return true;
      } catch (error) {
        if (error instanceof NotificationPreferencesApiError) {
          if (error.kind === 'validation') {
            setFieldErrors(error.fieldErrors ?? {});
            setErrorMessage(error.message);
            setStatus('ready');
            return false;
          }
          if (error.kind === 'conflict') {
            setErrorMessage(error.message);
            setStatus('conflict');
            return false;
          }
          setErrorMessage(error.message);
          setStatus(preferences ? 'ready' : 'error');
          return false;
        }
        setErrorMessage('Não foi possível salvar as preferências de lembretes.');
        setStatus(preferences ? 'ready' : 'error');
        return false;
      }
    },
    [api, etag, preferences]
  );

  return {
    preferences,
    etag,
    status,
    isSimulated,
    errorMessage,
    fieldErrors,
    lastSavedMessage,
    reload,
    savePreferences,
    clearFeedback,
  };
}
