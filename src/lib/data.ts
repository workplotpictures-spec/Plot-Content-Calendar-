'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_BRANDS, SEED_ROSTER } from './constants';
import { byBoard } from './utils';
import type { Brand, Goal, Item, Member, Role, Workspace } from './types';

/* ------------------------------------------------------------------ *
 * Paths
 * ------------------------------------------------------------------ */

export const wsRef = (wid: string) => doc(db, 'workspaces', wid);
export const itemsRef = (wid: string) => collection(db, 'workspaces', wid, 'items');
export const itemRef = (wid: string, id: string) => doc(db, 'workspaces', wid, 'items', id);
export const brandsRef = (wid: string) => collection(db, 'workspaces', wid, 'brands');
export const brandRef = (wid: string, id: string) => doc(db, 'workspaces', wid, 'brands', id);
export const membersRef = (wid: string) => collection(db, 'workspaces', wid, 'members');
export const memberRef = (wid: string, id: string) => doc(db, 'workspaces', wid, 'members', id);
export const goalRef = (wid: string, monthKey: string) =>
  doc(db, 'workspaces', wid, 'goals', monthKey);
export const presenceRef = (wid: string, uid: string) =>
  doc(db, 'workspaces', wid, 'presence', uid);

/* ------------------------------------------------------------------ *
 * Workspace creation
 * ------------------------------------------------------------------ */

/**
 * Creates a workspace, makes the caller its admin, and seeds the default
 * brands plus the roster from the reference file as unclaimed seats.
 */
export async function createWorkspace(
  name: string,
  user: { uid: string; name: string; email: string; colour: string },
) {
  const ref = doc(collection(db, 'workspaces'));
  const batch = writeBatch(db);

  batch.set(ref, {
    name: name.trim() || 'My Workspace',
    createdAt: Date.now(),
    createdBy: user.uid,
    createdAtServer: serverTimestamp(),
  });

  // Creator is always admin.
  batch.set(doc(ref, 'members', user.uid), {
    uid: user.uid,
    name: user.name,
    email: user.email,
    colour: user.colour,
    colourName: '',
    role: 'admin' as Role,
    seat: false,
    addedAt: Date.now(),
  });

  // Roster seats — assignable straight away, claimable when the person joins.
  SEED_ROSTER.forEach((p) => {
    const seat = doc(collection(ref, 'members'));
    batch.set(seat, {
      uid: null,
      name: p.name,
      email: null,
      colour: p.colour,
      colourName: p.colourName,
      role: 'editor' as Role,
      seat: true,
      addedAt: Date.now(),
    });
  });

  DEFAULT_BRANDS.forEach((b) => {
    const bd = doc(collection(ref, 'brands'));
    batch.set(bd, { name: b.name, colour: b.colour, isDefault: true, createdAt: Date.now() });
  });

  await batch.commit();
  return ref.id;
}

/** Every workspace the signed-in user is a member of. */
export async function listMyWorkspaces(uid: string): Promise<(Workspace & { role: Role })[]> {
  const snaps = await getDocs(query(collectionGroup(db, 'members'), where('uid', '==', uid)));
  const out: (Workspace & { role: Role })[] = [];
  for (const m of snaps.docs) {
    const wsId = m.ref.parent.parent?.id;
    if (!wsId) continue;
    const ws = await getDoc(wsRef(wsId));
    if (!ws.exists()) continue;
    out.push({
      id: wsId,
      ...(ws.data() as Omit<Workspace, 'id'>),
      role: (m.data().role as Role) ?? 'viewer',
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/* ------------------------------------------------------------------ *
 * Realtime hooks
 * ------------------------------------------------------------------ */

export function useWorkspace(wid: string | null) {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!wid) return;
    return onSnapshot(
      wsRef(wid),
      (snap) => {
        if (!snap.exists()) return setMissing(true);
        setWs({ id: snap.id, ...(snap.data() as Omit<Workspace, 'id'>) });
      },
      () => setMissing(true),
    );
  }, [wid]);

  return { workspace: ws, missing };
}

/** The signed-in user's own membership, which is what gates every action. */
export function useMyRole(wid: string | null, uid: string | null) {
  const [role, setRole] = useState<Role | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!wid || !uid) return;
    setChecked(false);
    return onSnapshot(
      memberRef(wid, uid),
      (snap) => {
        setRole(snap.exists() ? ((snap.data().role as Role) ?? 'viewer') : null);
        setChecked(true);
      },
      () => {
        setRole(null);
        setChecked(true);
      },
    );
  }, [wid, uid]);

  return { role, checked };
}

export function useMembers(wid: string | null) {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!wid) return;
    return onSnapshot(membersRef(wid), (snap) => {
      setMembers(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Member, 'id'>) }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    });
  }, [wid]);

  const byId = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])) as Record<string, Member>,
    [members],
  );

  return { members, membersById: byId };
}

export function useBrands(wid: string | null) {
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    if (!wid) return;
    return onSnapshot(brandsRef(wid), (snap) => {
      setBrands(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Brand, 'id'>) }))
          .sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault) || a.name.localeCompare(b.name)),
      );
    });
  }, [wid]);

  return brands;
}

/**
 * Every item in the workspace. Analytics and the notification bell both work
 * across the whole calendar, so a single subscription is simpler than paging
 * by month and keeps every view in sync from one stream.
 */
export function useItems(wid: string | null) {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!wid) return;
    setLoaded(false);
    return onSnapshot(
      itemsRef(wid),
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Item, 'id'>) })));
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, [wid]);

  return { items, loaded };
}

export function useGoal(wid: string | null, monthKey: string) {
  const [goal, setGoal] = useState<Goal | null>(null);

  useEffect(() => {
    if (!wid) return;
    return onSnapshot(goalRef(wid, monthKey), (snap) => {
      setGoal(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Goal, 'id'>) } : null);
    });
  }, [wid, monthKey]);

  return goal;
}

/* ------------------------------------------------------------------ *
 * Mutations
 * ------------------------------------------------------------------ */

export async function createItem(wid: string, uid: string, data: Partial<Item>) {
  const now = Date.now();
  return addDoc(itemsRef(wid), {
    title: data.title ?? '',
    date: data.date ?? '',
    brandId: data.brandId ?? null,
    brandName: data.brandName ?? null,
    assignee: data.assignee ?? null,
    type: data.type ?? null,
    deadline: data.deadline ?? null,
    status: data.status ?? 'not-started',
    references: data.references ?? '',
    notes: data.notes ?? '',
    files: [],
    order: now,
    createdAt: now,
    updatedAt: now,
    createdBy: uid,
  });
}

export async function updateItem(wid: string, id: string, patch: Partial<Item>) {
  await updateDoc(itemRef(wid, id), { ...patch, updatedAt: Date.now() });
}

export async function deleteItem(wid: string, id: string) {
  await deleteDoc(itemRef(wid, id));
}

/**
 * Moves an item to `date`, inserting before `beforeId` when it was dropped on
 * another tile. Mirrors the reference `dropOn`: both the destination and the
 * source day get their order values rewritten as (index + 1) * 1000.
 */
export async function moveItem(
  wid: string,
  all: Item[],
  dragId: string,
  date: string,
  beforeId: string | null,
) {
  const it = all.find((i) => i.id === dragId);
  if (!it) return;

  const rest = byBoard(all.filter((i) => i.date === date && i.id !== it.id));
  const at = beforeId ? Math.max(0, rest.findIndex((i) => i.id === beforeId)) : rest.length;
  rest.splice(at, 0, it);

  const from = it.date;
  const batch = writeBatch(db);
  rest.forEach((x, i) => {
    const patch: Record<string, unknown> = { order: (i + 1) * 1000 };
    if (x.id === it.id && from !== date) {
      patch.date = date;
      patch.updatedAt = Date.now();
    }
    batch.update(itemRef(wid, x.id), patch);
  });

  if (from !== date) {
    byBoard(all.filter((i) => i.date === from && i.id !== it.id)).forEach((x, i) => {
      batch.update(itemRef(wid, x.id), { order: (i + 1) * 1000 });
    });
  }

  await batch.commit();
}

export async function createBrand(wid: string, name: string, colour: string) {
  const ref = await addDoc(brandsRef(wid), {
    name: name.trim(),
    colour,
    isDefault: false,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function deleteBrand(wid: string, id: string) {
  await deleteDoc(brandRef(wid, id));
}

export async function saveGoal(wid: string, monthKey: string, html: string, uid: string) {
  await setDoc(
    goalRef(wid, monthKey),
    { html, updatedAt: Date.now(), updatedBy: uid },
    { merge: true },
  );
}

/* ---------------- members ---------------- */

export async function addSeat(wid: string, name: string, colour: string, colourName = '') {
  const ref = await addDoc(membersRef(wid), {
    uid: null,
    name: name.trim(),
    email: null,
    colour,
    colourName,
    role: 'editor' as Role,
    seat: true,
    addedAt: Date.now(),
  });
  return ref.id;
}

export async function setMemberRole(wid: string, memberId: string, role: Role) {
  await updateDoc(memberRef(wid, memberId), { role });
}

export async function renameMember(wid: string, memberId: string, name: string) {
  await updateDoc(memberRef(wid, memberId), { name: name.trim() });
}

export async function removeMember(wid: string, memberId: string) {
  await deleteDoc(memberRef(wid, memberId));
}

/**
 * Points every item assigned to `fromId` at `toId`. Used when a real member
 * takes over a roster seat, so historic tiles keep an assignee.
 */
export async function reassignItems(wid: string, items: Item[], fromId: string, toId: string) {
  const affected = items.filter((i) => i.assignee === fromId);
  if (!affected.length) return 0;
  const batch = writeBatch(db);
  affected.forEach((i) => batch.update(itemRef(wid, i.id), { assignee: toId, updatedAt: Date.now() }));
  await batch.commit();
  return affected.length;
}

/* ---------------- presence ---------------- */

export function usePresence(wid: string | null, uid: string | null, editingItemId: string | null) {
  const [present, setPresent] = useState<{ uid: string; editingItemId: string | null; at: number }[]>(
    [],
  );

  // Heartbeat for this tab.
  useEffect(() => {
    if (!wid || !uid) return;
    const beat = () => {
      setDoc(
        presenceRef(wid, uid),
        { uid, at: Date.now(), editingItemId: editingItemId ?? null },
        { merge: true },
      ).catch(() => {});
    };
    beat();
    const t = setInterval(beat, 25_000);
    return () => clearInterval(t);
  }, [wid, uid, editingItemId]);

  // Everyone else's heartbeat.
  useEffect(() => {
    if (!wid) return;
    return onSnapshot(
      collection(db, 'workspaces', wid, 'presence'),
      (snap) => {
        const cutoff = Date.now() - 70_000;
        setPresent(
          snap.docs
            .map((d) => d.data() as { uid: string; editingItemId: string | null; at: number })
            .filter((p) => p.at > cutoff),
        );
      },
      () => {},
    );
  }, [wid]);

  return present;
}
