import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { palettes } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiText } from './NomiText';

type Props = Omit<PressableProps, 'children' | 'accessibilityRole'> & {
  eyebrow: string;
  title: string;
  detail?: string;
  /** When set, the card behaves as a radio option. */
  selected?: boolean;
};

/**
 * Figma card with eyebrow, Baloo title and detail (09.03 Configurações, 09.04 Aparência,
 * 09.05 Privacidade). Without onPress it renders as static information.
 */
export function NomiOptionCard({ eyebrow, title, detail, selected, onPress, disabled, style, accessibilityLabel, ...props }: Props) {
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const isRadio = selected !== undefined;
  const interactive = !!onPress;
  const label = accessibilityLabel ?? [title, detail].filter(Boolean).join('. ');
  const content = <>
    <NomiText variant="caption" tone="accent">{eyebrow}</NomiText>
    <NomiText variant="heading">{title}</NomiText>
    {detail ? <NomiText variant="detail" tone="muted">{detail}</NomiText> : null}
  </>;
  const base = [styles.card, {
    backgroundColor: selected ? colors.tint : colors.surface,
    borderColor: selected ? colors.accent : colors.border,
  }];

  if (!interactive) {
    return <View accessible accessibilityLabel={label} style={[base, disabled && styles.disabled, typeof style === 'function' ? undefined : style]}>{content}</View>;
  }
  return (
    <Pressable
      {...props}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={isRadio ? 'radio' : 'button'}
      accessibilityLabel={label}
      accessibilityState={isRadio ? { selected, disabled: !!disabled } : { disabled: !!disabled }}
      style={(state) => [base, disabled && styles.disabled, state.pressed && styles.pressed, typeof style === 'function' ? style(state) : style]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 2, borderRadius: 22 },
  disabled: { opacity: 0.58 },
  pressed: { opacity: 0.86 },
});
