import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getFirebaseApp } from './app';

let db: Firestore | null = null;

/**
 * Firestore with offline persistence enabled.
 *
 * Persistence matters here more than it does in Finance: the overseas user is
 * often on a poor connection, and a dashboard that goes blank when the signal
 * drops fails the product's core promise. Multi-tab so two open tabs do not
 * fight over the lease.
 */
export function getDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (db) return db;

  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // Already initialised elsewhere (hot reload), or persistence unavailable
    // in this browser — fall back to the in-memory instance rather than fail.
    db = getFirestore(app);
  }

  return db;
}
