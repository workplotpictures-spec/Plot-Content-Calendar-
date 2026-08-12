'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/** Sends signed-out visitors to /login and brings them back afterwards. */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, configured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && configured && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, configured, router, pathname]);

  if (!configured) {
    return (
      <div className="centre">
        <div className="card">
          <div className="mark">26</div>
          <h2>Firebase is not configured</h2>
          <p className="lead">
            Copy <code>.env.example</code> to <code>.env.local</code>, add your Firebase web app
            credentials and restart the dev server. See <code>SETUP.md</code>.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="centre">
        <div className="spin" />
      </div>
    );
  }

  return <>{children}</>;
}
