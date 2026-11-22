import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { palettes } from '@/theme/tokens';
import { NomiText } from './NomiText';
import { NomiSubjectIcon, type NomiSubject } from './NomiSubjectIcon';
import { useNomiTheme } from '@/theme/NomiThemeProvider';

type Props = Omit<PressableProps, 'children'> & {
  eyebrow: string;
  title: string;
  detail?: string;
  subject?: NomiSubject;
};

export function NomiAgendaItem({ eyebrow, title, detail, subject, style, ...props }: Props) {
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const content = (
    <>
      <NomiText variant="caption" tone="accent" numberOfLines={1}>{eyebrow}</NomiText>
      <NomiText variant="heading" numberOfLines={1} style={subject ? styles.withIcon : undefined}>{title}</NomiText>
      {detail ? <NomiText variant="caption" tone="muted" numberOfLines={1}>{detail}</NomiText> : null}
      {subject ? <NomiSubjectIcon subject={subject} style={styles.icon} /> : null}
    </>
  );
  const containerStyle = [styles.item, { backgroundColor: colors.surface, borderColor: colors.border }, typeof style === 'function' ? undefined : style];
  if (!props.onPress) return <View style={containerStyle}>{content}</View>;
  return <Pressable {...props} accessibilityRole="button" style={(state) => [...containerStyle, state.pressed && styles.pressed, typeof style === 'function' ? style(state) : undefined]}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  item: { minHeight: 96, borderWidth: 2, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 16, justifyContent: 'center', gap: 2 },
  withIcon: { paddingRight: 34 },
  icon: { position: 'absolute', top: 12, right: 14 },
  pressed: { opacity: 0.86 },
});
