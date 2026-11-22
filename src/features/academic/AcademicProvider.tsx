import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { AcademicClient } from './infrastructure/AcademicClient';
import { loadAcademicApiUrl } from './config';

const AcademicContext = createContext<AcademicClient | null>(null);

export function AcademicProvider({ children }: { children: ReactNode }) {
  const { getAccessToken, expireSession } = useAuth();
  const client = useMemo(() => {
    try {
      return new AcademicClient(loadAcademicApiUrl(), getAccessToken, fetch, undefined, expireSession);
    } catch {
      return null;
    }
  }, [getAccessToken, expireSession]);
  return <AcademicContext.Provider value={client}>{children}</AcademicContext.Provider>;
}

export function useAcademic(): AcademicClient {
  const client = useContext(AcademicContext);
  if (!client) throw new Error('Academic API não configurada neste ambiente.');
  return client;
}
