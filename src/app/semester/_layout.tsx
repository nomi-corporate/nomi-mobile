import { Stack } from 'expo-router';
import { ProfileProvider } from '@/features/profile/ProfileProvider';
import { SemesterProvider } from '@/features/semester/SemesterProvider';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { palettes } from '@/theme/tokens';

/** Semester setup (Figma 02): full-screen stack outside the tabs, sharing one SemesterProvider. */
export default function SemesterLayout() {
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  return <ProfileProvider><SemesterProvider>
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }} />
  </SemesterProvider></ProfileProvider>;
}
