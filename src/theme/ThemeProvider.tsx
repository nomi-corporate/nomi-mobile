import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import {
  borders,
  fontFamilies,
  palettes,
  radii,
  shadows,
  sizes,
  spacing,
  typography,
  type ThemeColors,
  type ThemeMode,
  type ThemePreference,
} from '@/theme/tokens';

export type NomiThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  radii: typeof radii;
  spacing: typeof spacing;
  borders: typeof borders;
  sizes: typeof sizes;
  shadows: typeof shadows;
  fontFamilies: typeof fontFamilies;
  typography: typeof typography;
};

const NomiThemeContext = createContext<NomiThemeContextValue | null>(null);

type ThemeProviderProps = {
  initialPreference?: ThemePreference;
  children: ReactNode;
};

export function ThemeProvider({ initialPreference = 'system', children }: ThemeProviderProps) {
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);
  const systemScheme = useColorScheme();
  const mode: ThemeMode =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<NomiThemeContextValue>(
    () => ({
      preference,
      setPreference,
      mode,
      isDark: mode === 'dark',
      colors: palettes[mode],
      radii,
      spacing,
      borders,
      sizes,
      shadows,
      fontFamilies,
      typography,
    }),
    [mode, preference]
  );

  return <NomiThemeContext.Provider value={value}>{children}</NomiThemeContext.Provider>;
}

export function useNomiTheme(): NomiThemeContextValue {
  const context = useContext(NomiThemeContext);
  const systemScheme = useColorScheme();
  if (context) {
    return context;
  }
  const fallbackMode: ThemeMode = systemScheme === 'dark' ? 'dark' : 'light';
  return {
    preference: 'system',
    setPreference: () => {},
    mode: fallbackMode,
    isDark: fallbackMode === 'dark',
    colors: palettes[fallbackMode],
    radii,
    spacing,
    borders,
    sizes,
    shadows,
    fontFamilies,
    typography,
  };
}
