// Public API of the local reminders module (MVP: notifications scheduled on this device).
// Implementation lives in ./localReminders.ts; screens only import from here.
export { syncCommitmentReminder, reconcileReminders, requestReminderPermission, ensurePermission, getExactAlarmAccess, requestExactAlarmAccess, sendTestReminder } from './localReminders';
export type { ReminderPermission } from './localReminders';
export { loadReminderPreferences, saveReminderPreferences } from './preferences';
export { DEFAULT_PREFERENCES } from './schedule';
export type { ReminderPreferences } from './schedule';
