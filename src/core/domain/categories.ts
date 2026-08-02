import { stockStatus } from './stock';
import type { Category, StockItem, Status } from './types';

/**
 * Category rollups for the dashboard: "KITCHEN · 12 items · 2 low"
 * (prompt0.md §9.3).
 *
 * A summary is a count, not a judgement. The worst item in a category sets the
 * category's status, because a kitchen containing one empty rice sack is not
 * "mostly fine" — averaging would hide exactly the thing worth seeing.
 */

export interface CategorySummary {
  category: Category;
  itemCount: number;
  lowCount: number;
  criticalCount: number;
  /** The worst status among the category's items. */
  status: Status;
  /** Deterministic copy — the AI may rephrase it, never originate it. */
  detail: string;
}

/** Worst-wins, with UNKNOWN as the honest answer for a category with no items. */
function worstStatus(statuses: Status[]): Status {
  if (statuses.length === 0) return 'UNKNOWN';
  if (statuses.includes('CRITICAL')) return 'CRITICAL';
  if (statuses.includes('WARNING')) return 'WARNING';
  if (statuses.includes('GOOD')) return 'GOOD';
  return 'UNKNOWN';
}

const plural = (count: number, word: string): string =>
  `${count} ${count === 1 ? word : `${word}s`}`;

/**
 * "12 items · 2 low", "3 items · 1 critical", "8 items · all good".
 *
 * Critical is named before low because it is the one that changes what someone
 * does today.
 */
export function summaryDetail(itemCount: number, lowCount: number, criticalCount: number): string {
  const items = plural(itemCount, 'item');
  if (itemCount === 0) return 'No items yet';

  const parts: string[] = [];
  if (criticalCount > 0) parts.push(`${criticalCount} critical`);
  if (lowCount > 0) parts.push(`${lowCount} low`);

  return parts.length === 0 ? `${items} · all good` : `${items} · ${parts.join(', ')}`;
}

/**
 * One summary per active category that actually holds something.
 *
 * Empty categories are dropped rather than rendered as zeroes — a dashboard
 * section with nothing to say does not render at all (§9.3).
 */
export function buildCategorySummaries(
  categories: Category[],
  stockItems: StockItem[],
): CategorySummary[] {
  const active = stockItems.filter((item) => item.active);

  return categories
    .filter((category) => category.active)
    .map((category) => {
      const items = active.filter((item) => item.categoryId === category.id);
      const statuses = items.map((item) => stockStatus(item));

      const lowCount = statuses.filter((s) => s === 'WARNING').length;
      const criticalCount = statuses.filter((s) => s === 'CRITICAL').length;

      return {
        category,
        itemCount: items.length,
        lowCount,
        criticalCount,
        status: worstStatus(statuses),
        detail: summaryDetail(items.length, lowCount, criticalCount),
      };
    })
    .filter((summary) => summary.itemCount > 0)
    // Categories needing attention rise; ties fall back to the household's own
    // configured priority, then to name so the order never jitters.
    .sort((a, b) => {
      const rank = (s: CategorySummary) =>
        s.status === 'CRITICAL' ? 0 : s.status === 'WARNING' ? 1 : 2;
      return rank(a) - rank(b) || a.category.name.localeCompare(b.category.name);
    });
}
