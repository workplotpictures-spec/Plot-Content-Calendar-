'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { appUrl, auth, db, firebaseConfigured } from './firebase';
import { AVATAR_COLOURS } from './constants';
import { pickColour, safePath } from './utils';
import type { UserDoc } from './types';

const EMAIL_KEY = 'cc2026.signin.email';
const NEXT_KEY = 'cc2026.signin.next';

/** Reads the stored post-sign-in destination and clears it, so it is used once. */
export function takeStoredNext(): string | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(NEXT_KEY);
  window.localStorage.removeItem(NEXT_KEY);
  return safePath(v);
}

interface AuthValue {
  user: User | null;
  profile: UserDoc | null;
  loading: boolean;
  configured: boolean;
  sendLink: (email: string, next?: string) => Promise<void>;
  completeLink: () => Promise<'signed-in' | 'no-link' | 'need-email'>;
  completeLinkWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  setLastWorkspace: (workspaceId: string) => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

/** Creates users/{uid} on first sign-in, or returns the existing profile. */
async function ensureUserDoc(user: User): Promise<UserDoc> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { uid: user.uid, ...(snap.data() as Omit<UserDoc, 'uid'>) };

  const email = user.email ?? '';
  const profile: UserDoc = {
    uid: user.uid,
    // Nothing better than the local part of the address on a passwordless
    // first sign-in; the member can rename themselves in settings.
    name: user.displayName || email.split('@')[0] || 'Member',
    email,
    colour: pickColour(user.uid, AVATAR_COLOURS),
    createdAt: Date.now(),
    lastWorkspaceId: null,
  };
  await setDoc(ref, { ...profile, createdAtServer: serverTimestamp() });
  return profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          setProfile(await ensureUserDoc(u));
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const sendLink = useCallback(async (email: string, next?: string) => {
    const trimmed = email.trim();
    // Where to land after sign-in has to survive the trip through the inbox, so
    // it rides along on the continue URL. Without this an invited user comes
    // back to a bare /login, gets sent to /, and — owning no workspace yet —
    // is offered the "create a workspace" screen instead of the invite.
    const target = safePath(next) ?? '/';
    await sendSignInLinkToEmail(auth, trimmed, {
      url: `${appUrl()}/login?next=${encodeURIComponent(target)}`,
      handleCodeInApp: true,
    });
    // Firebase needs the address back when the link is opened. Same browser is
    // the happy path; the login page asks again when it is a different one.
    window.localStorage.setItem(EMAIL_KEY, trimmed);
    // Belt and braces: some mail clients and link scanners rewrite query
    // strings, so keep a local copy of the destination too.
    window.localStorage.setItem(NEXT_KEY, target);
  }, []);

  const completeLink = useCallback(async () => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return 'no-link' as const;
    const stored = window.localStorage.getItem(EMAIL_KEY);
    if (!stored) return 'need-email' as const;
    await signInWithEmailLink(auth, stored, window.location.href);
    window.localStorage.removeItem(EMAIL_KEY);
    return 'signed-in' as const;
  }, []);

  const completeLinkWithEmail = useCallback(async (email: string) => {
    await signInWithEmailLink(auth, email.trim(), window.location.href);
    window.localStorage.removeItem(EMAIL_KEY);
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  const setLastWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!user) return;
      await updateDoc(doc(db, 'users', user.uid), { lastWorkspaceId: workspaceId });
      setProfile((p) => (p ? { ...p, lastWorkspaceId: workspaceId } : p));
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      configured: firebaseConfigured,
      sendLink,
      completeLink,
      completeLinkWithEmail,
      signOut,
      setLastWorkspace,
    }),
    [user, profile, loading, sendLink, completeLink, completeLinkWithEmail, signOut, setLastWorkspace],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
