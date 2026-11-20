import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { borders, radii, sizes, spacing, typography } from '@/theme/tokens';

export type FieldProps = {
  label: string;
  value: string;
  readOnly?: boolean;
  onChangeText?: (text: string) => void;
  error?: string;
  placeholder?: string;
};

export function Field({
  label,
  value,
  readOnly = false,
  onChangeText,
  error,
  placeholder,
}: FieldProps) {
  const { colors } = useNomiTheme();
  const isEditable = !readOnly && Boolean(onChangeText);

  return (
    <View style={styles.wrapper}>
      <View
        accessible={!isEditable}
        accessibilityLabel={!isEditable ? `${label}: ${value}` : undefined}
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.accent : colors.outline,
          },
        ]}
      >
        <Text style={[styles.label, { color: colors.accent }]}>{label}</Text>
        {isEditable ? (
          <TextInput
            accessibilityLabel={label}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text }]}
          />
        ) : (
          <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
        )}
      </View>
      {error ? (
        <Text
          accessibilityRole="alert"
          style={[styles.error, { color: colors.accent }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
  },
  container: {
    minHeight: sizes.fieldHeight,
    paddingVertical: spacing.fieldVertical,
    paddingHorizontal: spacing.fieldHorizontal,
    gap: spacing.fieldGap,
    borderRadius: radii.field,
    borderWidth: borders.width,
    justifyContent: 'center',
  },
  label: {
    ...typography.caption,
    textTransform: 'uppercase',
  },
  value: {
    ...typography.fieldValue,
  },
  input: {
    ...typography.fieldValue,
    padding: 0,
    margin: 0,
  },
  error: {
    ...typography.caption,
    paddingHorizontal: spacing.xs,
  },
});
