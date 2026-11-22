import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { palettes } from '@/theme/tokens';
import { NomiText } from './NomiText';
import { useNomiTheme } from '@/theme/NomiThemeProvider';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextInputProps['style'];
  /** Permanently read-only data (e.g. e-mail): full contrast, as in Figma, instead of the dimmed disabled look. */
  readOnly?: boolean;
};

export function NomiTextField({ label, error, containerStyle, inputStyle, placeholder, readOnly = false, ...inputProps }: Props) {
  const [focused, setFocused] = useState(false);
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const editable = !readOnly && inputProps.editable !== false;
  return (
    <View style={containerStyle}>
      <View style={[styles.field, { backgroundColor: colors.surface, borderColor: error ? colors.error : focused ? colors.accent : colors.border, opacity: editable || readOnly ? 1 : 0.64 }]}>
        <NomiText variant="caption" tone="accent" style={styles.label}>{label.toLocaleUpperCase('pt-BR')}</NomiText>
        <TextInput
          {...inputProps}
          editable={editable}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          accessibilityHint={error ?? inputProps.accessibilityHint}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          onFocus={(event) => { setFocused(true); inputProps.onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); inputProps.onBlur?.(event); }}
          style={[styles.input, { color: colors.text }, inputStyle]}
        />
      </View>
      {error ? <NomiText variant="caption" tone="error" style={styles.error} accessibilityLiveRegion="polite">{error}</NomiText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { minHeight: 72, borderWidth: 2, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 6, justifyContent: 'center' },
  label: { lineHeight: 16 },
  input: { minHeight: 20, padding: 0, fontFamily: 'Nunito Sans', fontSize: 15, lineHeight: 20 },
  error: { marginTop: 4, marginHorizontal: 2 },
});
