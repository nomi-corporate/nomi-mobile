import * as SecureStore from 'expo-secure-store';
import { DEFAULT_PREFERENCES, type ReminderPreferences } from './schedule.ts';

const STORAGE_KEY = 'nomi.reminders.preferences.v1';
const LEAD_OPTIONS: readonly number[] = [15, 30, 60, 1440];

/** Accepts only a well-formed preferences object; anything else yields null. */
function parsePreferences(raw: unknown): ReminderPreferences | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.enabled !== 'boolean') return null;
  if (typeof value.leadMinutes !== 'number' || !LEAD_OPTIONS.includes(value.leadMinutes)) return null;
  if (value.dateOnlyTime !== '09:00') return null;
  return {
    enabled: value.enabled,
    leadMinutes: value.leadMinutes as ReminderPreferences['leadMinutes'],
    dateOnlyTime: '09:00',
  };
}

/** Reads the device preferences; falls back to the defaults on any missing, corrupt or failed read. */
export async function loadReminderPreferences(): Promise<ReminderPreferences> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    return parsePreferences(JSON.parse(stored)) ?? DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/** Persists the device preferences. Throws if the secure store rejects the write. */
export async function saveReminderPreferences(preferences: ReminderPreferences): Promise<void> {
  const valid = parsePreferences(preferences);
  if (!valid) throw new Error('Preferências de lembretes inválidas.');
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(valid));
}
