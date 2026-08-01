import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  ReCaptchaV3Provider,
  initializeAppCheck,
  type AppCheck,
} from 'firebase/app-check';
import { appCheckDebugToken, firebaseConfig, isFirebaseConfigured, recaptchaSiteKey } from './config';

let app: FirebaseApp | null = null;
let appCheck: AppCheck | null = null;

/** Null when Firebase is not configured. Callers must handle that. */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  if (app) return app;

  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  initAppCheck(app);
  return app;
}

/**
 * App Check attests that requests come from our app rather than a script with
 * a copied config. It is what makes the client-side AI Logic call safe, so it
 * is initialised alongside the app rather than lazily.
 */
function initAppCheck(instance: FirebaseApp): void {
  if (appCheck || !recaptchaSiteKey) return;

  if (import.meta.env.DEV && appCheckDebugToken) {
    // Lets localhost attest during development.
    (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      appCheckDebugToken;
  }

  try {
    appCheck = initializeAppCheck(instance, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    // A failed attestation must not take the whole app down; Firestore rules
    // are still enforcing access on their own.
    console.error('[firebase] App Check init failed:', error);
  }
}
