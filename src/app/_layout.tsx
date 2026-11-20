import { Baloo2_700Bold } from '@expo-google-fonts/baloo-2';
import { NunitoSans_400Regular, NunitoSans_700Bold } from '@expo-google-fonts/nunito-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
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
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="dev/components" options={{ headerShown: false }} />
      </Stack>
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
