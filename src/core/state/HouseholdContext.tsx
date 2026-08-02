import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { firestoreRepository } from '../data/firestoreRepository';
import { computeHouseholdStatus, type HouseholdStatus } from '../domain/householdStatus';
import { newId } from '../domain/ids';
import { can, roleOf, type Capability } from '../domain/permissions';
import { EMPTY_HOUSEHOLD_DATA } from '../domain/types';
import type {
  CollectionKey,
  Household,
  HouseholdData,
  ItemOf,
  Role,
} from '../domain/types';
import { useAuth } from './AuthContext';

/**
 * The live household.
 *
 * One subscription feeds every screen. Household state is derived here, once,
 * so the dashboard and Homi can never disagree about whether the house is fine
 * (prompt0.md §7.6).
 */

type Phase = 'loading' | 'no-household' | 'ready' | 'error';

interface HouseholdContextValue {
  phase: Phase;
  household: Household | null;
  data: HouseholdData;
  status: HouseholdStatus;
  role: Role | null;
  can: (capability: Capability) => boolean;
  error: string | null;
  /** Firestore's own view of connectivity, surfaced in the header. */
  isOffline: boolean;
  createHousehold: (name: string) => Promise<void>;
  put: <K extends CollectionKey>(collection: K, item: ItemOf<K>) => Promise<void>;
  remove: (collection: CollectionKey, id: string) => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [phase, setPhase] = useState<Phase>('loading');
  const [household, setHousehold] = useState<Household | null>(null);
  const [data, setData] = useState<HouseholdData>(EMPTY_HOUSEHOLD_DATA);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const online = () => setIsOffline(false);
    const offline = () => setIsOffline(true);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  // Resolve which household this user belongs to.
  useEffect(() => {
    if (!user) {
      setPhase('loading');
      setHousehold(null);
      setData(EMPTY_HOUSEHOLD_DATA);
      return;
    }

    let cancelled = false;
    setPhase('loading');

    firestoreRepository
      .listHouseholds(user.id)
      .then((households) => {
        if (cancelled) return;
        if (households.length === 0) {
          setPhase('no-household');
          return;
        }
        // V1 has one active household; the model already supports more.
        setHousehold(households[0]);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        console.error('[household] could not resolve membership:', cause);
        setError('We could not load your household. Check your connection and try again.');
        setPhase('error');
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Subscribe to the resolved household. Detaching on change is what keeps a
  // signed-out user's listeners from lingering.
  useEffect(() => {
    if (!household) return;

    return firestoreRepository.subscribe(
      household.id,
      (next) => {
        setData(next);
        setPhase('ready');
      },
      (cause) => {
        console.error('[household] subscription failed:', cause);
        setError("We lost the live connection to your household. We'll keep trying.");
        setPhase('error');
      },
    );
  }, [household]);

  const role = useMemo(() => roleOf(data.members, user?.id ?? null), [data.members, user?.id]);

  // Currency reaches the status engine because the change feed formats payment
  // amounts; without it a peso household reads its own history in dollars.
  const status = useMemo(
    () => computeHouseholdStatus(data, { currency: household?.currency }),
    [data, household?.currency],
  );

  const createHousehold = useCallback(
    async (name: string) => {
      if (!user) throw new Error('Sign in before creating a household.');
      const now = new Date().toISOString();
      const created: Household = {
        id: newId(),
        name: name.trim() || 'Home',
        currency: 'PHP',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila',
        createdAt: now,
        updatedAt: now,
      };
      await firestoreRepository.createHousehold(created, user.id, user.displayName, user.email);
      setHousehold(created);
    },
    [user],
  );

  const put = useCallback<HouseholdContextValue['put']>(
    async (collection, item) => {
      if (!household) throw new Error('No active household.');
      await firestoreRepository.put(household.id, collection, item);
    },
    [household],
  );

  const remove = useCallback<HouseholdContextValue['remove']>(
    async (collection, id) => {
      if (!household) throw new Error('No active household.');
      await firestoreRepository.remove(household.id, collection, id);
    },
    [household],
  );

  const value = useMemo<HouseholdContextValue>(
    () => ({
      phase,
      household,
      data,
      status,
      role,
      can: (capability) => can(role, capability),
      error,
      isOffline,
      createHousehold,
      put,
      remove,
    }),
    [phase, household, data, status, role, error, isOffline, createHousehold, put, remove],
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
};

export function useHousehold(): HouseholdContextValue {
  const context = useContext(HouseholdContext);
  if (!context) throw new Error('useHousehold must be used inside HouseholdProvider');
  return context;
}
