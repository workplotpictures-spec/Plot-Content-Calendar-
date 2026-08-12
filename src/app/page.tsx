'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { useAuth } from '@/lib/auth-context';
import { createWorkspace, listMyWorkspaces } from '@/lib/data';
import { useToast } from '@/components/Toasts';
import { initials } from '@/lib/utils';
import type { Role, Workspace } from '@/lib/types';

function Picker() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [list, setList] = useState<(Workspace & { role: Role })[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('Plot Pictures');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await listMyWorkspaces(user.uid);
      setList(rows);

      // Straight back to where they were, when there is no ambiguity.
      const last = profile?.lastWorkspaceId;
      if (last && rows.some((r) => r.id === last)) {
        router.replace(`/workspace/${last}`);
      } else if (rows.length === 1) {
        router.replace(`/workspace/${rows[0].id}`);
      }
    } catch {
      setList([]);
      toast('Could not load your workspaces.', 'err');
    }
  }, [user, profile?.lastWorkspaceId, router, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!profile || !user) return;
    if (!name.trim()) return toast('Give the workspace a name.', 'err');
    setBusy(true);
    try {
      const id = await createWorkspace(name, {
        uid: user.uid,
        name: profile.name,
        email: profile.email,
        colour: profile.colour,
      });
      router.replace(`/workspace/${id}`);
    } catch {
      toast('Could not create the workspace.', 'err');
      setBusy(false);
    }
  };

  if (list === null) {
    return (
      <div className="centre">
        <div className="spin" />
      </div>
    );
  }

  if (creating || list.length === 0) {
    return (
      <div className="centre">
        <div className="card">
          <div className="mark">26</div>
          <h2>{list.length ? 'New workspace' : 'Create your workspace'}</h2>
          <p className="lead">
            A workspace is one team&apos;s calendar. You will be its admin, and can invite the
            rest of the team straight afterwards.
          </p>
          <label className="fld">
            <span>Workspace name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
          </label>
          <button className="btn pri" onClick={create} disabled={busy}>
            {busy ? 'Creating…' : 'Create workspace'}
          </button>
          {list.length > 0 && (
            <button className="muted-link" onClick={() => setCreating(false)}>
              Back to your workspaces
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="centre">
      <div className="card">
        <div className="mark">26</div>
        <h2>Your workspaces</h2>
        <p className="lead">Pick the calendar you want to open.</p>

        <div className="ws-list">
          {list.map((w) => (
            <button key={w.id} className="ws-row" onClick={() => router.push(`/workspace/${w.id}`)}>
              <span className="ic">{initials(w.name)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{w.name}</b>
                <small>{w.role}</small>
              </span>
            </button>
          ))}
        </div>

        <button className="btn" style={{ marginTop: 14 }} onClick={() => setCreating(true)}>
          ＋ New workspace
        </button>
        <button className="muted-link" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthGate>
      <Picker />
    </AuthGate>
  );
}
