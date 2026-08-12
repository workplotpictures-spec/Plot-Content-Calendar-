'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { acceptInvite, readInvite, type InviteState } from '@/lib/invites';
import { ROLES } from '@/lib/constants';

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { user, profile, loading, configured } = useAuth();
  const router = useRouter();

  const [state, setState] = useState<InviteState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Reading the invite needs an authenticated caller — the rules deliberately
  // do not expose invite documents to the world. So wait until sign-in has
  // resolved before looking it up; attempting it while signed out comes back
  // permission-denied and would be reported as an invalid token.
  useEffect(() => {
    if (!configured || loading || !user) return;
    let cancelled = false;
    readInvite(token)
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch(() => {
        if (!cancelled) setState({ ok: false, reason: 'missing' });
      });
    return () => {
      cancelled = true;
    };
  }, [token, configured, loading, user]);

  const join = useCallback(async () => {
    if (!state?.ok || !profile) return;
    setBusy(true);
    setError('');
    try {
      await acceptInvite(state.invite, profile);
      router.replace(`/workspace/${state.invite.workspaceId}`);
    } catch (e) {
      setError(
        (e as { code?: string })?.code === 'permission-denied'
          ? 'This invite was refused. It may have just been revoked or already used.'
          : 'Could not join this workspace. Try the link again.',
      );
      setBusy(false);
    }
  }, [state, profile, router]);

  if (!configured) {
    return (
      <Shell title="Firebase is not configured">
        <p className="lead">
          Add your Firebase credentials to <code>.env.local</code> before invite links will work.
        </p>
      </Shell>
    );
  }

  if (loading) {
    return (
      <div className="centre">
        <div className="spin" />
      </div>
    );
  }

  // Signed out: prompt first, validate the invite once we can actually read it.
  // `next` carries the invite through the email round-trip and back to here.
  if (!user) {
    return (
      <Shell title="You have been invited">
        <p className="lead">
          Sign in to accept this invitation. You will come straight back here afterwards.
        </p>
        <Link className="btn pri" href={`/login?next=${encodeURIComponent(`/join/${token}`)}`}>
          Sign in to continue
        </Link>
      </Shell>
    );
  }

  if (state === null) {
    return (
      <div className="centre">
        <div className="spin" />
      </div>
    );
  }

  if (!state.ok) {
    const message = {
      missing: 'This invite link is not valid. Check you copied the whole link.',
      expired: 'This invite link has expired. Ask an admin for a fresh one.',
      revoked: 'This invite link was revoked by an admin.',
      used: 'This was a single-use invite and somebody has already claimed it.',
    }[state.reason];

    return (
      <Shell title="Invite unavailable">
        <div className="note bad">{message}</div>
        <Link className="btn" href="/">
          Go to your workspaces
        </Link>
      </Shell>
    );
  }

  const roleLabel = ROLES.find((r) => r.key === state.invite.role)?.label ?? state.invite.role;

  return (
    <Shell title={`Join ${state.invite.workspaceName}`}>
      <p className="lead">
        You are signed in as <b>{profile?.email}</b>. Accepting adds you to this workspace as{' '}
        <b>{roleLabel}</b>.
      </p>
      {error && <div className="note bad">{error}</div>}
      <button className="btn pri" onClick={join} disabled={busy}>
        {busy ? 'Joining…' : `Join as ${roleLabel}`}
      </button>
      <Link className="muted-link" href="/">
        Not now
      </Link>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="centre">
      <div className="card">
        <div className="mark">26</div>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
