/**
 * Firebase web config. These values are not secrets — they ship in every
 * client bundle and identify the project rather than authenticating it.
 * Access is controlled by Firestore security rules and App Check.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY;
export const appCheckDebugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;

/**
 * Unlike Finance, Household is not usable signed-out — a household is shared
 * state and there is nothing meaningful to show without one. A missing config
 * is therefore a setup error we surface plainly rather than degrade around.
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);
