import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import type { NomiTheme } from './tokens';

export type NomiThemeMode = NomiTheme | 'system';

type NomiThemeContextValue = {
  mode: NomiThemeMode;
  colorScheme: NomiTheme;
  setMode: (mode: NomiThemeMode) => void;
};

const NomiThemeContext = createContext<NomiThemeContextValue>({
  mode: 'system',
  colorScheme: 'light',
  setMode: () => undefined,
});

export function NomiThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<NomiThemeMode>('system');
  const colorScheme: NomiTheme = mode === 'system' ? systemScheme === 'dark' ? 'dark' : 'light' : mode;
  const value = useMemo(() => ({ mode, colorScheme, setMode }), [mode, colorScheme]);

  return <NomiThemeContext.Provider value={value}>{children}</NomiThemeContext.Provider>;
}

export function useNomiTheme() {
  return useContext(NomiThemeContext);
}
