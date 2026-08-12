/**
 * Security rules tests.
 *
 * These run against the Firestore emulator and assert the role model actually
 * holds server-side — a viewer really cannot write, an editor really cannot
 * touch members, and an invite really does decide the role a joiner gets.
 *
 *   npm run test:rules
 */

import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  collectionGroup,
  arrayUnion,
  writeBatch,
} from 'firebase/firestore';

const WS = 'ws1';
const ADMIN = 'uid_admin';
const EDITOR = 'uid_editor';
const VIEWER = 'uid_viewer';
const OUTSIDER = 'uid_outsider';
const JOINER = 'uid_joiner';

const results = [];
let failures = 0;

async function test(name, fn) {
  try {
    await fn();
    results.push(`  ok   ${name}`);
  } catch (e) {
    failures++;
    results.push(`  FAIL ${name}\n         ${e.message.split('\n')[0]}`);
  }
}

const env = await initializeTestEnvironment({
  projectId: 'rules-test',
  firestore: {
    rules: readFileSync('firestore.rules', 'utf8'),
    host: '127.0.0.1',
    port: 8080,
  },
});

/* ---------------- seed ---------------- */

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'workspaces', WS), {
    name: 'Plot Pictures',
    createdAt: Date.now(),
    createdBy: ADMIN,
  });

  const member = (uid, role, extra = {}) => ({
    uid,
    name: role,
    email: `${role}@x.com`,
    colour: '#2C5FE0',
    colourName: '',
    role,
    seat: false,
    addedAt: Date.now(),
    ...extra,
  });

  await setDoc(doc(db, 'workspaces', WS, 'members', ADMIN), member(ADMIN, 'admin'));
  await setDoc(doc(db, 'workspaces', WS, 'members', EDITOR), member(EDITOR, 'editor'));
  await setDoc(doc(db, 'workspaces', WS, 'members', VIEWER), member(VIEWER, 'viewer'));

  // An unclaimed roster seat: assignable, but grants nobody access.
  await setDoc(doc(db, 'workspaces', WS, 'members', 'seat1'), {
    uid: null,
    name: 'Sahil',
    email: null,
    colour: '#2C5FE0',
    colourName: 'Blue',
    role: 'editor',
    seat: true,
    addedAt: Date.now(),
  });

  await setDoc(doc(db, 'workspaces', WS, 'items', 'item1'), {
    title: 'Launch teaser reel',
    date: '2026-01-05',
    brandId: null,
    brandName: null,
    assignee: null,
    type: null,
    deadline: null,
    status: 'not-started',
    references: '',
    notes: '',
    files: [],
    order: 1000,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: EDITOR,
  });

  await setDoc(doc(db, 'workspaces', WS, 'brands', 'b1'), { name: 'PLOT', colour: '#0B1F3F' });

  const invite = (token, role, extra = {}) => ({
    token,
    workspaceId: WS,
    workspaceName: 'Plot Pictures',
    role,
    createdBy: ADMIN,
    createdAt: Date.now(),
    expiresAt: Date.now() + 86400000,
    singleUse: false,
    usedBy: [],
    revoked: false,
    ...extra,
  });

  await setDoc(doc(db, 'invites', 'tok_viewer'), invite('tok_viewer', 'viewer'));
  await setDoc(doc(db, 'invites', 'tok_editor'), invite('tok_editor', 'editor'));
  await setDoc(
    doc(db, 'invites', 'tok_expired'),
    invite('tok_expired', 'editor', { expiresAt: Date.now() - 1000 }),
  );
  await setDoc(
    doc(db, 'invites', 'tok_used'),
    invite('tok_used', 'editor', { singleUse: true, usedBy: ['someone'] }),
  );
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const newItem = (createdBy) => ({
  title: 'New item',
  date: '2026-02-01',
  brandId: null,
  brandName: null,
  assignee: null,
  type: null,
  deadline: null,
  status: 'not-started',
  references: '',
  notes: '',
  files: [],
  order: 1000,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  createdBy,
});

/* ---------------- reads ---------------- */

await test('member can read items', () =>
  assertSucceeds(getDoc(doc(as(VIEWER), 'workspaces', WS, 'items', 'item1'))));

await test('outsider cannot read items', () =>
  assertFails(getDoc(doc(as(OUTSIDER), 'workspaces', WS, 'items', 'item1'))));

await test('signed-out visitor cannot read items', () =>
  assertFails(getDoc(doc(anon(), 'workspaces', WS, 'items', 'item1'))));

await test('outsider cannot read the workspace doc', () =>
  assertFails(getDoc(doc(as(OUTSIDER), 'workspaces', WS))));

await test('outsider cannot list members', () =>
  assertFails(getDocs(collection(as(OUTSIDER), 'workspaces', WS, 'members'))));

// The join flow and the not-a-member screen both hinge on this read working
// for a document that does not exist yet.
await test('a non-member can check their own (absent) membership row', async () => {
  const snap = await assertSucceeds(
    getDoc(doc(as(OUTSIDER), 'workspaces', WS, 'members', OUTSIDER)),
  );
  assert.equal(snap.exists(), false, 'expected the row to be absent');
});

await test('a non-member cannot read somebody else\'s membership row', () =>
  assertFails(getDoc(doc(as(OUTSIDER), 'workspaces', WS, 'members', ADMIN))));

/* ---------------- viewer is read-only ---------------- */

await test('viewer cannot create an item', () =>
  assertFails(setDoc(doc(as(VIEWER), 'workspaces', WS, 'items', 'v1'), newItem(VIEWER))));

await test('viewer cannot update an item', () =>
  assertFails(
    updateDoc(doc(as(VIEWER), 'workspaces', WS, 'items', 'item1'), { status: 'published' }),
  ));

await test('viewer cannot delete an item', () =>
  assertFails(deleteDoc(doc(as(VIEWER), 'workspaces', WS, 'items', 'item1'))));

await test('viewer cannot create a brand', () =>
  assertFails(setDoc(doc(as(VIEWER), 'workspaces', WS, 'brands', 'b2'), { name: 'X', colour: '#000' })));

await test('viewer cannot write monthly goals', () =>
  assertFails(
    setDoc(doc(as(VIEWER), 'workspaces', WS, 'goals', '2026-01'), {
      html: '<p>mine</p>',
      updatedAt: Date.now(),
      updatedBy: VIEWER,
    }),
  ));

/* ---------------- editor can edit content, not members ---------------- */

await test('editor can create an item', () =>
  assertSucceeds(setDoc(doc(as(EDITOR), 'workspaces', WS, 'items', 'e1'), newItem(EDITOR))));

await test('editor can update an item', () =>
  assertSucceeds(
    updateDoc(doc(as(EDITOR), 'workspaces', WS, 'items', 'item1'), {
      status: 'in-progress',
      updatedAt: Date.now(),
    }),
  ));

await test('editor can write monthly goals', () =>
  assertSucceeds(
    setDoc(doc(as(EDITOR), 'workspaces', WS, 'goals', '2026-01'), {
      html: '<p>ship the launch</p>',
      updatedAt: Date.now(),
      updatedBy: EDITOR,
    }),
  ));

await test('editor cannot change anyone\'s role', () =>
  assertFails(updateDoc(doc(as(EDITOR), 'workspaces', WS, 'members', VIEWER), { role: 'admin' })));

await test('editor cannot promote themselves', () =>
  assertFails(updateDoc(doc(as(EDITOR), 'workspaces', WS, 'members', EDITOR), { role: 'admin' })));

await test('editor cannot remove a member', () =>
  assertFails(deleteDoc(doc(as(EDITOR), 'workspaces', WS, 'members', VIEWER))));

await test('editor cannot rename the workspace', () =>
  assertFails(updateDoc(doc(as(EDITOR), 'workspaces', WS), { name: 'Hijacked' })));

await test('editor cannot create an invite', () =>
  assertFails(
    setDoc(doc(as(EDITOR), 'invites', 'tok_bad'), {
      token: 'tok_bad',
      workspaceId: WS,
      workspaceName: 'Plot Pictures',
      role: 'admin',
      createdBy: EDITOR,
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
      singleUse: false,
      usedBy: [],
      revoked: false,
    }),
  ));

await test('member can fix their own display name', () =>
  assertSucceeds(
    updateDoc(doc(as(EDITOR), 'workspaces', WS, 'members', EDITOR), { name: 'Rishi' }),
  ));

/* ---------------- admin ---------------- */

await test('admin can change a role', () =>
  assertSucceeds(
    updateDoc(doc(as(ADMIN), 'workspaces', WS, 'members', VIEWER), { role: 'editor' }),
  ));

await test('admin can remove a member', () =>
  assertSucceeds(deleteDoc(doc(as(ADMIN), 'workspaces', WS, 'members', 'seat1'))));

await test('admin can rename the workspace', () =>
  assertSucceeds(updateDoc(doc(as(ADMIN), 'workspaces', WS), { name: 'Plot Pictures HQ' })));

await test('admin can create an invite', () =>
  assertSucceeds(
    setDoc(doc(as(ADMIN), 'invites', 'tok_new'), {
      token: 'tok_new',
      workspaceId: WS,
      workspaceName: 'Plot Pictures',
      role: 'editor',
      createdBy: ADMIN,
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
      singleUse: false,
      usedBy: [],
      revoked: false,
    }),
  ));

await test('admin cannot backdate an invite to already-expired', () =>
  assertFails(
    setDoc(doc(as(ADMIN), 'invites', 'tok_stale'), {
      token: 'tok_stale',
      workspaceId: WS,
      workspaceName: 'Plot Pictures',
      role: 'editor',
      createdBy: ADMIN,
      createdAt: Date.now(),
      expiresAt: Date.now() - 1000,
      singleUse: false,
      usedBy: [],
      revoked: false,
    }),
  ));

await test('admin of one workspace cannot create an invite for another', () =>
  assertFails(
    setDoc(doc(as(ADMIN), 'invites', 'tok_other'), {
      token: 'tok_other',
      workspaceId: 'ws_someone_else',
      workspaceName: 'Theirs',
      role: 'admin',
      createdBy: ADMIN,
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
      singleUse: false,
      usedBy: [],
      revoked: false,
    }),
  ));

/* ---------------- joining by invite ---------------- */

const joinPayload = (token, role) => ({
  uid: JOINER,
  name: 'Joiner',
  email: 'joiner@x.com',
  colour: '#2C5FE0',
  colourName: '',
  role,
  seat: false,
  addedAt: Date.now(),
  inviteToken: token,
});

await test('nobody can add themselves without an invite', () =>
  assertFails(
    setDoc(doc(as(OUTSIDER), 'workspaces', WS, 'members', OUTSIDER), {
      ...joinPayload('', 'editor'),
      uid: OUTSIDER,
    }),
  ));

await test('a viewer invite cannot be redeemed for editor', () =>
  assertFails(
    setDoc(doc(as(JOINER), 'workspaces', WS, 'members', JOINER), joinPayload('tok_viewer', 'editor')),
  ));

await test('a viewer invite cannot be redeemed for admin', () =>
  assertFails(
    setDoc(doc(as(JOINER), 'workspaces', WS, 'members', JOINER), joinPayload('tok_viewer', 'admin')),
  ));

await test('an expired invite cannot be redeemed', () =>
  assertFails(
    setDoc(doc(as(JOINER), 'workspaces', WS, 'members', JOINER), joinPayload('tok_expired', 'editor')),
  ));

await test('a spent single-use invite cannot be redeemed', () =>
  assertFails(
    setDoc(doc(as(JOINER), 'workspaces', WS, 'members', JOINER), joinPayload('tok_used', 'editor')),
  ));

await test('cannot join a workspace using another workspace\'s token', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'workspaces', 'ws2'), {
      name: 'Other',
      createdAt: Date.now(),
      createdBy: 'someone',
    });
  });
  await assertFails(
    setDoc(doc(as(JOINER), 'workspaces', 'ws2', 'members', JOINER), joinPayload('tok_editor', 'editor')),
  );
});

await test('cannot forge a membership for someone else', () =>
  assertFails(
    setDoc(doc(as(JOINER), 'workspaces', WS, 'members', OUTSIDER), {
      ...joinPayload('tok_editor', 'editor'),
      uid: OUTSIDER,
    }),
  ));

await test('a valid invite is redeemed at exactly its role', () =>
  assertSucceeds(
    setDoc(doc(as(JOINER), 'workspaces', WS, 'members', JOINER), joinPayload('tok_editor', 'editor')),
  ));

await test('joiner may append only their own uid to usedBy', () =>
  assertSucceeds(
    updateDoc(doc(as(JOINER), 'invites', 'tok_editor'), { usedBy: arrayUnion(JOINER) }),
  ));

await test('joiner cannot rewrite an invite\'s role', () =>
  assertFails(updateDoc(doc(as(JOINER), 'invites', 'tok_viewer'), { role: 'admin' })));

await test('joiner cannot extend an invite\'s expiry', () =>
  assertFails(
    updateDoc(doc(as(JOINER), 'invites', 'tok_viewer'), { expiresAt: Date.now() + 999999999 }),
  ));

/* ---------------- workspace bootstrap ---------------- */

await test('an orphaned admin row cannot be pre-seeded on a future workspace', () =>
  assertFails(
    setDoc(doc(as(OUTSIDER), 'workspaces', 'ws_squat', 'members', OUTSIDER), {
      uid: OUTSIDER,
      name: 'Squatter',
      email: 'x@x.com',
      colour: '#000',
      colourName: '',
      role: 'admin',
      seat: false,
      addedAt: Date.now(),
    }),
  ));

// The real bootstrap path: createWorkspace() writes the workspace, the
// creator's admin row, the roster seats and the default brands in one batch.
await test('the real createWorkspace batch is allowed', async () => {
  const db = as(OUTSIDER);
  const ws = doc(collection(db, 'workspaces'));
  const batch = writeBatch(db);

  batch.set(ws, { name: 'Fresh Team', createdAt: Date.now(), createdBy: OUTSIDER });
  batch.set(doc(ws, 'members', OUTSIDER), {
    uid: OUTSIDER,
    name: 'Founder',
    email: 'founder@x.com',
    colour: '#2C5FE0',
    colourName: '',
    role: 'admin',
    seat: false,
    addedAt: Date.now(),
  });
  batch.set(doc(collection(ws, 'members')), {
    uid: null,
    name: 'Sahil',
    email: null,
    colour: '#2C5FE0',
    colourName: 'Blue',
    role: 'editor',
    seat: true,
    addedAt: Date.now(),
  });
  batch.set(doc(collection(ws, 'brands')), {
    name: 'PLOT',
    colour: '#0B1F3F',
    isDefault: true,
    createdAt: Date.now(),
  });

  await assertSucceeds(batch.commit());
});

await test('a workspace cannot be created in someone else\'s name', async () => {
  const db = as(OUTSIDER);
  const ws = doc(collection(db, 'workspaces'));
  const batch = writeBatch(db);
  batch.set(ws, { name: 'Impostor', createdAt: Date.now(), createdBy: ADMIN });
  batch.set(doc(ws, 'members', OUTSIDER), {
    uid: OUTSIDER,
    name: 'Impostor',
    email: 'x@x.com',
    colour: '#000',
    colourName: '',
    role: 'admin',
    seat: false,
    addedAt: Date.now(),
  });
  await assertFails(batch.commit());
});

await test('admin can add an unclaimed roster seat', () =>
  assertSucceeds(
    setDoc(doc(as(ADMIN), 'workspaces', WS, 'members', 'seat_new'), {
      uid: null,
      name: 'Anusha',
      email: null,
      colour: '#DB2777',
      colourName: 'Pink',
      role: 'editor',
      seat: true,
      addedAt: Date.now(),
    }),
  ));

await test('editor cannot add a roster seat', () =>
  assertFails(
    setDoc(doc(as(EDITOR), 'workspaces', WS, 'members', 'seat_bad'), {
      uid: null,
      name: 'Ghost',
      email: null,
      colour: '#000',
      colourName: '',
      role: 'editor',
      seat: true,
      addedAt: Date.now(),
    }),
  ));

/* ---------------- collection group: my workspaces ---------------- */

await test('collection-group query returns only my own memberships', async () => {
  const snaps = await assertSucceeds(
    getDocs(query(collectionGroup(as(EDITOR), 'members'), where('uid', '==', EDITOR))),
  );
  assert.equal(snaps.size, 1, `expected 1 membership row, got ${snaps.size}`);
});

await test('collection-group query cannot fetch someone else\'s memberships', () =>
  assertFails(getDocs(query(collectionGroup(as(EDITOR), 'members'), where('uid', '==', ADMIN)))));

/* ---------------- presence ---------------- */

await test('member can write their own presence', () =>
  assertSucceeds(
    setDoc(doc(as(EDITOR), 'workspaces', WS, 'presence', EDITOR), {
      uid: EDITOR,
      at: Date.now(),
      editingItemId: null,
    }),
  ));

await test('member cannot spoof someone else\'s presence', () =>
  assertFails(
    setDoc(doc(as(EDITOR), 'workspaces', WS, 'presence', ADMIN), {
      uid: ADMIN,
      at: Date.now(),
      editingItemId: null,
    }),
  ));

/* ---------------- report ---------------- */

await env.cleanup();

console.log('\nFirestore rules\n');
console.log(results.join('\n'));
console.log(
  `\n${results.length - failures}/${results.length} passed${failures ? `, ${failures} FAILED` : ''}\n`,
);
process.exit(failures ? 1 : 0);
