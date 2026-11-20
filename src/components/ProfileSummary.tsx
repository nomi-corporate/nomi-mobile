import { Image, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { radii, sizes, spacing, typography } from '@/theme/tokens';

export type ProfileSummaryProps = {
  name: string;
  course?: string;
  term?: string;
  avatarUrl?: string;
};

export function ProfileSummary({ name, course, term, avatarUrl }: ProfileSummaryProps) {
  const { colors } = useNomiTheme();
  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={[name, course, term].filter(Boolean).join(', ')}
      style={[styles.card, { backgroundColor: colors.tint }]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatarImage}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Icon name="avatar" size={28} color={colors.onAccent} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        {course ? <Text style={[styles.course, { color: colors.muted }]}>{course}</Text> : null}
        {term ? <Text style={[styles.term, { color: colors.accent }]}>{term}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.profileCardPadding,
    gap: spacing.profileCardGap,
    borderRadius: radii.profileCard,
  },
  avatar: {
    width: sizes.avatar,
    height: sizes.avatar,
    borderRadius: sizes.avatar / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: sizes.avatar,
    height: sizes.avatar,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.profileName,
  },
  course: {
    ...typography.caption,
  },
  term: {
    ...typography.term,
  },
});
