import { StyleSheet, View } from 'react-native';
import { palettes } from '@/theme/tokens';
import { NomiText } from './NomiText';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import NoteLight from '../../assets/design-system/empty-note-light.svg';
import NoteDark from '../../assets/design-system/empty-note-dark.svg';
import CalendarLight from '../../assets/design-system/empty-calendar-light.svg';
import CalendarDark from '../../assets/design-system/empty-calendar-dark.svg';
import BookLight from '../../assets/design-system/empty-book-light.svg';
import BookDark from '../../assets/design-system/empty-book-dark.svg';
import UsersLight from '../../assets/design-system/empty-users-light.svg';
import UsersDark from '../../assets/design-system/empty-users-dark.svg';
import BellLight from '../../assets/design-system/empty-bell-light.svg';
import BellDark from '../../assets/design-system/empty-bell-dark.svg';
import SearchLight from '../../assets/design-system/empty-search-light.svg';
import SearchDark from '../../assets/design-system/empty-search-dark.svg';

export type NomiEmptyStateKind = 'note' | 'calendar' | 'book' | 'users' | 'bell' | 'search';

const illustrations = {
  note: [NoteLight, NoteDark],
  calendar: [CalendarLight, CalendarDark],
  book: [BookLight, BookDark],
  users: [UsersLight, UsersDark],
  bell: [BellLight, BellDark],
  search: [SearchLight, SearchDark],
} as const;

type Props = { kind: NomiEmptyStateKind; title: string; message: string; testID?: string };

export function NomiEmptyState({ kind, title, message, testID }: Props) {
  const { colorScheme } = useNomiTheme();
  const dark = colorScheme === 'dark';
  const colors = palettes[dark ? 'dark' : 'light'];
  const Illustration = illustrations[kind][dark ? 1 : 0];
  return (
    <View testID={testID} accessibilityRole="summary" style={[styles.card, { backgroundColor: colors.surface }]}>
      <Illustration width={32} height={32} accessibilityLabel="" />
      <NomiText variant="heading">{title}</NomiText>
      <NomiText variant="supporting" tone="muted">{message}</NomiText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 214, borderRadius: 20, padding: 20, gap: 12, alignItems: 'flex-start', justifyContent: 'flex-start' },
});
