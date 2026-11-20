import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { borders, radii, sizes, spacing, typography } from '@/theme/tokens';

export type OptionCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  selected?: boolean;
  onPress?: () => void;
};

export function OptionCard({
  eyebrow,
  title,
  description,
  selected = false,
  onPress,
}: OptionCardProps) {
  const { colors } = useNomiTheme();
  const isInteractive = Boolean(onPress);

  const cardStyle = [
    styles.container,
    {
      backgroundColor: selected ? colors.tint : colors.surface,
      borderColor: selected ? colors.accent : colors.outline,
    },
  ];

  const content = (
    <>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>{eyebrow}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
    </>
  );

  if (!isInteractive) {
    return (
      <View
        accessible
        accessibilityLabel={`${eyebrow}. ${title}. ${description}`}
        style={cardStyle}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${eyebrow}. ${title}. ${description}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        ...cardStyle,
        pressed ? styles.pressed : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: sizes.optionCardHeight,
    paddingVertical: spacing.fieldVertical,
    paddingHorizontal: spacing.fieldHorizontal,
    borderRadius: radii.field,
    borderWidth: borders.width,
    justifyContent: 'center',
    gap: 4,
  },
  eyebrow: {
    ...typography.caption,
  },
  title: {
    ...typography.optionCardTitle,
  },
  description: {
    ...typography.caption,
  },
  pressed: {
    opacity: 0.85,
  },
});
