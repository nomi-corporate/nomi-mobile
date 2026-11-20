import { Baloo2_700Bold } from '@expo-google-fonts/baloo-2';
import { NunitoSans_400Regular, NunitoSans_700Bold } from '@expo-google-fonts/nunito-sans';
import { useFonts } from 'expo-font';
import { Tabs } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ThemeProvider, useNomiTheme } from '@/theme/ThemeProvider';
import { fontFamilies } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

function AppNavigation() {
  const { colors, isDark } = useNomiTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fontFamilies.displayBold },
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.outline },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          tabBarIcon: () => null,
          tabBarIconStyle: { display: 'none' },
          tabBarLabelStyle: { fontFamily: fontFamilies.sansBold, fontSize: 13 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Início' }} />
        <Tabs.Screen name="subjects" options={{ title: 'Matérias' }} />
        <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
      </Tabs>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fontFamilies.displayBold]: Baloo2_700Bold,
    [fontFamilies.sansRegular]: NunitoSans_400Regular,
    [fontFamilies.sansBold]: NunitoSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <AppNavigation />
    </ThemeProvider>
  );
}
