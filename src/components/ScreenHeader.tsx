import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { radii, sizes, spacing, typography } from '@/theme/tokens';

export type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  showNotifications?: boolean;
  onNotificationsPress?: () => void;
};

export function ScreenHeader({
  title,
  onBack,
  showNotifications = false,
  onNotificationsPress,
}: ScreenHeaderProps) {
  const { colors, isDark } = useNomiTheme();

  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={onBack}
            hitSlop={8}
            style={({ pressed }) => [
              styles.touchTarget,
              pressed ? styles.pressed : null,
            ]}
          >
            <Icon name="back" size={sizes.headerIcon} color={colors.accent} />
          </Pressable>
        ) : null}
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          {title}
        </Text>
      </View>

      {showNotifications ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notificações"
          onPress={onNotificationsPress}
          hitSlop={8}
          style={({ pressed }) => [
            styles.notificationButton,
            { backgroundColor: isDark ? colors.surface : 'transparent' },
            pressed ? styles.pressed : null,
          ]}
        >
          <Icon name="bell" size={sizes.headerIcon} color={colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: sizes.touchTarget,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  touchTarget: {
    minWidth: sizes.touchTarget,
    minHeight: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  title: {
    ...typography.headerTitle,
    flexShrink: 1,
  },
  notificationButton: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    borderRadius: radii.notificationButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
