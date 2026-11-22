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
};

export function NomiTextField({ label, error, containerStyle, inputStyle, placeholder, ...inputProps }: Props) {
  const [focused, setFocused] = useState(false);
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const editable = inputProps.editable !== false;
  return (
    <View style={containerStyle}>
      <View style={[styles.field, { backgroundColor: colors.surface, borderColor: error ? colors.error : focused ? colors.accent : colors.border, opacity: editable ? 1 : 0.64 }]}>
        <NomiText variant="caption" tone="accent" style={styles.label}>{label.toLocaleUpperCase('pt-BR')}</NomiText>
        <TextInput
          {...inputProps}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          onFocus={(event) => { setFocused(true); inputProps.onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); inputProps.onBlur?.(event); }}
          style={[styles.input, { color: colors.text }, inputStyle]}
        />
      </View>
      {error ? <NomiText variant="caption" tone="error" style={styles.error}>{error}</NomiText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { minHeight: 72, borderWidth: 2, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 6, justifyContent: 'center' },
  label: { lineHeight: 16 },
  input: { minHeight: 20, padding: 0, fontFamily: 'Nunito Sans', fontSize: 15, lineHeight: 20 },
  error: { marginTop: 4, marginHorizontal: 2 },
});
