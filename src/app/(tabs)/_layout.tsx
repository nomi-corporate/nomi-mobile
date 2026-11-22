import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palettes } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiTabIcon } from '@/components/ui/NomiTabIcon';
import { NomiTabBarButton } from '@/components/ui/NomiTabBarButton';
import { ProfileProvider } from '@/features/profile/ProfileProvider';

export default function TabsLayout() {
  const { colorScheme } = useNomiTheme();
  const insets = useSafeAreaInsets();
  const colors = palettes[colorScheme];
  return <ProfileProvider><Tabs screenOptions={{
    headerShown: false,
    sceneStyle: { backgroundColor: colors.background },
    // Docked to the bottom edge (full width, above the system navigation area) instead of floating.
    tabBarStyle: {
      height: 64 + insets.bottom,
      paddingTop: 6,
      paddingBottom: Math.max(insets.bottom, 6),
      paddingHorizontal: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      elevation: 8,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: colorScheme === 'dark' ? 0.24 : 0.06,
      shadowRadius: 8,
    },
    tabBarButton: (props) => <NomiTabBarButton {...props} />,
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.muted,
    tabBarIconStyle: { marginTop: 0 },
    tabBarLabelStyle: { fontFamily: 'Nunito Sans', fontSize: 10, lineHeight: 13, marginBottom: 0 },
    // Screens slide and fade between tabs (respects the system reduced-motion setting).
    animation: 'shift',
    tabBarHideOnKeyboard: true,
  }}>
    <Tabs.Screen name="index" options={{ title: 'Hoje', tabBarLabel: 'Hoje', tabBarIcon: ({ color }) => <NomiTabIcon name="home" color={color} /> }} />
    <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarLabel: 'Agenda', tabBarIcon: ({ color }) => <NomiTabIcon name="calendar" color={color} /> }} />
    <Tabs.Screen name="groups" options={{ title: 'Grupos', tabBarLabel: 'Grupos', tabBarIcon: ({ color }) => <NomiTabIcon name="group" color={color} /> }} />
    <Tabs.Screen name="menu" options={{ title: 'Menu', tabBarLabel: 'Menu', tabBarIcon: ({ color }) => <NomiTabIcon name="menu" color={color} /> }} />
  </Tabs></ProfileProvider>;
}
