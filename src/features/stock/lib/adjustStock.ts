import { newId } from '../../../core/domain/ids';
import { packagedTotal } from '../../../core/domain/stock';
import type { Packaging, StockEvent, StockEventType, StockItem } from '../../../core/domain/types';

/**
 * Turning a tap into a record.
 *
 * Every adjustment produces both the updated item and an immutable event, so
 * the household always has a traceable answer to "who changed this, when, and
 * from what?" (prompt0.md §6.8).
 */

export interface Adjustment {
  item: StockItem;
  event: StockEvent;
}

/** A negative delta is consumption; a positive one is a restock. */
export function classifyDelta(delta: number): StockEventType {
  return delta < 0 ? 'CONSUMPTION' : 'RESTOCK';
}

const REASONS: Record<StockEventType, string> = {
  CONSUMPTION: 'Used',
  RESTOCK: 'Restocked',
  ADJUSTMENT: 'Adjusted',
  CORRECTION: 'Corrected',
};

/**
 * Redistributes a total back across sealed packs and the open one, so
 * "3 packs + 2.2 kg" stays true after a −1 kg tap.
 */
function repackage(packaging: Packaging, newTotal: number): Packaging {
  const { packSize } = packaging;
  if (packSize <= 0) return { ...packaging, sealedPacks: 0, openQuantity: newTotal };

  const sealedPacks = Math.floor(newTotal / packSize);
  const openQuantity = Math.round((newTotal - sealedPacks * packSize) * 1000) / 1000;
  return { ...packaging, sealedPacks, openQuantity };
}

export function adjustStock(
  item: StockItem,
  delta: number,
  actorId: string,
  options: { type?: StockEventType; reason?: string; now?: Date } = {},
): Adjustment {
  const { now = new Date() } = options;
  const type = options.type ?? classifyDelta(delta);

  const previousQuantity = item.quantity;
  // Never below zero: a cupboard cannot hold −2kg, and a negative quantity
  // would poison every downstream percentage and forecast.
  const newQuantity = Math.max(0, Math.round((previousQuantity + delta) * 1000) / 1000);
  const appliedDelta = Math.round((newQuantity - previousQuantity) * 1000) / 1000;

  const timestamp = now.toISOString();

  const updated: StockItem = {
    ...item,
    quantity: newQuantity,
    packaging: item.packaging ? repackage(item.packaging, newQuantity) : null,
    updatedAt: timestamp,
  };

  const event: StockEvent = {
    id: newId(),
    householdId: item.householdId,
    itemId: item.id,
    type,
    previousQuantity,
    newQuantity,
    delta: appliedDelta,
    reason: options.reason ?? REASONS[type],
    actorId,
    timestamp,
  };

  return { item: updated, event };
}

/**
 * A correction sets an absolute quantity rather than applying a delta — for
 * when someone counts the cupboard and finds the record was simply wrong.
 * Recorded as CORRECTION so it never pollutes the consumption rate.
 */
export function correctStock(
  item: StockItem,
  actualQuantity: number,
  actorId: string,
  now: Date = new Date(),
): Adjustment {
  return adjustStock(item, actualQuantity - item.quantity, actorId, {
    type: 'CORRECTION',
    reason: 'Corrected after a count',
    now,
  });
}

/** Rebuilds an item from a packaging edit, keeping the total consistent. */
export function applyPackaging(item: StockItem, packaging: Packaging): StockItem {
  return { ...item, packaging, quantity: packagedTotal(packaging), updatedAt: new Date().toISOString() };
}
