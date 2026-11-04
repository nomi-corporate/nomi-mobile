import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { palettes } from '@/theme/tokens';

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  const colors = palettes[dark ? 'dark' : 'light'];
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Tabs screenOptions={{
        headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
        tabBarIcon: () => null, tabBarIconStyle: { display: 'none' }, tabBarLabelStyle: { fontSize: 13 },
      }}>
        <Tabs.Screen name="index" options={{ title: 'Início' }} />
        <Tabs.Screen name="subjects" options={{ title: 'Matérias' }} />
        <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
      </Tabs>
    </>
  );
}
