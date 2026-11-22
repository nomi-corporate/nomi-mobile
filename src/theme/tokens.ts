export const palettes = {
  light: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#281B37',
    muted: '#5C506A',
    accent: '#7749B8',
    tint: '#F0E2FF',
    onAccent: '#FFFFFF',
    border: '#E7DFF0',
    error: '#AC3D56',
    errorBackground: '#FBECEF',
    success: '#246B4B',
    successBackground: '#E7F9EF',
  },
  dark: {
    background: '#17101F',
    surface: '#261A34',
    text: '#FFF8FF',
    muted: '#DCC9E7',
    accent: '#C5A0F0',
    tint: '#342047',
    onAccent: '#281B37',
    border: '#493357',
    error: '#FFB3C3',
    errorBackground: '#3A202C',
    success: '#CFF4E0',
    successBackground: '#203A30',
  },
} as const;

export type NomiTheme = keyof typeof palettes;
export type NomiPalette = (typeof palettes)[NomiTheme];

export const spacing = {
  xs: 4,
  sm: 8,
  gap: 12,
  md: 16,
  padding: 20,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  field: 18,
  card: 20,
  surface: 22,
  button: 16,
  figmaButtonToken: 19,
} as const;

export const mascotPalette = {
  body: '#A882D0',
  fin: '#8453B0',
  spot: '#8151AD',
  ink: '#3D1C50',
  cream: '#F9E8DF',
  white: '#FFFDFC',
  yellow: '#FFCC43',
  mint: '#B2F2C8',
  pink: '#DF79AC',
  lavender: '#BA9AF5',
  peach: '#FFD9BE',
  brandMint: '#B8EFC6',
} as const;

// These are the values in the Figma component itself. The file's standalone
// buttonRadius variable is 19px, while its button variants render at 16px.
export const geometry = { gap: 12, padding: 20, radius: 22, buttonRadiusVariable: 19 } as const;
