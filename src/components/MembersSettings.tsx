'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BRAND_COLOURS, ROLES } from '@/lib/constants';
import {
  addSeat,
  reassignItems,
  removeMember,
  renameMember,
  setMemberRole,
  useItems,
  useMembers,
  useMyRole,
  useWorkspace,
} from '@/lib/data';
import { createInvite, inviteUrl, listInvites, revokeInvite } from '@/lib/invites';
import { useAuth } from '@/lib/auth-context';
import { initials } from '@/lib/utils';
import { useToast } from './Toasts';
import type { Invite, Member, Role } from '@/lib/types';

export default function MembersSettings({ workspaceId }: { workspaceId: string }) {
  const { user, profile } = useAuth();
  const toast = useToast();
  const uid = user!.uid;

  const { workspace, missing } = useWorkspace(workspaceId);
  const { role, checked } = useMyRole(workspaceId, uid);
  const { members } = useMembers(workspaceId);
  const { items } = useItems(workspaceId);

  const [invites, setInvites] = useState<Invite[]>([]);
  const [seatName, setSeatName] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('editor');
  const [singleUse, setSingleUse] = useState(false);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);

  const isAdmin = role === 'admin';
  const admins = members.filter((m) => m.role === 'admin' && !m.seat);

  const refreshInvites = async () => {
    if (!isAdmin) return;
    try {
      setInvites(await listInvites(workspaceId));
    } catch {
      // Rules refused, or offline. The list simply stays as it was.
    }
  };

  useEffect(() => {
    refreshInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, isAdmin]);

  if (missing) {
    return (
      <div className="centre">
        <div className="card">
          <h2>Workspace not found</h2>
          <Link className="btn pri" href="/">
            Back
          </Link>
        </div>
      </div>
    );
  }

  if (!checked || !workspace) {
    return (
      <div className="centre">
        <div className="spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="centre">
        <div className="card">
          <div className="mark">26</div>
          <h2>Admins only</h2>
          <p className="lead">
            Members and invites for <b>{workspace.name}</b> can only be managed by an admin. Your
            role is <b>{role ?? 'not a member'}</b>.
          </p>
          <Link className="btn pri" href={`/workspace/${workspaceId}`}>
            Back to the calendar
          </Link>
        </div>
      </div>
    );
  }

  const guardLastAdmin = (m: Member, nextRole?: Role) => {
    const stillAdmin = nextRole === 'admin';
    if (m.role === 'admin' && !m.seat && admins.length === 1 && !stillAdmin) {
      toast('This is the only admin — promote someone else first.', 'err');
      return true;
    }
    return false;
  };

  const changeRole = async (m: Member, next: Role) => {
    if (guardLastAdmin(m, next)) return;
    try {
      await setMemberRole(workspaceId, m.id, next);
      toast(`${m.name} is now ${next}`, 'ok');
    } catch {
      toast('Could not change that role.', 'err');
    }
  };

  const remove = async (m: Member) => {
    if (guardLastAdmin(m)) return;
    const assigned = items.filter((i) => i.assignee === m.id).length;
    const warning = assigned
      ? `\n\n${assigned} item${assigned === 1 ? '' : 's'} assigned to them will become unassigned.`
      : '';
    if (!window.confirm(`Remove ${m.name} from ${workspace.name}?${warning}`)) return;

    try {
      if (assigned) await reassignItems(workspaceId, items, m.id, '');
      await removeMember(workspaceId, m.id);
      toast(`${m.name} removed`, 'ok');
    } catch {
      toast('Could not remove that member.', 'err');
    }
  };

  const rename = async (m: Member) => {
    const next = window.prompt('Display name', m.name);
    if (next === null || !next.trim() || next === m.name) return;
    try {
      await renameMember(workspaceId, m.id, next);
    } catch {
      toast('Could not rename that member.', 'err');
    }
  };

  /** Moves a roster seat's assigned work onto a real member, then drops the seat. */
  const claimSeat = async (seat: Member) => {
    const target = members.find((m) => !m.seat && m.id === uid);
    if (!target) return;
    const n = items.filter((i) => i.assignee === seat.id).length;
    if (
      !window.confirm(
        `Take over the "${seat.name}" seat?\n\n${n} item${n === 1 ? '' : 's'} will be reassigned to you and the seat removed.`,
      )
    )
      return;
    try {
      await reassignItems(workspaceId, items, seat.id, uid);
      await removeMember(workspaceId, seat.id);
      toast(`You took over ${seat.name}`, 'ok');
    } catch {
      toast('Could not take over that seat.', 'err');
    }
  };

  const newSeat = async () => {
    const n = seatName.trim();
    if (!n) return toast('Enter a name.', 'err');
    if (members.some((m) => m.name.toLowerCase() === n.toLowerCase()))
      return toast('Someone with that name is already on the team.', 'err');
    setBusy(true);
    try {
      await addSeat(workspaceId, n, BRAND_COLOURS[members.length % BRAND_COLOURS.length]);
      setSeatName('');
      toast(`${n} added to the team`, 'ok');
    } catch {
      toast('Could not add that person.', 'err');
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    setBusy(true);
    try {
      await createInvite({
        workspaceId,
        workspaceName: workspace.name,
        role: inviteRole,
        createdBy: uid,
        expiresInDays: days,
        singleUse,
      });
      await refreshInvites();
      toast('Invite link created', 'ok');
    } catch {
      toast('Could not create the invite link.', 'err');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      toast('Link copied', 'ok');
    } catch {
      toast('Copy failed — select the link and copy it manually.', 'err');
    }
  };

  const drop = async (token: string) => {
    if (!window.confirm('Revoke this invite link? Anyone holding it will not be able to join.'))
      return;
    try {
      await revokeInvite(token);
      await refreshInvites();
      toast('Invite revoked', 'ok');
    } catch {
      toast('Could not revoke that invite.', 'err');
    }
  };

  const real = members.filter((m) => !m.seat);
  const seats = members.filter((m) => m.seat);

  return (
    <div className="settings">
      <div className="crumb">
        <Link href={`/workspace/${workspaceId}`}>‹ {workspace.name}</Link>
        <span>/ Settings</span>
      </div>

      {/* ---- members ---- */}
      <section className="panel">
        <h4>Members</h4>
        <p className="sub">People who have signed in and can open this calendar.</p>

        {real.map((m) => (
          <div className="mrow" key={m.id}>
            <span className="who-i" style={{ background: m.colour }}>
              {initials(m.name)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{m.name}</b>
              <small>{m.email || '—'}</small>
            </div>
            <div className="act">
              {m.id === uid && <span className="tag you">You</span>}
              <select
                className="mini"
                value={m.role}
                onChange={(e) => changeRole(m, e.target.value as Role)}
              >
                {ROLES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button className="btn danger sm" onClick={() => remove(m)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* ---- roster seats ---- */}
      <section className="panel">
        <h4>Team roster</h4>
        <p className="sub">
          Assignable names that nobody has signed in as yet. Work can be planned against them
          before the person has an account.
        </p>

        {seats.map((m) => {
          const n = items.filter((i) => i.assignee === m.id).length;
          return (
            <div className="mrow" key={m.id}>
              <span className="who-i" style={{ background: m.colour }}>
                {initials(m.name)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{m.name}</b>
                <small>
                  {n} item{n === 1 ? '' : 's'} assigned
                </small>
              </div>
              <div className="act">
                <span className="tag seat">Unclaimed</span>
                <button className="btn sm" onClick={() => claimSeat(m)}>
                  This is me
                </button>
                <button className="btn sm" onClick={() => rename(m)}>
                  Rename
                </button>
                <button className="btn danger sm" onClick={() => remove(m)}>
                  Remove
                </button>
              </div>
            </div>
          );
        })}

        {seats.length === 0 && <div className="drophint">No unclaimed names.</div>}

        <div className="copyrow" style={{ marginTop: 14 }}>
          <input
            type="text"
            value={seatName}
            onChange={(e) => setSeatName(e.target.value)}
            placeholder="Add someone to the roster…"
            onKeyDown={(e) => e.key === 'Enter' && newSeat()}
          />
          <button className="btn" onClick={newSeat} disabled={busy}>
            Add
          </button>
        </div>
      </section>

      {/* ---- invites ---- */}
      <section className="panel">
        <h4>Invite links</h4>
        <p className="sub">
          Anyone with the link joins at the role you choose. Revoking a link stops it working
          immediately.
        </p>

        <div className="two">
          <label className="fld">
            <span>Role</span>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label} — {r.blurb}
                </option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span>Expires in</span>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={1}>1 day</option>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={365}>1 year</option>
            </select>
          </label>
        </div>

        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#475569' }}
        >
          <input
            type="checkbox"
            checked={singleUse}
            onChange={(e) => setSingleUse(e.target.checked)}
            style={{ width: 'auto', boxShadow: 'none' }}
          />
          Single use
        </label>

        <button className="btn pri" style={{ marginTop: 12 }} onClick={generate} disabled={busy}>
          Generate invite link
        </button>

        <div style={{ marginTop: 16 }}>
          {invites.length === 0 && <div className="drophint">No active invite links.</div>}
          {invites.map((i) => {
            const expired = i.expiresAt < Date.now();
            const used = i.singleUse && i.usedBy.length > 0;
            return (
              <div className="mrow" key={i.token}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11.5 }}>
                    …{i.token.slice(-12)}
                  </b>
                  <small>
                    {i.role} · {i.singleUse ? 'single use' : 'reusable'} ·{' '}
                    {expired
                      ? 'expired'
                      : `expires ${new Date(i.expiresAt).toLocaleDateString()}`}
                    {i.usedBy.length > 0 && ` · used ${i.usedBy.length}×`}
                  </small>
                </div>
                <div className="act">
                  {(expired || used) && <span className="tag">Inactive</span>}
                  <button className="btn sm" onClick={() => copy(i.token)}>
                    Copy
                  </button>
                  <button className="btn danger sm" onClick={() => drop(i.token)}>
                    Revoke
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p style={{ fontSize: 11.5, color: 'var(--faint)', textAlign: 'center' }}>
        Signed in as {profile?.email}
      </p>
    </div>
  );
}
