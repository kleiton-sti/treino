const pad = (n: number) => String(n).padStart(2, '0');

export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAYS_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Data local no formato AAAA-MM-DD. */
export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function weekdayOf(key: string): number {
  return parseKey(key).getDay();
}

/** Diferença em dias (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86_400_000);
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): string {
  const t = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

export function nowMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function formatDateBR(key: string): string {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

/** Número da semana do programa (semana 1 = primeiros 7 dias). */
export function programWeek(startKey: string, todayKey: string): number {
  return Math.max(1, Math.floor(daysBetween(startKey, todayKey) / 7) + 1);
}
