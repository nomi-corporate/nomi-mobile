import { ScrollView, StyleSheet } from 'react-native';
import { NomiCard, NomiText } from '@/components';
import { spacing } from '@/theme/tokens';

type Props = { title: string; description: string; detail: string };

/** Legacy starter view retained for any downstream route still importing it. */
export function StarterScreen({ title, description, detail }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <NomiText accessibilityRole="header" variant="display">{title}</NomiText>
      <NomiText variant="supporting" tone="muted">{description}</NomiText>
      <NomiCard style={styles.card}>
        <NomiText variant="heading">Estamos começando</NomiText>
        <NomiText variant="supporting" tone="muted">{detail}</NomiText>
      </NomiCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  card: { gap: spacing.sm, marginTop: spacing.md },
});
