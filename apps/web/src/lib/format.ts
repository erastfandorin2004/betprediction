export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  });
}

export function formatDateLabel(isoString: string): string {
  const d = new Date(isoString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (isSameDay(d, today)) return 'Сегодня';
  if (isSameDay(d, tomorrow)) return 'Завтра';

  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatMinute(minute: number | null, extraMinute?: number | null): string {
  if (minute === null) return '';
  return extraMinute ? `${minute}+${extraMinute}′` : `${minute}′`;
}

export function formatOdds(value: number): string {
  return value.toFixed(2);
}

export function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}
