import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { radii, shadows, sizes, spacing, typography } from '@/theme/tokens';

export type NavTabKey = 'index' | 'agenda' | 'groups' | 'menu';

type TabDefinition = {
  key: NavTabKey;
  label: string;
  icon: IconName;
};

const TABS: readonly TabDefinition[] = [
  { key: 'index', label: 'Hoje', icon: 'home' },
  { key: 'agenda', label: 'Agenda', icon: 'calendar' },
  { key: 'groups', label: 'Grupos', icon: 'group' },
  { key: 'menu', label: 'Menu', icon: 'menu' },
] as const;

export type MainNavBarTabBarProps = {
  state?: {
    index: number;
    routes: Array<{ key: string; name: string }>;
  };
  navigation?: {
    navigate: (name: string) => void;
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: boolean;
    }) => { defaultPrevented: boolean };
  };
  activeTab?: NavTabKey;
  onSelectTab?: (tab: NavTabKey) => void;
};

function normalizeRouteName(name: string): NavTabKey {
  if (name === 'agenda' || name.startsWith('agenda/')) return 'agenda';
  if (name === 'groups' || name.startsWith('groups/')) return 'groups';
  if (name === 'menu' || name.startsWith('menu/')) return 'menu';
  return 'index';
}

export function MainNavBar({
  state,
  navigation,
  activeTab,
  onSelectTab,
}: MainNavBarTabBarProps) {
  const { colors } = useNomiTheme();

  const currentRoute = state?.routes[state.index];
  const resolvedActiveTab: NavTabKey =
    activeTab ?? (currentRoute ? normalizeRouteName(currentRoute.name) : 'index');

  const handlePress = (tabKey: NavTabKey) => {
    if (onSelectTab) {
      onSelectTab(tabKey);
      return;
    }
    if (!state || !navigation) {
      return;
    }
    const targetRoute = state.routes.find(
      (route) => normalizeRouteName(route.name) === tabKey
    );
    if (!targetRoute) {
      navigation.navigate(tabKey);
      return;
    }
    const event = navigation.emit({
      type: 'tabPress',
      target: targetRoute.key,
      canPreventDefault: true,
    });
    if (resolvedActiveTab !== tabKey && !event.defaultPrevented) {
      navigation.navigate(targetRoute.name);
    }
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bg }]}>
      <View
        accessibilityRole="tablist"
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface,
            shadowColor: '#000000',
          },
        ]}
      >
        {TABS.map((tab) => {
          const isSelected = resolvedActiveTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isSelected }}
              onPress={() => handlePress(tab.key)}
              style={({ pressed }) => [
                styles.item,
                isSelected ? { backgroundColor: colors.tint } : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Icon
                name={tab.icon}
                size={sizes.barIcon}
                color={colors.accent}
              />
              <Text
                style={[
                  isSelected ? styles.activeLabel : styles.inactiveLabel,
                  { color: isSelected ? colors.accent : colors.muted },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.bottomBar,
    padding: 6,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: shadows.bottomBar.offsetY },
        shadowOpacity: 0.08,
        shadowRadius: shadows.bottomBar.blur,
      },
      android: {
        elevation: 4,
      },
      default: {
        boxShadow: `0px ${shadows.bottomBar.offsetY}px ${shadows.bottomBar.blur}px ${shadows.bottomBar.color}`,
      },
    }),
  },
  item: {
    flex: 1,
    minHeight: sizes.touchTarget,
    borderRadius: radii.barItem,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  inactiveLabel: {
    ...typography.tabLabel,
  },
  activeLabel: {
    ...typography.tabLabelActive,
  },
  pressed: {
    opacity: 0.8,
  },
});
