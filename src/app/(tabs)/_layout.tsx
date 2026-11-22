import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palettes } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiTabIcon } from '@/components/ui/NomiTabIcon';
import { ProfileProvider } from '@/features/profile/ProfileProvider';

export default function TabsLayout() {
  const { colorScheme } = useNomiTheme();
  const insets = useSafeAreaInsets();
  const colors = palettes[colorScheme];
  return <ProfileProvider><Tabs screenOptions={{
    headerShown: false,
    sceneStyle: { backgroundColor: colors.background },
    tabBarStyle: {
      position: 'absolute',
      left: 24,
      right: 24,
      bottom: Math.max(insets.bottom, 12),
      height: 60,
      borderTopWidth: 0,
      borderRadius: 20,
      backgroundColor: colors.surface,
      paddingTop: 0,
      paddingBottom: 0,
      elevation: 6,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: colorScheme === 'dark' ? 0.22 : 0.08,
      shadowRadius: 12,
    },
    tabBarItemStyle: { borderRadius: 12, margin: 8 },
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.muted,
    tabBarActiveBackgroundColor: colors.tint,
    tabBarInactiveBackgroundColor: colors.surface,
    tabBarIconStyle: { marginTop: 0 },
    tabBarLabelStyle: { fontFamily: 'Nunito Sans', fontSize: 10, lineHeight: 13, marginBottom: 0 },
    tabBarHideOnKeyboard: true,
  }}>
    <Tabs.Screen name="index" options={{ title: 'Hoje', tabBarLabel: 'Hoje', tabBarIcon: ({ color }) => <NomiTabIcon name="home" color={color} /> }} />
    <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarLabel: 'Agenda', tabBarIcon: ({ color }) => <NomiTabIcon name="calendar" color={color} /> }} />
    <Tabs.Screen name="groups" options={{ title: 'Grupos', tabBarLabel: 'Grupos', tabBarIcon: ({ color }) => <NomiTabIcon name="group" color={color} /> }} />
    <Tabs.Screen name="menu" options={{ title: 'Menu', tabBarLabel: 'Menu', tabBarIcon: ({ color }) => <NomiTabIcon name="menu" color={color} /> }} />
  </Tabs></ProfileProvider>;
}
