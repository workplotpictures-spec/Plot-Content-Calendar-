export type Role = 'admin' | 'editor' | 'viewer';

/** users/{uid} */
export interface UserDoc {
  uid: string;
  name: string;
  email: string;
  colour: string;
  createdAt: number;
  lastWorkspaceId?: string | null;
}

/** workspaces/{workspaceId} */
export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  createdBy: string;
}

/**
 * workspaces/{workspaceId}/members/{memberId}
 *
 * The reference file had a fixed seven-person roster. Here a member doc is
 * either a real signed-in user (doc id === uid) or an unclaimed seat created
 * when the workspace was seeded (doc id is a generated string). Seats are
 * assignable on content but grant nobody access — the security rules only
 * ever look up a doc keyed by request.auth.uid.
 */
export interface Member {
  id: string;
  name: string;
  email: string | null;
  colour: string;
  /** Human-readable colour name, kept so the assignee dropdown reads as it did. */
  colourName: string;
  role: Role;
  /** True for a roster seat nobody has signed in as yet. */
  seat: boolean;
  addedAt: number;
}

/** workspaces/{workspaceId}/brands/{brandId} */
export interface Brand {
  id: string;
  name: string;
  colour: string;
  isDefault?: boolean;
}

/** A file stored in Firebase Storage and referenced from an item. */
export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  /** Emoji used when there is no visual preview, matching the reference. */
  kind: string;
  /** Storage object path, e.g. workspaces/{wid}/items/{itemId}/{id}-{name} */
  path: string;
  /** Long-lived download URL resolved at upload time. */
  url: string;
  uploadedAt: number;
  uploadedBy: string;
}

/** workspaces/{workspaceId}/items/{itemId} */
export interface Item {
  id: string;
  title: string;
  /** Scheduled date, YYYY-MM-DD. */
  date: string;
  brandId: string | null;
  brandName: string | null;
  /** Member doc id — a real uid or a roster seat id. */
  assignee: string | null;
  type: string | null;
  /** Deadline, YYYY-MM-DD. */
  deadline: string | null;
  status: string;
  references: string;
  /** Sanitised HTML. */
  notes: string;
  files: Attachment[];
  order: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

/** workspaces/{workspaceId}/goals/{monthKey} — monthKey is YYYY-MM. */
export interface Goal {
  id: string;
  html: string;
  updatedAt: number;
  updatedBy: string;
}

/** invites/{token} */
export interface Invite {
  token: string;
  workspaceId: string;
  workspaceName: string;
  role: Role;
  createdBy: string;
  createdAt: number;
  /** Epoch ms. */
  expiresAt: number;
  singleUse: boolean;
  usedBy: string[];
  revoked: boolean;
}

export interface Filters {
  brands: string[];
  assignees: string[];
  statuses: string[];
  types: string[];
  from: string;
  to: string;
}

export type CalendarView = 'month' | 'week' | 'day';

export interface ToastMsg {
  id: string;
  msg: string;
  kind?: 'ok' | 'err';
}
