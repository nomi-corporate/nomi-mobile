import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { palettes } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiText } from './NomiText';

type Props = Omit<PressableProps, 'children' | 'accessibilityRole'> & {
  title: string;
  detail?: string;
  /** Hide the chevron for rows that do not navigate. */
  chevron?: boolean;
};

/** Figma "Aparência" / "Privacidade" row (09.01): 64 px, radius 22, 2 px border, chevron. */
export function NomiListRow({ title, detail, chevron = true, disabled, style, accessibilityLabel, ...props }: Props) {
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  return (
    <Pressable
      {...props}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (detail ? `${title}. ${detail}` : title)}
      accessibilityState={{ disabled: !!disabled }}
      style={(state) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: disabled ? 0.58 : state.pressed ? 0.86 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <View style={styles.copy}>
        <NomiText variant="label">{title}</NomiText>
        {detail ? <NomiText variant="detail" tone="muted">{detail}</NomiText> : null}
      </View>
      {chevron ? <NomiText variant="heading" tone="muted" accessibilityElementsHidden importantForAccessibility="no">›</NomiText> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 2, borderRadius: 22 },
  copy: { flex: 1, gap: 3 },
});
