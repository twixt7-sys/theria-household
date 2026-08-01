import type { CollectionKey, Household, HouseholdData, ItemOf } from '../domain/types';

/**
 * The only seam between the app and where household data lives.
 *
 * Deliberately small, following Finance's `TheriaRepository`: `put` is an
 * upsert so add and update share one path. Per-entity CRUD methods are what
 * produced duplicated code there.
 *
 * Unlike Finance, `subscribe` is required rather than optional — shared,
 * live household state is the product, not an enhancement (prompt0.md D2).
 */
export interface HouseholdRepository {
  /** Households this user is a member of, resolved after login. */
  listHouseholds(userId: string): Promise<Household[]>;
  getHousehold(householdId: string): Promise<Household | null>;
  createHousehold(household: Household, ownerUserId: string, ownerName: string, ownerEmail: string): Promise<void>;

  load(householdId: string): Promise<HouseholdData>;
  subscribe(householdId: string, onChange: (data: HouseholdData) => void, onError: (error: Error) => void): () => void;

  put<K extends CollectionKey>(householdId: string, collection: K, item: ItemOf<K>): Promise<void>;
  /** Soft delete. Hard removal is reserved for correcting genuine mistakes. */
  remove(householdId: string, collection: CollectionKey, id: string): Promise<void>;
  replaceAll(householdId: string, data: HouseholdData): Promise<void>;
}
