export const palettes = {
  light: {
    bg: '#FFFFFF',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#281B37',
    muted: '#5C506A',
    accent: '#7749B8',
    tint: '#F0E2FF',
    outline: '#E7DFF0',
    border: '#E7DFF0',
    onAccent: '#FFFFFF',
    primaryButtonShadow: '#543086',
  },
  dark: {
    bg: '#17101F',
    background: '#17101F',
    surface: '#261A34',
    text: '#FFF8FF',
    muted: '#DCC9E7',
    accent: '#C5A0F0',
    tint: '#342047',
    outline: '#493357',
    border: '#493357',
    onAccent: '#281B37',
    primaryButtonShadow: '#5F398C',
  },
} as const;

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = 'system' | ThemeMode;
export type ThemeColors = (typeof palettes)[ThemeMode];

export const radii = {
  frame: 32,
  profileCard: 24,
  navRow: 22,
  bottomBar: 20,
  field: 18,
  notificationButton: 18,
  button: 16,
  barItem: 12,
} as const;

export const spacing = {
  xs: 6,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  screenPadding: 24,
  blockGap: 14,
  fieldVertical: 14,
  fieldHorizontal: 16,
  fieldGap: 6,
  navRowPadding: 12,
  navRowGap: 12,
  profileCardPadding: 16,
  profileCardGap: 16,
} as const;

export const borders = {
  width: 2,
} as const;

export const sizes = {
  buttonHeight: 52,
  fieldHeight: 72,
  navRowHeight: 64,
  optionCardHeight: 96,
  avatar: 64,
  touchTarget: 44,
  headerIcon: 22,
  barIcon: 20,
} as const;

export const shadows = {
  primaryButtonOffsetY: 5,
  bottomBar: {
    color: '#00000014',
    offsetY: 4,
    blur: 12,
  },
} as const;

export const fontFamilies = {
  displayBold: 'Baloo2_700Bold',
  sansRegular: 'NunitoSans_400Regular',
  sansBold: 'NunitoSans_700Bold',
} as const;

const lineHeight = (size: number) => Math.round(size * 1.3);

export const typography = {
  profileName: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 23,
    lineHeight: lineHeight(23),
  },
  headerTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 22,
    lineHeight: lineHeight(22),
  },
  optionCardTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 20,
    lineHeight: lineHeight(20),
  },
  fieldValue: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 15,
    lineHeight: lineHeight(15),
  },
  button: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    lineHeight: lineHeight(14),
  },
  navRowTitle: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    lineHeight: lineHeight(14),
  },
  signOut: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 13,
    lineHeight: lineHeight(13),
  },
  caption: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 12,
    lineHeight: lineHeight(12),
  },
  term: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    lineHeight: lineHeight(11),
  },
  navRowSubtitle: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 11,
    lineHeight: lineHeight(11),
  },
  sectionLabel: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 10,
    lineHeight: lineHeight(10),
  },
  tabLabel: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 10,
    lineHeight: lineHeight(10),
  },
  tabLabelActive: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 10,
    lineHeight: lineHeight(10),
  },
} as const;
