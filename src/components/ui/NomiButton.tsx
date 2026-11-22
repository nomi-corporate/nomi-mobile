import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { palettes } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiText } from './NomiText';

export type NomiButtonVariant = 'primary' | 'secondary' | 'tertiary';

type Props = Omit<PressableProps, 'children' | 'accessibilityRole'> & {
  label: string;
  variant?: NomiButtonVariant;
  loading?: boolean;
  disabled?: boolean;
};

export function NomiButton({ label, variant = 'primary', loading = false, disabled = false, style, ...props }: Props) {
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const unavailable = disabled || loading;
  const primary = variant === 'primary';
  const tertiary = variant === 'tertiary';
  const backgroundColor = tertiary ? 'transparent' : unavailable ? colors.surface : primary ? colors.accent : colors.tint;
  const foregroundColor = loading ? colors.text : disabled ? colors.muted : primary ? colors.onAccent : tertiary ? colors.accent : colors.text;

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      style={(state) => [
        tertiary ? styles.tertiary : styles.button,
        { backgroundColor, opacity: state.pressed && !unavailable ? 0.86 : 1 },
        primary && !unavailable && styles.primaryShadow,
        unavailable && styles.unavailable,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foregroundColor} />
      ) : (
        <NomiText variant="label" style={{ color: foregroundColor, textAlign: 'center' }}>{label}</NomiText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 52, borderRadius: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  tertiary: { minHeight: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  primaryShadow: { shadowColor: '#543086', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  unavailable: { opacity: 0.78 },
});
