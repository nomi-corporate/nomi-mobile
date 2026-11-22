import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { palettes } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiText } from './NomiText';
import EmptyLight from '../../assets/design-system/feedback-empty-light.svg';
import EmptyDark from '../../assets/design-system/feedback-empty-dark.svg';
import SuccessLight from '../../assets/design-system/feedback-success-light.svg';
import SuccessDark from '../../assets/design-system/feedback-success-dark.svg';

export type NomiFeedbackKind = 'loading' | 'empty' | 'success' | 'error';

const illustrations = {
  empty: [EmptyLight, EmptyDark],
  success: [SuccessLight, SuccessDark],
} as const;

type Props = { kind: NomiFeedbackKind; title: string; message: string; testID?: string };

export function NomiFeedback({ kind, title, message, testID }: Props) {
  const { colorScheme } = useNomiTheme();
  const dark = colorScheme === 'dark';
  const colors = palettes[colorScheme];
  const Illustration = kind === 'empty'
    ? illustrations.empty[dark ? 1 : 0]
    : kind === 'success'
      ? illustrations.success[dark ? 1 : 0]
      : null;
  const background = kind === 'loading' ? colors.tint : kind === 'success' ? colors.successBackground : kind === 'error' ? colors.errorBackground : colors.surface;
  const tone = kind === 'success' ? 'success' : kind === 'error' ? 'error' : 'text';
  return (
    <View testID={testID} accessibilityRole="summary" style={[styles.card, { backgroundColor: background }]}>
      <View style={styles.icon}>
        {kind === 'loading' ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : kind === 'error' ? (
          <View style={[styles.errorIcon, { borderColor: colors.error }]}>
            <NomiText variant="label" tone="error" style={styles.errorMark}>!</NomiText>
          </View>
        ) : (
          Illustration ? <Illustration width={32} height={32} preserveAspectRatio="xMidYMid meet" accessibilityLabel="" /> : null
        )}
      </View>
      <NomiText variant="heading" tone={tone}>{title}</NomiText>
      <NomiText variant="supporting" tone="muted">{message}</NomiText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 440, minHeight: 214, borderRadius: 20, padding: 20, gap: 12, alignItems: 'flex-start' },
  icon: { width: 32, height: 32, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  errorIcon: { width: 26, height: 26, borderWidth: 2, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  errorMark: { lineHeight: 18 },
});
