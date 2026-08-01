import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import { getFirebaseApp } from './app';

let auth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!auth) auth = getAuth(app);
  return auth;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
}

export const toAuthUser = (user: User): AuthUser => ({
  id: user.uid,
  email: user.email ?? '',
  displayName: user.displayName || user.email?.split('@')[0] || 'Member',
  photoUrl: user.photoURL,
});

export function watchAuth(onChange: (user: AuthUser | null) => void): () => void {
  const instance = getFirebaseAuth();
  if (!instance) {
    onChange(null);
    return () => {};
  }
  return onAuthStateChanged(instance, (user) => onChange(user ? toAuthUser(user) : null));
}

/**
 * Auth results are returned rather than thrown, so screens render a message in
 * place instead of unwinding to an error boundary.
 */
export type AuthResult = { ok: true; user: AuthUser } | { ok: false; message: string };

const NOT_CONFIGURED: AuthResult = {
  ok: false,
  message: 'Sign-in is unavailable — this app has not been connected to Firebase yet.',
};

/** Firebase error codes are not for people. */
function humanAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address does not look right.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email and password combination did not work.';
    case 'auth/email-already-in-use':
      return 'An account already exists for that email address.';
    case 'auth/weak-password':
      return 'Please choose a password of at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled.';
    case 'auth/network-request-failed':
      return 'Could not reach the server. Check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      console.error('[auth] unhandled error:', error);
      return 'Something went wrong signing you in. Please try again.';
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const instance = getFirebaseAuth();
  if (!instance) return NOT_CONFIGURED;
  try {
    const credential = await signInWithEmailAndPassword(instance, email, password);
    return { ok: true, user: toAuthUser(credential.user) };
  } catch (error) {
    return { ok: false, message: humanAuthError(error) };
  }
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResult> {
  const instance = getFirebaseAuth();
  if (!instance) return NOT_CONFIGURED;
  try {
    const credential = await createUserWithEmailAndPassword(instance, email, password);
    if (displayName) await updateProfile(credential.user, { displayName });
    return { ok: true, user: { ...toAuthUser(credential.user), displayName } };
  } catch (error) {
    return { ok: false, message: humanAuthError(error) };
  }
}

export async function signInWithGoogle(): Promise<AuthResult> {
  const instance = getFirebaseAuth();
  if (!instance) return NOT_CONFIGURED;
  try {
    const credential = await signInWithPopup(instance, new GoogleAuthProvider());
    return { ok: true, user: toAuthUser(credential.user) };
  } catch (error) {
    return { ok: false, message: humanAuthError(error) };
  }
}

export async function signOutUser(): Promise<void> {
  const instance = getFirebaseAuth();
  if (instance) await signOut(instance);
}
