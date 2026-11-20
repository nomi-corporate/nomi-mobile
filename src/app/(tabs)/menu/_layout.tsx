import { Stack } from 'expo-router';
import { useNomiTheme } from '@/theme/ThemeProvider';

export default function MenuStackLayout() {
  const { colors } = useNomiTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="appearance" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="devices" />
      <Stack.Screen name="reminders" />
    </Stack>
  );
}
