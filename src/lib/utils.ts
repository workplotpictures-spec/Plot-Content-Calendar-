import { DONE, S } from './constants';
import { daysUntil } from './dates';
import { strip } from './sanitize';
import type { Filters, Item, Member } from './types';

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function bytes(n: number) {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return (n / Math.pow(1024, i)).toFixed(i ? 1 : 0) + ' ' + units[i];
}

/** Pulls the first few links out of the references textarea. */
export const urls = (t: string) =>
  (String(t || '').match(/https?:\/\/[^\s<>"')]+/gi) || []).slice(0, 8);

export function iconFor(type: string, name: string) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if ((type || '').startsWith('image/')) return '🖼️';
  if ((type || '').startsWith('video/')) return '🎬';
  if (ext === 'pdf') return '📄';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
  if (['doc', 'docx'].includes(ext)) return '📝';
  return '📁';
}

export const isImage = (f: { type: string }) => (f.type || '').startsWith('image/');
export const isVideo = (f: { type: string }) => (f.type || '').startsWith('video/');

export const isLate = (it: Item) =>
  !!it.deadline && !DONE.includes(it.status) && (daysUntil(it.deadline) ?? 0) < 0;

export const blankFilters = (): Filters => ({
  brands: [],
  assignees: [],
  statuses: [],
  types: [],
  from: '',
  to: '',
});

export const filterCount = (f: Filters) =>
  f.brands.length +
  f.assignees.length +
  f.statuses.length +
  f.types.length +
  (f.from ? 1 : 0) +
  (f.to ? 1 : 0);

/** Search + filter test, ported from the reference `matches`. */
export function matches(
  it: Item,
  search: string,
  filters: Filters,
  members: Record<string, Member>,
) {
  const q = search.trim().toLowerCase();
  if (q) {
    const hay = [
      it.title,
      strip(it.notes),
      it.references,
      it.brandName || '',
      it.assignee ? (members[it.assignee]?.name ?? '') : '',
      it.type || '',
      S[it.status]?.label || '',
    ]
      .join(' ')
      .toLowerCase();
    if (!q.split(/\s+/).every((t) => hay.includes(t))) return false;
  }

  if (filters.brands.length && !filters.brands.includes(it.brandId as string)) return false;
  if (filters.assignees.length && !filters.assignees.includes(it.assignee as string))
    return false;
  if (filters.statuses.length && !filters.statuses.includes(it.status)) return false;
  if (filters.types.length && !filters.types.includes(it.type as string)) return false;
  if (filters.from || filters.to) {
    if (!it.deadline) return false;
    if (filters.from && it.deadline < filters.from) return false;
    if (filters.to && it.deadline > filters.to) return false;
  }
  return true;
}

/** Board order: explicit order, then creation time. */
export const byBoard = (list: Item[]) =>
  [...list].sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);

/** Deadline order: dated items first, soonest first, then creation time. */
export const byDeadline = (list: Item[]) =>
  [...list].sort((a, b) => {
    if (a.deadline && b.deadline) {
      if (a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1;
    } else if (a.deadline) return -1;
    else if (b.deadline) return 1;
    return a.createdAt - b.createdAt;
  });

export const initials = (name: string) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '?';

/** Deterministic colour pick so a user's avatar is stable across devices. */
export function pickColour(seed: string, palette: string[]) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
