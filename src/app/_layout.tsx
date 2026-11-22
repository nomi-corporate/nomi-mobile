import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { AcademicProvider } from '@/features/academic/AcademicProvider';
import { NomiThemeProvider, useNomiTheme } from '@/theme/NomiThemeProvider';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts([
    {
      fontFamily: 'Baloo 2',
      fontDefinitions: [{ path: require('../assets/fonts/Baloo2-Variable.ttf'), weight: '400 800' }],
    },
    {
      fontFamily: 'Nunito Sans',
      fontDefinitions: [{ path: require('../assets/fonts/NunitoSans-Variable.ttf'), weight: '200 1000' }],
    },
  ]);

  useEffect(() => {
    let cancelled = false;

    const prepareFontsAndHideSplash = async () => {
      if (fontsLoaded && Platform.OS === 'web' && typeof document !== 'undefined') {
        try {
          const [balooFaces, nunitoFaces] = await Promise.all([
            document.fonts.load('700 32px "Baloo 2"', 'Aprender no seu ritmo'),
            document.fonts.load('400 15px "Nunito Sans"', 'Aprender no seu ritmo'),
          ]);

          if (balooFaces.length === 0 || nunitoFaces.length === 0) {
            console.error('Nomi: uma ou mais fontes locais não foram encontradas pelo navegador.', {
              balooFaces: balooFaces.length,
              nunitoFaces: nunitoFaces.length,
            });
          }
        } catch (error) {
          console.error('Nomi: falha ao carregar as fontes no navegador.', error);
        }
      }

      if (!cancelled && (fontsLoaded || fontError)) {
        void SplashScreen.hideAsync().catch(() => undefined);
      }
    }

    void prepareFontsAndHideSplash();
    return () => { cancelled = true; };
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return <NomiThemeProvider><SafeAreaProvider><AuthProvider><AcademicProvider><AuthNavigator /></AcademicProvider></AuthProvider></SafeAreaProvider></NomiThemeProvider>;
}

function AuthNavigator() {
  const { state } = useAuth();
  const signedIn = state.status === 'signedIn' || state.status === 'refreshing';
  const { colorScheme } = useNomiTheme();
  const dark = colorScheme === 'dark';
  return <>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}><Stack.Screen name="(tabs)" /><Stack.Screen name="capture" /></Stack.Protected>
      <Stack.Protected guard={!signedIn}><Stack.Screen name="sign-in" /></Stack.Protected>
      {__DEV__ ? <Stack.Screen name="dev/components" /> : null}
    </Stack>
  </>;
}
