import { Stack } from 'expo-router';
import { CaptureProvider } from '@/features/capture/CaptureProvider';
import { ProfileProvider } from '@/features/profile/ProfileProvider';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { palettes } from '@/theme/tokens';

/** Capture flow (Figma 04): full-screen stack outside the tabs, sharing one CaptureProvider. */
export default function CaptureLayout() {
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  return <ProfileProvider><CaptureProvider>
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }} />
  </CaptureProvider></ProfileProvider>;
}
