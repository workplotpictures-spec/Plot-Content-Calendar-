import { MONTHS, WEEKDAY_LONG } from './constants';

/** Date helpers ported verbatim from the reference file. */

export const pad = (n: number) => String(n).padStart(2, '0');

export const key = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parse = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

export const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);

export const todayKey = () => key(new Date());

export const monthKey = (k: string) => k.slice(0, 7);

export function monthGrid(d: Date) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function weekDays(d: Date) {
  const s = addDays(d, -d.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

export function fmtShort(k: string | null) {
  if (!k) return '';
  const d = parse(k);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export function fmtLong(k: string | null) {
  if (!k) return '';
  const d = parse(k);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function fmtDayTitle(k: string) {
  const d = parse(k);
  return `${WEEKDAY_LONG[d.getDay()]}, ${fmtLong(k)}`;
}

export function daysUntil(k: string | null) {
  if (!k) return null;
  const a = parse(k);
  const b = new Date();
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}
