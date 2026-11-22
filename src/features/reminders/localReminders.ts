import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { AgendaItem } from '@/features/academic/infrastructure/AcademicClient';
import { loadReminderPreferences } from './preferences';
import { notificationId, reminderContent, reminderPlan, type ReminderPreferences } from './schedule';

const CHANNEL_ID = 'reminders';
const IDENTIFIER_PREFIX = 'commitment-';

export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

let handlerInstalled = false;
let channelReady: Promise<void> | null = null;

function installHandler(): void {
  if (handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Creates the Android channel once, before anything is scheduled. */
function ensureChannel(): Promise<void> {
  installHandler();
  if (Platform.OS !== 'android') return Promise.resolve();
  channelReady ??= Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Lembretes',
    importance: Notifications.AndroidImportance.HIGH,
  }).then(() => undefined, () => { channelReady = null; });
  return channelReady;
}

/** Reads the permission; asks the system only when `request` is true. */
export async function ensurePermission(request: boolean): Promise<ReminderPermission> {
  installHandler();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  if (!request) return current.status === 'denied' ? 'denied' : 'undetermined';
  const next = await Notifications.requestPermissionsAsync();
  return next.status === 'granted' ? 'granted' : next.status === 'denied' ? 'denied' : 'undetermined';
}

/** Called from the reminders screen ("Permitir notificações"). */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  return ensurePermission(true);
}

async function cancel(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

async function scheduleOne(item: AgendaItem, prefs: ReminderPreferences, now: Date, catchUp: boolean): Promise<void> {
  const identifier = notificationId(item.id);
  const plan = reminderPlan(item, prefs, now, { catchUp });
  if (plan.action === 'keep') return;
  await cancel(identifier);
  if (plan.action === 'cancel') return;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { ...reminderContent(item), data: { commitmentId: item.id } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: plan.at, channelId: CHANNEL_ID },
  });
}

/**
 * Android 12+ delivers reminders on time only with the "Alarmes e lembretes" access; without it
 * the system may delay them by up to an hour. Returns true when exact delivery is available.
 */
export async function getExactAlarmAccess(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try { return (await Notifications.getExactAlarmPermissionsAsync()).granted; } catch { return true; }
}

/** Opens the system "Alarmes e lembretes" screen; resolves with the access when the user returns. */
export async function requestExactAlarmAccess(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try { return (await Notifications.requestExactAlarmPermissionsAsync()).granted; } catch { return false; }
}

/** Shows a sample reminder in ~5 seconds so the user can check that notifications arrive. */
export async function sendTestReminder(): Promise<ReminderPermission> {
  const permission = await ensurePermission(true);
  if (permission !== 'granted') return permission;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: 'nomi-test-reminder',
    content: { title: 'Lembrete de teste do Nomi', body: 'Assim chegam os avisos dos seus compromissos.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL_ID },
  });
  return permission;
}

/**
 * Schedules, replaces or cancels the reminder of one commitment. Called right after the user
 * saves a commitment, so this is where the system permission is requested the first time
 * (the system shows the prompt only while the permission is undetermined).
 */
export async function syncCommitmentReminder(item: AgendaItem): Promise<void> {
  try {
    const prefs = await loadReminderPreferences();
    const now = new Date();
    const plan = reminderPlan(item, prefs, now, { catchUp: true });
    if (plan.action === 'cancel') { await cancel(notificationId(item.id)); return; }
    if ((await ensurePermission(true)) !== 'granted') return;
    await scheduleOne(item, prefs, now, true);
  } catch {
    // Reminders are best effort; failures must never reach the screens.
  }
}

/** Reconciles the scheduled reminders with a freshly loaded list of commitments. */
export async function reconcileReminders(items: AgendaItem[]): Promise<void> {
  try {
    const prefs = await loadReminderPreferences();
    if (!prefs.enabled) {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduled
          .map((request) => request.identifier)
          .filter((identifier) => identifier.startsWith(IDENTIFIER_PREFIX))
          .map((identifier) => cancel(identifier)),
      );
      return;
    }
    if ((await ensurePermission(false)) !== 'granted') return;
    const now = new Date();
    for (const item of items) {
      await scheduleOne(item, prefs, now, false);
    }
  } catch {
    // Best effort, see syncCommitmentReminder.
  }
}
