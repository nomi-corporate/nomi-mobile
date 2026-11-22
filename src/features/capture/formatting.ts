// Pure formatters for the capture flow (Figma 04). No react-native or expo imports, so it runs under node --test.

const WEEKDAYS_UPPER_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const WEEKDAYS_FULL_SHORT = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const WEEKDAYS_CAPITAL_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

type CivilParts = { localDate: string; localTime: string };

function parseLocalDate(localDate: string): { year: number; month: number; day: number; weekday: number } {
  const [year, month, day] = localDate.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  return { year, month, day, weekday };
}

function shortTime(localTime: string | null): string | null {
  return localTime ? localTime.slice(0, 5) : null;
}

/** Eyebrow of a commitment card: "SEX 06 NOV · 10:00" (or "SEX 06 NOV" without time). */
export function eyebrowFor(localDate: string, localTime: string | null): string {
  const { day, month, weekday } = parseLocalDate(localDate);
  const base = `${WEEKDAYS_UPPER_SHORT[weekday]} ${String(day).padStart(2, '0')} ${MONTHS_SHORT[month - 1].toUpperCase()}`;
  const time = shortTime(localTime);
  return time ? `${base} · ${time}` : base;
}

/** Long date for buttons and headings: "sexta, 6 de novembro". */
export function longDate(localDate: string): string {
  const { day, month, weekday } = parseLocalDate(localDate);
  return `${WEEKDAYS_FULL_SHORT[weekday]}, ${day} de ${MONTHS_LONG[month - 1]}`;
}

/** Date line of a saved item: "Sex, 6 de novembro · 10:00". */
export function eventDateLine(localDate: string, localTime: string | null): string {
  const { day, month, weekday } = parseLocalDate(localDate);
  const base = `${WEEKDAYS_CAPITAL_SHORT[weekday]}, ${day} de ${MONTHS_LONG[month - 1]}`;
  const time = shortTime(localTime);
  return time ? `${base} · ${time}` : base;
}

/** Subject and professor line: "Cálculo I · Profa. Ana", or "Sem matéria". */
export function commitmentDetail(subjectName: string | null, professorName: string | null): string {
  if (!subjectName) return 'Sem matéria';
  return professorName ? `${subjectName} · ${professorName}` : subjectName;
}

/** Civil date and time of an instant in an IANA time zone. */
export function civilInZone(instant: Date, timeZone: string): CivilParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(instant);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return {
    localDate: `${read('year')}-${read('month')}-${read('day')}`,
    localTime: `${String(Number(read('hour')) % 24).padStart(2, '0')}:${read('minute')}`,
  };
}

function addDays(localDate: string, days: number): string {
  const date = new Date(`${localDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Reminder label relative to "now": "Hoje, às 18:00", "Amanhã, às 09:00" or "Sex, 6 de nov · 09:00".
 * Returns "Sem lembrete" when there is no trigger.
 */
export function reminderLabel(date: Date | null, now: Date, timeZone: string): string {
  if (!date || Number.isNaN(date.getTime())) return 'Sem lembrete';
  const target = civilInZone(date, timeZone);
  const today = civilInZone(now, timeZone).localDate;
  if (target.localDate === today) return `Hoje, às ${target.localTime}`;
  if (target.localDate === addDays(today, 1)) return `Amanhã, às ${target.localTime}`;
  const { day, month, weekday } = parseLocalDate(target.localDate);
  return `${WEEKDAYS_CAPITAL_SHORT[weekday]}, ${day} de ${MONTHS_SHORT[month - 1]} · ${target.localTime}`;
}
