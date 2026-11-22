import { router, type Href } from 'expo-router';
import { AgendaScreen } from '@/features/agenda/AgendaScreen';

export default function AgendaRoute() {
  return <AgendaScreen onOpenSubjects={() => router.push('/menu/subjects' as Href)} />;
}
