import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { radii, shadows, sizes, spacing, typography } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary';

export type ButtonProps = {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  onPress,
}: ButtonProps) {
  const { colors } = useNomiTheme();
  const isInteractive = !disabled && !loading;
  const isPrimary = variant === 'primary';

  const backgroundColor = isPrimary ? colors.accent : colors.tint;
  const textColor = isPrimary ? colors.onAccent : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      disabled={!isInteractive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.outer,
        isPrimary
          ? {
              backgroundColor: colors.primaryButtonShadow,
              paddingBottom: shadows.primaryButtonOffsetY,
            }
          : null,
        !isInteractive ? styles.disabled : null,
        pressed && isInteractive ? styles.pressed : null,
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            backgroundColor,
            minHeight: isPrimary
              ? sizes.buttonHeight - shadows.primaryButtonOffsetY
              : sizes.buttonHeight,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : null}
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    minHeight: sizes.buttonHeight,
    borderRadius: radii.button,
  },
  inner: {
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.button,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.88,
  },
});
