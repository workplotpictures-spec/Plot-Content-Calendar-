'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { takeStoredNext, useAuth } from '@/lib/auth-context';
import { safePath } from '@/lib/utils';
import { useToast } from '@/components/Toasts';

type Stage = 'form' | 'sent' | 'completing' | 'need-email';

function LoginInner() {
  const { user, loading, configured, sendLink, completeLink, completeLinkWithEmail } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const next = safePath(params.get('next'));
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState<Stage>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // If we landed here from the emailed link, finish the sign-in.
  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await completeLink();
        if (cancelled) return;
        if (result === 'signed-in') setStage('completing');
        else if (result === 'need-email') setStage('need-email');
      } catch (e) {
        if (!cancelled) setError(readableError(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, completeLink]);

  // Once signed in, leave for wherever we were headed. The query string wins;
  // the stored copy covers a link whose params got rewritten in transit.
  const redirected = useRef(false);
  useEffect(() => {
    if (loading || !user || redirected.current) return;
    redirected.current = true;
    router.replace(next ?? takeStoredNext() ?? '/');
  }, [loading, user, next, router]);

  if (!configured) {
    return (
      <div className="centre">
        <div className="card">
          <div className="mark">26</div>
          <h2>Firebase is not configured</h2>
          <p className="lead">
            Copy <code>.env.example</code> to <code>.env.local</code>, fill in your Firebase web
            app credentials, then restart the dev server. <code>SETUP.md</code> has the full
            walkthrough.
          </p>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError('Enter your email address.');
    setBusy(true);
    setError('');
    try {
      if (stage === 'need-email') {
        await completeLinkWithEmail(email);
        setStage('completing');
      } else {
        await sendLink(email, next ?? undefined);
        setStage('sent');
      }
    } catch (e) {
      setError(readableError(e));
      toast('Could not send the sign-in link.', 'err');
    } finally {
      setBusy(false);
    }
  };

  if (stage === 'completing' || (loading && stage !== 'form')) {
    return (
      <div className="centre">
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="spin" />
          <p className="lead" style={{ marginTop: 16, marginBottom: 0 }}>
            Signing you in…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="centre">
      <div className="card">
        <div className="mark">26</div>

        {stage === 'sent' ? (
          <>
            <h2>Check your inbox</h2>
            <p className="lead">
              We sent a sign-in link to <b>{email}</b>. Open it on this device and you will be
              signed straight in — no password needed.
            </p>
            <div className="note">
              The link works once and expires. If it does not arrive within a minute, check spam.
            </div>
            <button className="btn" onClick={() => setStage('form')}>
              Use a different address
            </button>
          </>
        ) : (
          <>
            <h2>{stage === 'need-email' ? 'Confirm your email' : '2026 Content Calendar'}</h2>
            <p className="lead">
              {stage === 'need-email'
                ? 'You opened the sign-in link in a different browser than the one that requested it. Enter the address the link was sent to.'
                : 'Sign in with a one-time link sent to your email. No password to remember.'}
            </p>

            {error && <div className="note bad">{error}</div>}

            <form onSubmit={submit}>
              <label className="fld">
                <span>Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoFocus
                  required
                />
              </label>
              <button className="btn pri" type="submit" disabled={busy}>
                {busy ? 'Working…' : stage === 'need-email' ? 'Finish sign-in' : 'Email me a link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function readableError(e: unknown) {
  const code = (e as { code?: string })?.code || '';
  if (code === 'auth/invalid-email') return 'That does not look like a valid email address.';
  if (code === 'auth/invalid-action-code')
    return 'This sign-in link has already been used or has expired. Request a new one.';
  if (code === 'auth/unauthorized-continue-uri')
    return 'This domain is not in the Firebase authorised domains list. Add it under Authentication → Settings.';
  if (code === 'auth/operation-not-allowed')
    return 'Email link sign-in is not enabled for this Firebase project yet.';
  return (e as Error)?.message || 'Something went wrong. Try again.';
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="centre">
          <div className="spin" />
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
