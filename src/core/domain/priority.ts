import { deviationFromPreferred } from './stock';
import { isApproaching } from './deadlines';
import type { HouseholdStatus } from './householdStatus';
import type { BillView, DeadlineView, Priority, StockView } from './types';

/**
 * Dashboard composition.
 *
 * Priority is a transparent, testable function — deliberately not a model
 * judgement (prompt0.md §7.7). An opaque ranking would make the dashboard
 * unpredictable, unexplainable and impossible to unit-test, and card ordering
 * is not a problem that needs intelligence.
 */

export type CardSize = 'hero' | 'large' | 'medium' | 'compact';

export interface DashboardCard {
  id: string;
  kind: 'STOCK' | 'BILL' | 'DEADLINE';
  size: CardSize;
  score: number;
  stock?: StockView;
  bill?: BillView;
  deadline?: DeadlineView;
}

const USER_PRIORITY_WEIGHT: Record<Priority, number> = {
  CRITICAL: 15,
  HIGH: 10,
  NORMAL: 5,
  LOW: 0,
};

const SEVERITY_WEIGHT = { CRITICAL: 40, WARNING: 20, GOOD: 0, UNKNOWN: 5 } as const;

/** Recently-changed items surface briefly, then settle back down. */
const RECENCY_WINDOW_HOURS = 24;
const RECENCY_WEIGHT = 6;

function recencyBoost(timestamp: string | undefined, now: Date): number {
  if (!timestamp) return 0;
  const at = new Date(timestamp).getTime();
  if (Number.isNaN(at)) return 0;
  const hours = (now.getTime() - at) / 3_600_000;
  if (hours < 0 || hours > RECENCY_WINDOW_HOURS) return 0;
  return RECENCY_WEIGHT * (1 - hours / RECENCY_WINDOW_HOURS);
}

/**
 * Time pressure. Steep near the due date and flat far from it, because the
 * difference between "due tomorrow" and "due today" matters far more than the
 * difference between 20 and 21 days out.
 */
function urgencyFromDays(days: number): number {
  if (days < 0) return 50 + Math.min(Math.abs(days), 10) * 2; // overdue, worsening
  if (days === 0) return 45;
  if (days === 1) return 35;
  if (days <= 3) return 25;
  if (days <= 7) return 12;
  if (days <= 14) return 5;
  return 0;
}

export function scoreStock(view: StockView, now: Date = new Date()): number {
  const severity = SEVERITY_WEIGHT[view.status];
  const userPriority = USER_PRIORITY_WEIGHT[view.item.priority];
  const deviation = deviationFromPreferred(view.item) * 20;

  // A forecast of imminent depletion is urgent even while the raw quantity
  // still sits above the warning threshold.
  const depletion =
    view.estimatedDaysRemaining !== null ? urgencyFromDays(Math.floor(view.estimatedDaysRemaining)) * 0.5 : 0;

  return severity + userPriority + deviation + depletion + recencyBoost(view.item.updatedAt, now);
}

export function scoreBill(view: BillView, now: Date = new Date()): number {
  // A settled bill is information, not a demand on attention.
  if (view.status === 'PAID') return 0;

  const urgency = urgencyFromDays(view.daysUntilDue);
  const userPriority = USER_PRIORITY_WEIGHT[view.bill.priority];
  return urgency + userPriority + recencyBoost(view.bill.updatedAt, now);
}

export function scoreDeadline(view: DeadlineView, now: Date = new Date()): number {
  if (view.status === 'DONE') return 0;

  const urgency = urgencyFromDays(view.daysUntil);
  const userPriority = USER_PRIORITY_WEIGHT[view.deadline.priority];
  // Deadlines sit just below bills at equal urgency: a due bill costs money,
  // a due deadline usually costs a reminder.
  return urgency * 0.9 + userPriority + recencyBoost(view.deadline.updatedAt, now);
}

/** Size follows score, so the loudest card is always the most important one. */
export function sizeForScore(score: number): CardSize {
  if (score >= 50) return 'hero';
  if (score >= 30) return 'large';
  if (score >= 12) return 'medium';
  return 'compact';
}

export interface ComposeOptions {
  now?: Date;
  deadlineLeadDays?: number;
  /** Cap so a large household does not render 80 cards on the home screen. */
  limit?: number;
}

/**
 * Ranks everything worth showing into one ordered list.
 *
 * Note that state outranks configured priority: a LOW-priority bill that has
 * gone overdue still scores above a HIGH-priority one due in three weeks
 * (prompt0.md §7.7).
 */
export function composeDashboard(
  status: HouseholdStatus,
  options: ComposeOptions = {},
): DashboardCard[] {
  const { now = new Date(), deadlineLeadDays = 14, limit = 24 } = options;

  const cards: DashboardCard[] = [
    ...status.stockViews.map((stock) => {
      const score = scoreStock(stock, now);
      return { id: `stock-${stock.item.id}`, kind: 'STOCK' as const, size: sizeForScore(score), score, stock };
    }),

    ...status.billViews
      .filter((bill) => bill.status !== 'PAID')
      .map((bill) => {
        const score = scoreBill(bill, now);
        return { id: `bill-${bill.bill.id}`, kind: 'BILL' as const, size: sizeForScore(score), score, bill };
      }),

    ...status.deadlineViews
      .filter((deadline) => isApproaching(deadline, deadlineLeadDays) || deadline.status === 'MISSED')
      .map((deadline) => {
        const score = scoreDeadline(deadline, now);
        return {
          id: `deadline-${deadline.deadline.id}`,
          kind: 'DEADLINE' as const,
          size: sizeForScore(score),
          score,
          deadline,
        };
      }),
  ];

  return cards
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}
