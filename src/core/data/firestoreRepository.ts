import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { EMPTY_HOUSEHOLD_DATA } from '../domain/types';
import type { CollectionKey, Household, HouseholdData, HouseholdMember } from '../domain/types';
import type { HouseholdRepository } from './repository';

/**
 * Firestore implementation. Firestore is the source of truth for Household —
 * everything is household-scoped so that queries and security rules share the
 * same natural boundary.
 */

/** Firestore rejects a batch of more than 500 operations. */
const BATCH_LIMIT = 400;

/**
 * Every collection item is an object with a string id. The id becomes the
 * document id rather than being duplicated inside the document, so it is
 * stripped from the stored fields on the way out.
 */
type StoredItem = { id: string } & Record<string, unknown>;

type BatchOperation =
  | { kind: 'delete'; ref: DocumentReference }
  | { kind: 'set'; item: StoredItem };

const COLLECTIONS: CollectionKey[] = [
  'members',
  'categories',
  'stockItems',
  'stockEvents',
  'bills',
  'billPayments',
  'deadlines',
  'tasks',
  'insights',
];

const householdDoc = (db: Firestore, id: string) => doc(db, 'households', id);
const subcollection = (db: Firestore, householdId: string, key: CollectionKey) =>
  collection(db, 'households', householdId, key);

/**
 * `userHouseholds` is a membership index. A user must be able to discover
 * which households they belong to *before* they can read any household
 * document — a security rule cannot run that query on their behalf.
 */
const userHouseholdsDoc = (db: Firestore, userId: string) => doc(db, 'userHouseholds', userId);

function requireDb(): Firestore {
  const db = getDb();
  if (!db) throw new Error('Firestore is not available — check the Firebase configuration.');
  return db;
}

export const firestoreRepository: HouseholdRepository = {
  async listHouseholds(userId) {
    const db = requireDb();
    const index = await getDoc(userHouseholdsDoc(db, userId));
    const ids: string[] = index.exists() ? (index.data().householdIds ?? []) : [];
    if (ids.length === 0) return [];

    const docs = await Promise.all(ids.map((id) => getDoc(householdDoc(db, id))));
    // flatMap rather than filter+map: `exists()` narrows inside the callback,
    // so `data()` is known to be defined where it is spread.
    return docs.flatMap((d) => (d.exists() ? [{ id: d.id, ...d.data() } as Household] : []));
  },

  async getHousehold(householdId) {
    const db = requireDb();
    const snap = await getDoc(householdDoc(db, householdId));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Household) : null;
  },

  /**
   * Creating a household and its first membership must be atomic. A household
   * whose creator failed to become a Manager is unreachable by anyone,
   * including its own creator.
   */
  async createHousehold(household, ownerUserId, ownerName, ownerEmail) {
    const db = requireDb();
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    const { id, ...householdFields } = household;
    batch.set(householdDoc(db, id), householdFields);

    const member: Omit<HouseholdMember, 'id'> = {
      userId: ownerUserId,
      householdId: id,
      role: 'MANAGER',
      status: 'ACTIVE',
      displayName: ownerName,
      email: ownerEmail,
      invitedAt: null,
      joinedAt: now,
    };
    // Member doc id is the uid, so security rules can `get()` it directly
    // rather than running a query they are not allowed to run.
    batch.set(doc(db, 'households', id, 'members', ownerUserId), member);

    const index = await getDoc(userHouseholdsDoc(db, ownerUserId));
    const existing: string[] = index.exists() ? (index.data().householdIds ?? []) : [];
    batch.set(userHouseholdsDoc(db, ownerUserId), {
      householdIds: [...new Set([...existing, id])],
    });

    await batch.commit();
  },

  async load(householdId) {
    const db = requireDb();
    const entries = await Promise.all(
      COLLECTIONS.map(async (key) => {
        const snap = await getDocs(subcollection(db, householdId, key));
        return [key, snap.docs.map((d) => ({ id: d.id, ...d.data() }))] as const;
      }),
    );
    return Object.fromEntries(entries) as unknown as HouseholdData;
  },

  /**
   * One listener per collection, all torn down together.
   *
   * The dashboard needs several collections at once to compute household
   * state, so they are subscribed as a set. What is *not* done here is a
   * listener per card — that is how a 40-item household opens 40 sockets.
   */
  subscribe(householdId, onChange, onError) {
    const db = requireDb();
    // Held as a loose bag while collections stream in, then handed out as
    // HouseholdData once complete. Typing it loosely here avoids a cast per
    // collection in the snapshot handler.
    const data: Record<CollectionKey, unknown[]> = { ...EMPTY_HOUSEHOLD_DATA };
    let ready = 0;

    const unsubscribes = COLLECTIONS.map((key) =>
      onSnapshot(
        subcollection(db, householdId, key),
        (snap) => {
          data[key] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          ready += 1;
          // Emit only once every collection has reported, so the first render
          // is not a half-populated dashboard that flickers into place.
          if (ready >= COLLECTIONS.length) onChange({ ...data } as unknown as HouseholdData);
        },
        (error) => onError(error),
      ),
    );

    return () => unsubscribes.forEach((fn) => fn());
  },

  async put(householdId, collectionKey, item) {
    const db = requireDb();
    // Every collection item carries a string id; the document id is that
    // value, so it is stripped from the stored fields rather than duplicated.
    const { id, ...fields } = item as unknown as StoredItem;
    await setDoc(doc(db, 'households', householdId, collectionKey, id), fields, { merge: true });
  },

  /**
   * Hard delete, used only where a record is genuinely a mistake. Bills,
   * payments, stock events and deadlines are retired with `active: false`
   * instead — history is what makes analysis possible (prompt0.md §6.8).
   */
  async remove(householdId, collectionKey, id) {
    const db = requireDb();
    await deleteDoc(doc(db, 'households', householdId, collectionKey, id));
  },

  /**
   * Wholesale replace — used by reset and demo seeding only.
   *
   * Writes are chunked because a Firestore batch caps at 500 operations, and a
   * household with a long stock history passes that quickly.
   */
  async replaceAll(householdId, data) {
    const db = requireDb();

    for (const key of COLLECTIONS) {
      const existing = await getDocs(subcollection(db, householdId, key));
      const items = data[key] as unknown as StoredItem[];

      const operations: BatchOperation[] = [
        ...existing.docs.map((d) => ({ kind: 'delete' as const, ref: d.ref })),
        ...items.map((item) => ({ kind: 'set' as const, item })),
      ];

      for (let i = 0; i < operations.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        for (const operation of operations.slice(i, i + BATCH_LIMIT)) {
          if (operation.kind === 'delete') {
            batch.delete(operation.ref);
          } else {
            const { id, ...fields } = operation.item;
            batch.set(doc(db, 'households', householdId, key, id), fields);
          }
        }
        await batch.commit();
      }
    }
  },
};
