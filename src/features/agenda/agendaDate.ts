export function todayInZone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = (name: string) => parts.find((part) => part.type === name)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('pt-BR', { ...options, timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
}

export function weekDates(value: string): string[] {
  const date = new Date(`${value}T12:00:00Z`);
  const sunday = shiftDate(value, -date.getUTCDay());
  return Array.from({ length: 7 }, (_, index) => shiftDate(sunday, index));
}
