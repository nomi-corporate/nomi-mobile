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
} satisfies Record<string, TextStyle>;

export type NomiTextVariant = keyof typeof typography;
