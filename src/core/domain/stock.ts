import type { Packaging, StockItem, Status } from './types';

/**
 * Stock arithmetic. Pure, deterministic, and the only place these formulas
 * exist — the AI never computes them (prompt0.md §13.3).
 */

/** Percentage of maximum. Guards a zero max rather than returning NaN. */
export function stockPercentage(item: Pick<StockItem, 'quantity' | 'maxQuantity'>): number {
  if (item.maxQuantity <= 0) return 0;
  return (item.quantity / item.maxQuantity) * 100;
}

/** Total quantity implied by a packaging breakdown. */
export function packagedTotal(packaging: Packaging): number {
  return packaging.sealedPacks * packaging.packSize + packaging.openQuantity;
}

/**
 * Keeps `quantity` in step with a packaging change. Packaging is the source of
 * truth for packaged items; quantity is the derived total we store so that
 * queries and thresholds work uniformly across both kinds of item.
 */
export function withPackaging(item: StockItem, packaging: Packaging): StockItem {
  return { ...item, packaging, quantity: packagedTotal(packaging) };
}

/**
 * Status from per-item thresholds.
 *
 * Thresholds are configured per item, never as a global percentage rule: 8kg of
 * rice and 8 bars of soap mean completely different things.
 *
 * The `preferredQuantity` band is what makes the dashboard useful — an item can
 * be below where the household likes to keep it without being anywhere near
 * urgent, and the UI needs to say so without crying wolf.
 */
export function stockStatus(
  item: Pick<
    StockItem,
    'quantity' | 'dangerThreshold' | 'warningThreshold' | 'preferredQuantity'
  >,
): Status {
  if (item.quantity <= item.dangerThreshold) return 'CRITICAL';
  if (item.quantity <= item.warningThreshold) return 'WARNING';
  if (item.quantity < item.preferredQuantity) return 'WARNING';
  return 'GOOD';
}

/**
 * How far below the preferred level, 0..1. Feeds the priority engine so that
 * "nearly out" outranks "slightly low" without either needing a hand-set
 * priority.
 */
export function deviationFromPreferred(
  item: Pick<StockItem, 'quantity' | 'preferredQuantity'>,
): number {
  if (item.preferredQuantity <= 0) return 0;
  const shortfall = item.preferredQuantity - item.quantity;
  if (shortfall <= 0) return 0;
  return Math.min(shortfall / item.preferredQuantity, 1);
}

export interface ThresholdProblem {
  field: keyof StockItem;
  message: string;
}

/**
 * Validates the ordering the whole status model assumes:
 *   0 <= danger < warning < preferred <= max
 *
 * Run at form and service boundaries both. A household that saves
 * `warning: 5, danger: 10` would otherwise get a permanently CRITICAL item and
 * no explanation for it.
 */
export function validateThresholds(
  item: Pick<
    StockItem,
    'quantity' | 'dangerThreshold' | 'warningThreshold' | 'preferredQuantity' | 'maxQuantity'
  >,
): ThresholdProblem[] {
  const problems: ThresholdProblem[] = [];

  if (item.quantity < 0) {
    problems.push({ field: 'quantity', message: 'Quantity cannot be negative.' });
  }
  if (item.dangerThreshold < 0) {
    problems.push({ field: 'dangerThreshold', message: 'Danger level cannot be negative.' });
  }
  if (item.dangerThreshold >= item.warningThreshold) {
    problems.push({
      field: 'dangerThreshold',
      message: 'Danger level must be below the warning level.',
    });
  }
  if (item.warningThreshold >= item.preferredQuantity) {
    problems.push({
      field: 'warningThreshold',
      message: 'Warning level must be below the preferred level.',
    });
  }
  if (item.preferredQuantity > item.maxQuantity) {
    problems.push({
      field: 'preferredQuantity',
      message: 'Preferred level cannot exceed the maximum.',
    });
  }
  if (item.maxQuantity <= 0) {
    problems.push({ field: 'maxQuantity', message: 'Maximum must be greater than zero.' });
  }

  return problems;
}

/**
 * Overflow is allowed — a household really can buy 30kg into a 25kg max — but
 * the UI flags it so the max can be corrected rather than silently ignored.
 */
export function isOverflowing(item: Pick<StockItem, 'quantity' | 'maxQuantity'>): boolean {
  return item.maxQuantity > 0 && item.quantity > item.maxQuantity;
}
