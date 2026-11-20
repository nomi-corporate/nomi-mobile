import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  createProfileApiAdapter,
  ProfileApiError,
  type PatchProfileInput,
  type ProfileApiAdapter,
  type UserProfile,
} from '@/features/profile/api';
import { useNomiTheme } from '@/theme/ThemeProvider';

export type ProfileStatus = 'loading' | 'ready' | 'saving' | 'error' | 'conflict';

export type UseProfileValue = {
  profile: UserProfile | null;
  etag: string | null;
  status: ProfileStatus;
  isSimulated: boolean;
  errorMessage: string | null;
  fieldErrors: Partial<Record<keyof PatchProfileInput, string>>;
  lastSavedMessage: string | null;
  reload: () => Promise<void>;
  updateProfile: (input: PatchProfileInput) => Promise<boolean>;
  clearFeedback: () => void;
};

const ProfileContext = createContext<UseProfileValue | null>(null);

type ProfileProviderProps = {
  adapter?: ProfileApiAdapter;
  children: ReactNode;
};

export function ProfileProvider({ adapter, children }: ProfileProviderProps) {
  const api = useMemo(() => adapter ?? createProfileApiAdapter(), [adapter]);
  const { setPreference } = useNomiTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [status, setStatus] = useState<ProfileStatus>('loading');
  const [isSimulated, setIsSimulated] = useState<boolean>(api.isSimulated);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof PatchProfileInput, string>>
  >({});
  const [lastSavedMessage, setLastSavedMessage] = useState<string | null>(null);

  const etagRef = useRef<string | null>(null);

  const reload = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);
    setFieldErrors({});
    try {
      const result = await api.getMe();
      setProfile(result.profile);
      setEtag(result.etag);
      etagRef.current = result.etag;
      setIsSimulated(result.simulated);
      setPreference(result.profile.theme);
      setStatus('ready');
    } catch (error) {
      const message =
        error instanceof ProfileApiError
          ? error.message
          : 'Não foi possível carregar os dados do perfil.';
      setErrorMessage(message);
      setStatus('error');
    }
  }, [api, setPreference]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const clearFeedback = useCallback(() => {
    setErrorMessage(null);
    setFieldErrors({});
    setLastSavedMessage(null);
    if (status === 'conflict' && profile) {
      setStatus('ready');
    }
  }, [profile, status]);

  const updateProfile = useCallback(
    async (input: PatchProfileInput): Promise<boolean> => {
      setErrorMessage(null);
      setFieldErrors({});
      setLastSavedMessage(null);

      const currentEtag = etagRef.current ?? etag ?? '';
      setStatus('saving');

      try {
        const result = await api.patchMe(input, currentEtag);
        setProfile(result.profile);
        setEtag(result.etag);
        etagRef.current = result.etag;
        setIsSimulated(result.simulated);
        if (input.theme !== undefined) {
          setPreference(result.profile.theme);
        }
        setStatus('ready');
        setLastSavedMessage(
          result.simulated
            ? 'Alterações confirmadas no adapter simulado (ETag atualizado).'
            : 'Alterações salvas com sucesso.'
        );
        return true;
      } catch (error) {
        if (error instanceof ProfileApiError) {
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
          setStatus(profile ? 'ready' : 'error');
          return false;
        }
        setErrorMessage('Não foi possível salvar as alterações do perfil.');
        setStatus(profile ? 'ready' : 'error');
        return false;
      }
    },
    [api, etag, profile, setPreference]
  );

  const value = useMemo<UseProfileValue>(
    () => ({
      profile,
      etag,
      status,
      isSimulated,
      errorMessage,
      fieldErrors,
      lastSavedMessage,
      reload,
      updateProfile,
      clearFeedback,
    }),
    [
      clearFeedback,
      errorMessage,
      etag,
      fieldErrors,
      isSimulated,
      lastSavedMessage,
      profile,
      reload,
      status,
      updateProfile,
    ]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): UseProfileValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile deve ser utilizado dentro de um ProfileProvider.');
  }
  return context;
}
