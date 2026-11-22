import type { TextStyle } from 'react-native';

export const fontFamilies = {
  display: 'Baloo 2',
  text: 'Nunito Sans',
} as const;

export const typography = {
  display: { fontFamily: fontFamilies.display, fontWeight: '700', fontSize: 32, lineHeight: 42 },
  title: { fontFamily: fontFamilies.display, fontWeight: '700', fontSize: 22, lineHeight: 29 },
  heading: { fontFamily: fontFamilies.display, fontWeight: '700', fontSize: 18, lineHeight: 23 },
  body: { fontFamily: fontFamilies.text, fontWeight: '400', fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fontFamilies.text, fontWeight: '400', fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fontFamilies.text, fontWeight: '700', fontSize: 14, lineHeight: 18 },
  supporting: { fontFamily: fontFamilies.text, fontWeight: '400', fontSize: 14, lineHeight: 18 },
  navigation: { fontFamily: fontFamilies.text, fontWeight: '400', fontSize: 10, lineHeight: 13 },
  /** Section labels such as "DADOS DA CONTA" (Figma: Nunito Sans Bold 10). */
  overline: { fontFamily: fontFamilies.text, fontWeight: '700', fontSize: 10, lineHeight: 13, letterSpacing: 0.4, textTransform: 'uppercase' },
  /** Secondary line inside rows and the profile card (Figma: Nunito Sans 11). */
  detail: { fontFamily: fontFamilies.text, fontWeight: '400', fontSize: 11, lineHeight: 14 },
} satisfies Record<string, TextStyle>;

export type NomiTextVariant = keyof typeof typography;
