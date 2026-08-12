import type { Role } from './types';

/**
 * Seed roster, ported from the reference file. These become unclaimed member
 * seats in a new workspace rather than a hardcoded list, so a team can edit
 * them — but a fresh workspace still looks exactly like the prototype.
 */
export const SEED_ROSTER = [
  { name: 'Sahil', colourName: 'Blue', colour: '#2C5FE0' },
  { name: 'Rishi', colourName: 'Green', colour: '#16A34A' },
  { name: 'Vedanjay', colourName: 'Purple', colour: '#7C3AED' },
  { name: 'Ishwar', colourName: 'Orange', colour: '#EA580C' },
  { name: 'Anusha', colourName: 'Pink', colour: '#DB2777' },
  { name: 'Dia', colourName: 'Teal', colour: '#0D9488' },
  { name: 'Pranay', colourName: 'Red', colour: '#DC2626' },
] as const;

export const STATUSES = [
  { key: 'not-started', label: 'Not Started', hex: '#64748B' },
  { key: 'in-progress', label: 'In Progress', hex: '#2563EB' },
  { key: 'review', label: 'Review', hex: '#D97706' },
  { key: 'approved', label: 'Approved', hex: '#7C3AED' },
  { key: 'scheduled', label: 'Scheduled', hex: '#0891B2' },
  { key: 'published', label: 'Published', hex: '#16A34A' },
  { key: 'completed', label: 'Completed', hex: '#059669' },
] as const;

export const S: Record<string, { key: string; label: string; hex: string }> =
  Object.fromEntries(STATUSES.map((s) => [s.key, s]));

export const DONE = ['published', 'completed'];

export const TYPES = [
  'Reel',
  'Post',
  'Carousel',
  'Story',
  'Blog',
  'Article',
  'Video',
  'Podcast',
  'Campaign',
  'Newsletter',
  'Email',
  'Landing Page',
  'Other',
];

export const DEFAULT_BRANDS = [
  { name: 'LTH/AURIKA', colour: '#2C5FE0' },
  { name: 'WBC', colour: '#0D9488' },
  { name: 'TMF', colour: '#7C3AED' },
  { name: 'NEXTLEAP', colour: '#EA580C' },
  { name: 'EO GURGAON', colour: '#DB2777' },
  { name: 'PULSE', colour: '#DC2626' },
  { name: 'IDAYA', colour: '#16A34A' },
  { name: 'PLOT', colour: '#0B1F3F' },
];

export const BRAND_COLOURS = [
  '#2C5FE0',
  '#0D9488',
  '#7C3AED',
  '#EA580C',
  '#DB2777',
  '#DC2626',
  '#16A34A',
  '#0B1F3F',
  '#0891B2',
  '#D97706',
  '#64748B',
  '#059669',
];

/** Palette for user avatar colours, assigned on first sign-in. */
export const AVATAR_COLOURS = BRAND_COLOURS;

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const ROLES: { key: Role; label: string; blurb: string }[] = [
  { key: 'admin', label: 'Admin', blurb: 'Full access, plus members and settings' },
  { key: 'editor', label: 'Editor', blurb: 'Create and edit content, brands and goals' },
  { key: 'viewer', label: 'Viewer', blurb: 'Read-only' },
];

/** Accepted upload types, matching the reference file's accept attribute. */
export const ACCEPT_FILES =
  'image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
