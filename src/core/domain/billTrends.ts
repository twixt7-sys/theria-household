import type { Bill, IsoDate, RecurrenceFrequency } from './types';

/**
 * Bill amount history and what may honestly be said about it.
 *
 * A recurring bill is stored as one document per billing period, so its
 * history is simply its siblings sorted by period. The interesting question —
 * "is electricity climbing?" — is arithmetic, not judgement, so it lives here
 * and is unit-tested (prompt0.md §7, §13.3).
 *
 * The rule that governs this file: if the data cannot support a claim, make no
 * claim (prompt0.md §9.8). A bill with two periods of history has a percentage
 * change and nothing more; it does not have a trend.
 */

export interface AmountPoint {
  billId: string;
  /** `YYYY-MM` — the period the amount covers, not when it was paid. */
  period: string;
  dueDate: IsoDate;
  amount: number;
  /** True while the statement has not arrived and this is still a guess. */
  isEstimate: boolean;
}

export type TrendDirection = 'RISING' | 'FALLING' | 'STEADY' | 'UNKNOWN';

export interface BillTrend {
  direction: TrendDirection;
  /** Consecutive periods at the end of the series moving the same way. */
  runLength: number;
  /** Latest against the period before it, as a fraction. Null below 2 points. */
  changePercent: number | null;
  /** One sentence, or null when nothing can honestly be claimed. */
  headline: string | null;
}

/** Below this, a period-on-period move is noise rather than a direction. */
export const MEANINGFUL_CHANGE = 0.05;

/** Two points is a comparison. A trend needs three. */
export const MIN_TREND_POINTS = 3;

/**
 * Occurrences of one recurring bill share a name; their ids differ by period.
 * Name is what a household actually thinks of as "the electricity bill".
 */
export const seriesKey = (bill: Bill): string =>
  `${bill.name.trim().toLowerCase()}|${bill.provider.trim().toLowerCase()}`;

/**
 * Every period of one bill, oldest first.
 *
 * Only confirmed amounts count. An estimate charted alongside actuals would
 * let a guess about next month masquerade as a measured rise.
 */
export function billHistory(
  bill: Bill,
  bills: Bill[],
  options: { includeEstimates?: boolean } = {},
): AmountPoint[] {
  const { includeEstimates = false } = options;
  const key = seriesKey(bill);

  return bills
    .filter((candidate) => seriesKey(candidate) === key)
    .map((candidate) => {
      const isEstimate = candidate.actualAmount === null;
      const amount = candidate.actualAmount ?? candidate.estimatedAmount;
      return amount === null
        ? null
        : {
            billId: candidate.id,
            period: candidate.billingPeriod,
            dueDate: candidate.dueDate,
            amount,
            isEstimate,
          };
    })
    .filter((point): point is AmountPoint => point !== null)
    .filter((point) => includeEstimates || !point.isEstimate)
    .sort((a, b) => a.period.localeCompare(b.period) || a.dueDate.localeCompare(b.dueDate));
}

/** Fractional change from `previous` to `latest`. Null when there is no base. */
export function percentChange(previous: number, latest: number): number | null {
  if (previous === 0) return null;
  return (latest - previous) / previous;
}

const PERIOD_NOUN: Record<RecurrenceFrequency, string> = {
  WEEKLY: 'week',
  MONTHLY: 'month',
  QUARTERLY: 'quarter',
  YEARLY: 'year',
};

const NUMBER_WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'] as const;

const spell = (count: number): string =>
  count < NUMBER_WORD.length ? NUMBER_WORD[count] : String(count);

const direction = (previous: number, latest: number): TrendDirection => {
  const change = percentChange(previous, latest);
  if (change === null || Math.abs(change) < MEANINGFUL_CHANGE) return 'STEADY';
  return change > 0 ? 'RISING' : 'FALLING';
};

/**
 * How the bill has been moving, and whether that is worth saying out loud.
 *
 * `runLength` counts backwards from the most recent period while the direction
 * holds, which is what makes "three months running" a countable fact rather
 * than an impression.
 */
export function analyseBillTrend(
  points: AmountPoint[],
  options: { name?: string; frequency?: RecurrenceFrequency } = {},
): BillTrend {
  if (points.length < 2) {
    return { direction: 'UNKNOWN', runLength: 0, changePercent: null, headline: null };
  }

  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const changePercent = percentChange(previous.amount, latest.amount);
  const latestDirection = direction(previous.amount, latest.amount);

  let runLength = latestDirection === 'STEADY' ? 0 : 1;
  if (latestDirection !== 'STEADY') {
    for (let i = points.length - 2; i > 0; i -= 1) {
      if (direction(points[i - 1].amount, points[i].amount) !== latestDirection) break;
      runLength += 1;
    }
  }

  return {
    direction: latestDirection,
    runLength,
    changePercent,
    headline: buildHeadline(latestDirection, runLength, changePercent, points.length, options),
  };
}

/**
 * The sentence the UI shows.
 *
 * A multi-period run is the stronger statement, so it wins when we have one.
 * A single move only earns a sentence once the series is long enough to have
 * a normal to depart from.
 */
function buildHeadline(
  trendDirection: TrendDirection,
  runLength: number,
  changePercent: number | null,
  pointCount: number,
  options: { name?: string; frequency?: RecurrenceFrequency },
): string | null {
  const name = options.name ?? 'This bill';
  const noun = options.frequency ? PERIOD_NOUN[options.frequency] : 'period';
  const verb = trendDirection === 'RISING' ? 'risen' : 'fallen';

  if (trendDirection === 'STEADY') {
    return pointCount >= MIN_TREND_POINTS ? `${name} has stayed about the same.` : null;
  }

  if (runLength >= 2) {
    return `${name} has ${verb} ${spell(runLength)} ${noun}s running.`;
  }

  if (changePercent !== null && pointCount >= MIN_TREND_POINTS) {
    const pct = Math.round(Math.abs(changePercent) * 100);
    const word = trendDirection === 'RISING' ? 'higher' : 'lower';
    return `${name} is ${pct}% ${word} than last ${noun}.`;
  }

  // Two periods of history is a comparison, not a trend. Say nothing.
  return null;
}

/** Convenience: history and analysis for one bill in one call. */
export function billTrendFor(bill: Bill, bills: Bill[]): { points: AmountPoint[]; trend: BillTrend } {
  const points = billHistory(bill, bills);
  return {
    points,
    trend: analyseBillTrend(points, {
      name: bill.name,
      frequency: bill.recurrence?.frequency,
    }),
  };
}
