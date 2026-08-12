'use client';

import { arrayUnion, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, collection, where } from 'firebase/firestore';
import { db, appUrl } from './firebase';
import { memberRef } from './data';
import type { Invite, Role, UserDoc } from './types';

export const inviteRef = (token: string) => doc(db, 'invites', token);

/** 32 hex chars from the platform CSPRNG — not guessable by enumeration. */
function makeToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const inviteUrl = (token: string) => `${appUrl()}/join/${token}`;

export async function createInvite(opts: {
  workspaceId: string;
  workspaceName: string;
  role: Role;
  createdBy: string;
  /** Days until the link stops working. */
  expiresInDays: number;
  singleUse: boolean;
}) {
  const token = makeToken();
  const invite: Invite = {
    token,
    workspaceId: opts.workspaceId,
    workspaceName: opts.workspaceName,
    role: opts.role,
    createdBy: opts.createdBy,
    createdAt: Date.now(),
    expiresAt: Date.now() + opts.expiresInDays * 86400000,
    singleUse: opts.singleUse,
    usedBy: [],
    revoked: false,
  };
  await setDoc(inviteRef(token), invite);
  return invite;
}

export async function listInvites(workspaceId: string) {
  const snaps = await getDocs(
    query(collection(db, 'invites'), where('workspaceId', '==', workspaceId)),
  );
  return snaps.docs
    .map((d) => d.data() as Invite)
    .filter((i) => !i.revoked)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function revokeInvite(token: string) {
  await deleteDoc(inviteRef(token));
}

export type InviteState =
  | { ok: true; invite: Invite }
  | { ok: false; reason: 'missing' | 'expired' | 'revoked' | 'used' };

export async function readInvite(token: string): Promise<InviteState> {
  const snap = await getDoc(inviteRef(token));
  if (!snap.exists()) return { ok: false, reason: 'missing' };
  const invite = snap.data() as Invite;
  if (invite.revoked) return { ok: false, reason: 'revoked' };
  if (invite.expiresAt < Date.now()) return { ok: false, reason: 'expired' };
  if (invite.singleUse && invite.usedBy.length > 0) return { ok: false, reason: 'used' };
  return { ok: true, invite };
}

/**
 * Adds the signed-in user to the workspace at the invite's role.
 *
 * The member document carries the token so the security rules can re-read the
 * invite and confirm the role server-side — the client cannot promote itself
 * by editing the payload.
 */
export async function acceptInvite(invite: Invite, profile: UserDoc) {
  const existing = await getDoc(memberRef(invite.workspaceId, profile.uid));
  if (existing.exists()) return 'already-member' as const;

  await setDoc(memberRef(invite.workspaceId, profile.uid), {
    uid: profile.uid,
    name: profile.name,
    email: profile.email,
    colour: profile.colour,
    colourName: '',
    role: invite.role,
    seat: false,
    addedAt: Date.now(),
    inviteToken: invite.token,
  });

  await updateDoc(inviteRef(invite.token), { usedBy: arrayUnion(profile.uid) }).catch(() => {
    // Membership is what matters; a failed bookkeeping write must not undo it.
  });

  return 'joined' as const;
}
