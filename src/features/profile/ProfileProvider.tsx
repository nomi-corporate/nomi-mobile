import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAcademic } from '@/features/academic/AcademicProvider';
import type { AcademicProfile, ProfilePatch } from '@/features/academic/infrastructure/AcademicClient';
import { useNomiTheme, type NomiThemeMode } from '@/theme/NomiThemeProvider';

type ProfileContextValue = {
  profile: AcademicProfile | null;
  loading: boolean;
  saving: boolean;
  error?: string;
  message?: string;
  reload(): Promise<void>;
  save(patch: ProfilePatch): Promise<boolean>;
  saveTheme(mode: NomiThemeMode): Promise<void>;
};
const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const client = useAcademic();
  const { setMode } = useNomiTheme();
  const [profile, setProfile] = useState<AcademicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const generation = useRef(0);
  const saveInFlight = useRef(false);

  const reload = useCallback(async () => {
    if (saveInFlight.current) return;
    const current = ++generation.current;
    setLoading(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const value = await client.getProfile();
      if (current !== generation.current) return;
      setProfile(value);
      setMode(value.theme);
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar seu perfil.');
    } finally { if (current === generation.current) setLoading(false); }
  }, [client, setMode]);

  useEffect(() => {
    void reload();
    return () => { ++generation.current; setMode('system'); };
  }, [reload, setMode]);

  const save = async (patch: ProfilePatch): Promise<boolean> => {
    if (!profile || loading || saveInFlight.current) return false;
    const current = generation.current;
    saveInFlight.current = true;
    setSaving(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const value = await client.updateProfile(profile.version, patch);
      if (current !== generation.current) return false;
      setProfile(value);
      setMode(value.theme);
      setMessage('Alterações salvas na sua conta.');
      return true;
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Não foi possível salvar seu perfil.');
      return false;
    } finally { saveInFlight.current = false; if (current === generation.current) setSaving(false); }
  };

  const saveTheme = async (mode: NomiThemeMode) => {
    if (!profile || loading || saveInFlight.current || mode === profile.theme) return;
    const current = generation.current;
    setMode(mode);
    if (!await save({ theme: mode }) && current === generation.current) setMode(profile.theme);
  };

  return <ProfileContext.Provider value={{ profile, loading, saving, error, message, reload, save, saveTheme }}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('ProfileProvider is required');
  return value;
}
export function useOptionalProfile() { return useContext(ProfileContext); }
