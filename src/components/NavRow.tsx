import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { borders, radii, sizes, spacing, typography } from '@/theme/tokens';

export type NavRowProps = {
  title: string;
  subtitle: string;
  onPress?: () => void;
};

export function NavRow({ title, subtitle, onPress }: NavRowProps) {
  const { colors } = useNomiTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.outline,
        },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.textGroup}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
      </View>
      <Icon name="chevronRight" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: sizes.navRowHeight,
    paddingVertical: spacing.navRowPadding,
    paddingHorizontal: spacing.fieldHorizontal,
    gap: spacing.navRowGap,
    borderRadius: radii.navRow,
    borderWidth: borders.width,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.navRowTitle,
  },
  subtitle: {
    ...typography.navRowSubtitle,
  },
  pressed: {
    opacity: 0.8,
  },
});
