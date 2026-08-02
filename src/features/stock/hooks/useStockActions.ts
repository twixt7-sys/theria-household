import { useCallback } from 'react';
import { useAuth } from '../../../core/state/AuthContext';
import { useHousehold } from '../../../core/state/HouseholdContext';
import { refusalMessage } from '../../../core/domain/permissions';
import type { StockItem } from '../../../core/domain/types';
import { adjustStock, correctStock } from '../lib/adjustStock';

/**
 * Stock mutations, permission-checked in one place.
 *
 * Components call these; they never touch the repository directly. The role
 * check here is UX — Firestore rules reject the write independently — but it
 * lets an Observer get a sentence instead of a stack trace.
 */
export function useStockActions() {
  const { user } = useAuth();
  const { put, can } = useHousehold();

  const adjust = useCallback(
    async (item: StockItem, delta: number) => {
      if (!can('stock:adjust')) throw new Error(refusalMessage('stock:adjust'));
      if (!user) throw new Error('You need to be signed in to change stock.');
      if (delta === 0) return;

      const { item: updated, event } = adjustStock(item, delta, user.id);

      // Event first: if the second write fails, the household is left with a
      // recorded change that did not take effect, which is recoverable. The
      // reverse — a changed quantity with no trace of who changed it — is not.
      await put('stockEvents', event);
      await put('stockItems', updated);
    },
    [can, put, user],
  );

  const correct = useCallback(
    async (item: StockItem, actualQuantity: number) => {
      if (!can('stock:adjust')) throw new Error(refusalMessage('stock:adjust'));
      if (!user) throw new Error('You need to be signed in to change stock.');

      const { item: updated, event } = correctStock(item, actualQuantity, user.id);
      await put('stockEvents', event);
      await put('stockItems', updated);
    },
    [can, put, user],
  );

  /**
   * Creates or updates an item.
   *
   * When an edit changes the counted quantity, a CORRECTION event is written
   * alongside it: someone recounted the cupboard and the record was wrong, and
   * that is exactly what CORRECTION means. Without it the level would jump with
   * no author and no trace, and the consumption rate would be computed across a
   * gap it cannot see (prompt0.md §6.8).
   */
  const save = useCallback(
    async (item: StockItem, previous?: StockItem) => {
      if (!can('stock:write')) throw new Error(refusalMessage('stock:write'));

      const next = { ...item, updatedAt: new Date().toISOString() };

      if (previous && previous.quantity !== next.quantity && user) {
        const { event } = correctStock(previous, next.quantity, user.id);
        await put('stockEvents', event);
      }

      await put('stockItems', next);
      return next;
    },
    [can, put, user],
  );

  /** Retire rather than delete — history stays intact (prompt0.md §6.8). */
  const archive = useCallback(
    async (item: StockItem) => {
      if (!can('stock:write')) throw new Error(refusalMessage('stock:write'));
      await put('stockItems', { ...item, active: false, updatedAt: new Date().toISOString() });
    },
    [can, put],
  );

  return {
    adjust,
    correct,
    save,
    archive,
    canAdjust: can('stock:adjust'),
    canWrite: can('stock:write'),
  };
}
