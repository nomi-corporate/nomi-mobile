import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/tokens';

export type SectionLabelProps = {
  children: ReactNode;
};

export function SectionLabel({ children }: SectionLabelProps) {
  const { colors } = useNomiTheme();
  return (
    <Text
      accessibilityRole="header"
      style={[styles.label, { color: colors.muted }]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.sectionLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
