// Converts a civil date/time in an IANA time zone into an instant and UTC offset.
// Uses only Intl.DateTimeFormat#formatToParts, which Hermes and Node support.

type Civil = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function wallClockAt(utcMillis: number, timeZone: string): Civil {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMillis));
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read('year'), month: read('month'), day: read('day'), hour: read('hour') % 24, minute: read('minute'), second: read('second') };
}

function civilAsUtc(civil: Civil): number {
  return Date.UTC(civil.year, civil.month - 1, civil.day, civil.hour, civil.minute, civil.second);
}

function parseCivil(localDate: string, localTime: string): Civil | null {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  const time = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(localTime);
  if (!date || !time) return null;
  const civil = { year: +date[1], month: +date[2], day: +date[3], hour: +time[1], minute: +time[2], second: +(time[3] ?? 0) };
  if (civil.month < 1 || civil.month > 12 || civil.day < 1 || civil.hour > 23 || civil.minute > 59 || civil.second > 59) return null;
  const check = new Date(Date.UTC(civil.year, civil.month - 1, civil.day));
  if (check.getUTCMonth() !== civil.month - 1 || check.getUTCDate() !== civil.day) return null;
  return civil;
}

/** Formats an offset in minutes as "+HH:MM" / "-HH:MM". */
export function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const absolute = Math.abs(offsetMinutes);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}

/**
 * Resolves local date ("YYYY-MM-DD") and time ("HH:mm" or "HH:mm:ss") in a time zone.
 * Returns null for invalid input or for a wall-clock time skipped by a DST gap.
 */
export function zonedToInstant(localDate: string, localTime: string, timeZone: string): { instant: Date; offset: string } | null {
  const civil = parseCivil(localDate, localTime);
  if (!civil) return null;
  const target = civilAsUtc(civil);
  try {
    // Two passes converge for every real offset, including around DST transitions.
    let guess = target;
    for (let i = 0; i < 2; i += 1) guess = target - (civilAsUtc(wallClockAt(guess, timeZone)) - guess);
    if (civilAsUtc(wallClockAt(guess, timeZone)) !== target) return null;
    return { instant: new Date(guess), offset: formatOffset(Math.round((target - guess) / 60_000)) };
  } catch {
    return null;
  }
}
