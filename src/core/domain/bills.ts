import { MS_PER_DAY, daysBetween, fromIsoDate, toIsoDate } from './dates';
import { billOccurrenceId } from './ids';
import type {
  Bill,
  BillPayment,
  BillStatus,
  BillView,
  IsoDate,
  Recurrence,
} from './types';

/**
 * Bill timing. Countdowns are computed from `dueDate` at render time and never
 * stored — a stored "3 days left" is wrong by tomorrow (prompt0.md §6.7).
 */

/** Whole calendar days from today to `dueDate`. Negative once overdue. */
export function daysUntilDue(dueDate: IsoDate, now: Date = new Date()): number {
  return daysBetween(now, fromIsoDate(dueDate));
}

export function isPaid(bill: Bill, payments: BillPayment[]): boolean {
  return payments.some((p) => p.billId === bill.id && p.householdId === bill.householdId);
}

/**
 * Bill status. PAID wins over everything — a bill paid late is settled, not
 * still overdue.
 */
export function billStatus(
  bill: Bill,
  payments: BillPayment[],
  dueSoonDays = 3,
  now: Date = new Date(),
): BillStatus {
  if (isPaid(bill, payments)) return 'PAID';

  const days = daysUntilDue(bill.dueDate, now);
  if (days < 0) return 'OVERDUE';
  if (days === 0) return 'DUE_TODAY';
  if (days <= dueSoonDays) return 'DUE_SOON';
  return 'UPCOMING';
}

/** Human countdown copy. No timestamps — nobody needs 14:32 on a water bill. */
export function countdownLabel(status: BillStatus, days: number): string {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'OVERDUE': {
      const late = Math.abs(days);
      return late === 1 ? 'Overdue by 1 day' : `Overdue by ${late} days`;
    }
    case 'DUE_TODAY':
      return 'Due today';
    default:
      if (days === 1) return 'Due tomorrow';
      return `Due in ${days} days`;
  }
}

export function buildBillView(
  bill: Bill,
  payments: BillPayment[],
  dueSoonDays = 3,
  now: Date = new Date(),
): BillView {
  const mine = payments
    .filter((p) => p.billId === bill.id)
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt));

  return {
    bill,
    status: billStatus(bill, payments, dueSoonDays, now),
    daysUntilDue: daysUntilDue(bill.dueDate, now),
    // Show the real figure when we have it, the estimate only until then.
    displayAmount: bill.actualAmount ?? bill.estimatedAmount,
    isEstimate: bill.actualAmount === null && bill.estimatedAmount !== null,
    lastPayment: mine[0] ?? null,
  };
}

/* ---------------------------------------------------------------- recurrence */

const addMonths = (date: Date, months: number): Date => {
  const next = new Date(date);
  const targetDay = date.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  // Clamp: a bill due on the 31st falls on the 30th in a 30-day month rather
  // than silently rolling into the next one.
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(targetDay, lastDay));
  return next;
};

/** The due date of the occurrence following `from`. */
export function nextDueDate(recurrence: Recurrence, from: IsoDate): IsoDate {
  const base = fromIsoDate(from);

  const next = (() => {
    switch (recurrence.frequency) {
      case 'WEEKLY':
        return new Date(base.getTime() + 7 * MS_PER_DAY);
      case 'MONTHLY':
        return addMonths(base, 1);
      case 'QUARTERLY':
        return addMonths(base, 3);
      case 'YEARLY':
        return addMonths(base, 12);
    }
  })();

  return toIsoDate(next);
}

/** `YYYY-MM` billing period for a due date. */
export const billingPeriodFor = (dueDate: IsoDate): string => dueDate.slice(0, 7);

/**
 * The next occurrence of a recurring bill, or null if there should not be one.
 *
 * Returns null when the recurrence has ended, or when the next period already
 * exists. The derived id means that even if two devices generate concurrently,
 * the second write overwrites the first instead of creating a duplicate August
 * electricity bill (prompt0.md §9.6).
 */
export function generateNextOccurrence(
  bill: Bill,
  existing: Bill[],
  now: Date = new Date(),
): Bill | null {
  if (!bill.recurrence || !bill.active) return null;

  const nextDue = nextDueDate(bill.recurrence, bill.dueDate);

  if (bill.recurrence.endsOn && nextDue > bill.recurrence.endsOn) return null;

  const period = billingPeriodFor(nextDue);
  const id = billOccurrenceId(bill.id, period);

  if (existing.some((b) => b.id === id || (b.name === bill.name && b.billingPeriod === period))) {
    return null;
  }

  const timestamp = now.toISOString();
  return {
    ...bill,
    id,
    dueDate: nextDue,
    billingPeriod: period,
    // The new period's amount is unknown; last period's actual becomes this
    // period's estimate, which is the best guess available and clearly labelled.
    estimatedAmount: bill.actualAmount ?? bill.estimatedAmount,
    actualAmount: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
