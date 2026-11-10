import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { palettes } from '@/theme/tokens';

export default function TabsLayout() {
  const colors = palettes[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return <Tabs screenOptions={{
    headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
    tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
    tabBarIcon: () => null, tabBarIconStyle: { display: 'none' }, tabBarLabelStyle: { fontSize: 13 },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Início' }} />
    <Tabs.Screen name="subjects" options={{ title: 'Matérias' }} />
    <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
  </Tabs>;
}
