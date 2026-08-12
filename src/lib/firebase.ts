import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

/** Local development against `firebase emulators:start` — no real project needed. */
export const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === '1';

/** True when .env.local has actually been filled in. */
export const firebaseConfigured = Boolean((apiKey && projectId) || useEmulators);

/**
 * Placeholders keep initializeApp/getAuth from throwing when the app is built
 * without credentials — CI, a first clone, a preview deploy before the env vars
 * are set. Nothing can talk to Firebase in that state, and every screen checks
 * `firebaseConfigured` and shows the setup card instead.
 */
const config: FirebaseOptions = {
  apiKey: apiKey || 'not-configured',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'not-configured.firebaseapp.com',
  projectId: projectId || 'not-configured',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'not-configured.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
};

const app = getApps().length ? getApp() : initializeApp(config);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connect once, in the browser only. The SDK throws if this runs twice, so the
// flag is parked on globalThis to survive fast-refresh remounts.
const g = globalThis as { __ccEmulators?: boolean };
if (useEmulators && typeof window !== 'undefined' && !g.__ccEmulators) {
  g.__ccEmulators = true;
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}

export default app;

/** Origin used to build sign-in and invite links. */
export function appUrl() {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
