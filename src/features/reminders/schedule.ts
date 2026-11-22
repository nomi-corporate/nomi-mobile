// Pure reminder rules: no react-native or expo imports, so it runs under node --test.
import type { AgendaItem } from '../academic/infrastructure/AcademicClient.ts';
import { zonedToInstant } from '../agenda/zonedTime.ts';

export type ReminderPreferences = {
  enabled: boolean;
  leadMinutes: 15 | 30 | 60 | 1440;
  dateOnlyTime: '09:00';
};

export const DEFAULT_PREFERENCES: ReminderPreferences = {
  enabled: true,
  leadMinutes: 30,
  dateOnlyTime: '09:00',
};

const MIN_LEAD_MS = 60_000;

/**
 * Returns when the local notification for a commitment should fire, or null when no
 * notification should exist (disabled, completed, unresolvable or already past).
 */
export function reminderTrigger(item: AgendaItem, prefs: ReminderPreferences, now: Date): Date | null {
  if (!prefs.enabled || item.status !== 'pending') return null;

  let trigger: Date | null;
  if (item.due.precision === 'dateTime') {
    const due = resolveDueInstant(item);
    if (!due) return null;
    trigger = new Date(due.getTime() - prefs.leadMinutes * 60_000);
  } else {
    const resolved = zonedToInstant(item.due.localDate, prefs.dateOnlyTime, item.due.timeZone);
    trigger = resolved ? resolved.instant : null;
  }

  if (!trigger || Number.isNaN(trigger.getTime())) return null;
  if (trigger.getTime() - now.getTime() < MIN_LEAD_MS) return null;
  return trigger;
}

function resolveDueInstant(item: AgendaItem): Date | null {
  if (item.due.instant) {
    const parsed = new Date(item.due.instant);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (!item.due.localTime) return null;
  return zonedToInstant(item.due.localDate, item.due.localTime, item.due.timeZone)?.instant ?? null;
}

/** Notification title and body for a commitment, in Brazilian Portuguese. */
export function reminderContent(item: AgendaItem): { title: string; body: string } {
  const kindLabel = item.kind === 'exam' ? 'Prova' : item.kind === 'assignment' ? 'Trabalho' : 'Lembrete';
  const when = item.displayTime ? `${item.displayDate} às ${item.displayTime}` : item.displayDate;
  return {
    title: 'Lembrete: ' + item.title,
    body: kindLabel + (item.subjectName ? ' · ' + item.subjectName : '') + ' · ' + when,
  };
}

/** Stable identifier of the scheduled notification for a commitment. */
export function notificationId(commitmentId: string): string {
  return 'commitment-' + commitmentId;
}
