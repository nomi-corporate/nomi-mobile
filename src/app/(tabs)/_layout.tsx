import { Tabs } from 'expo-router';
import { MainNavBar } from '@/components/MainNavBar';
import { useNomiTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const { colors } = useNomiTheme();

  return (
    <Tabs
      tabBar={(props) => <MainNavBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoje' }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="groups" options={{ title: 'Grupos' }} />
      <Tabs.Screen name="menu" options={{ title: 'Menu' }} />
    </Tabs>
  );
}
