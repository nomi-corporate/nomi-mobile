import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';

export default function RootLayout() {
  return <SafeAreaProvider><AuthProvider><AuthNavigator /></AuthProvider></SafeAreaProvider>;
}

function AuthNavigator() {
  const { state } = useAuth();
  const signedIn = state.status === 'signedIn' || state.status === 'refreshing';
  const dark = useColorScheme() === 'dark';
  return <>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}><Stack.Screen name="(tabs)" /></Stack.Protected>
      <Stack.Protected guard={!signedIn}><Stack.Screen name="sign-in" /></Stack.Protected>
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="auth/logout" />
    </Stack>
  </>;
}
