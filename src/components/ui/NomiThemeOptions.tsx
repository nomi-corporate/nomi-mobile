import { Pressable, StyleSheet, View } from 'react-native';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme, type NomiThemeMode } from '@/theme/NomiThemeProvider';
import { NomiText } from './NomiText';
import { NomiButton } from './NomiButton';
import { useOptionalProfile } from '@/features/profile/ProfileProvider';

const options: Array<{ value: NomiThemeMode; label: string }> = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
];

export function NomiThemeOptions() {
  const { mode, colorScheme, setMode } = useNomiTheme();
  const colors = palettes[colorScheme];
  const account = useOptionalProfile();
  const disabled = !!account && (account.loading || account.saving || !account.profile);

  return <View style={styles.container}><View accessibilityRole="radiogroup" accessibilityLabel="Aparência do aplicativo" style={styles.options}>
    {options.map((option) => {
      const selected = mode === option.value;
      return <Pressable
        key={option.value}
        accessibilityRole="radio"
        accessibilityLabel={`Tema ${option.label}`}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={() => { if (account) void account.saveTheme(option.value); else setMode(option.value); }}
        style={[styles.option, {
          backgroundColor: selected ? colors.accent : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
        }]}
      >
        <NomiText variant="label" style={{ color: selected ? colors.onAccent : colors.text }}>{option.label}</NomiText>
      </Pressable>;
    })}
  </View>
    <NomiText variant="caption" tone="muted">{account?.saving ? 'Salvando preferência…' : account?.loading ? 'Carregando preferência…' : account?.profile ? 'Preferência salva na conta.' : account ? 'Carregue seu perfil para salvar a aparência.' : 'Prévia local da aparência.'}</NomiText>
    {account?.error ? <><NomiText variant="caption" tone="error">{account.error}</NomiText><NomiButton label="Recarregar preferências" variant="tertiary" onPress={() => void account.reload()} disabled={disabled && account.loading} /></> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  options: { flexDirection: 'row', gap: spacing.xs },
  option: { minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: spacing.xs },
});
