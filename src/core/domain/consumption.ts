import type { IsoDate, StockEvent, StockItem, StockView } from './types';
import { stockPercentage, stockStatus } from './stock';

/**
 * Consumption analysis and forecasting.
 *
 * The governing rule here is honesty: a forecast built from two data points is
 * worse than no forecast, because the user will act on it. Below the evidence
 * bar every estimate is `null` and the UI says "Not enough data yet."
 */

/** Minimum evidence before we will estimate a consumption rate. */
export const MIN_CONSUMPTION_EVENTS = 3;
export const MIN_OBSERVATION_DAYS = 7;

const MS_PER_DAY = 86_400_000;

const daysBetween = (a: Date, b: Date): number =>
  Math.abs(b.getTime() - a.getTime()) / MS_PER_DAY;

/**
 * Average daily consumption, or null when the evidence is too thin.
 *
 * Only CONSUMPTION events count. A restock is not usage, and a correction is
 * an admission that the record was wrong — folding either into the rate would
 * make a well-stocked cupboard look like a fast-emptying one.
 */
export function averageDailyConsumption(
  events: StockEvent[],
  now: Date = new Date(),
): number | null {
  const consumption = events
    .filter((e) => e.type === 'CONSUMPTION')
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (consumption.length < MIN_CONSUMPTION_EVENTS) return null;

  const first = new Date(consumption[0].timestamp);
  const last = new Date(consumption[consumption.length - 1].timestamp);
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) return null;

  // Measure to now, not to the last event: a cupboard untouched for a month is
  // genuinely being consumed more slowly, and pretending otherwise would keep
  // showing an alarming depletion date that never arrives.
  const observed = Math.max(daysBetween(first, now), daysBetween(first, last));
  if (observed < MIN_OBSERVATION_DAYS) return null;

  const consumed = consumption.reduce((sum, e) => sum + Math.abs(e.delta), 0);
  if (consumed <= 0) return null;

  return consumed / observed;
}

/** Days of supply left at the current rate, or null when unknown. */
export function estimatedDaysRemaining(quantity: number, rate: number | null): number | null {
  if (rate === null || rate <= 0) return null;
  if (quantity <= 0) return 0;
  return quantity / rate;
}

/** Calendar date the item is projected to run out, or null when unknown. */
export function estimatedDepletionDate(
  daysRemaining: number | null,
  now: Date = new Date(),
): IsoDate | null {
  if (daysRemaining === null) return null;
  const date = new Date(now.getTime() + daysRemaining * MS_PER_DAY);
  return date.toISOString().slice(0, 10);
}

/**
 * Direction of travel, by comparing the most recent window against the one
 * before it. Needs two full windows, so it stays UNKNOWN for a while after an
 * item is created — which is correct.
 */
export function consumptionTrend(
  events: StockEvent[],
  windowDays = 14,
  now: Date = new Date(),
): StockView['trend'] {
  const consumption = events.filter((e) => e.type === 'CONSUMPTION');
  if (consumption.length < MIN_CONSUMPTION_EVENTS * 2) return 'UNKNOWN';

  const recentStart = new Date(now.getTime() - windowDays * MS_PER_DAY);
  const priorStart = new Date(now.getTime() - windowDays * 2 * MS_PER_DAY);

  const sumIn = (from: Date, to: Date) =>
    consumption
      .filter((e) => {
        const at = new Date(e.timestamp);
        return at >= from && at < to;
      })
      .reduce((sum, e) => sum + Math.abs(e.delta), 0);

  const recent = sumIn(recentStart, now);
  const prior = sumIn(priorStart, recentStart);

  if (prior <= 0) return 'UNKNOWN';

  const change = (recent - prior) / prior;
  if (change > 0.15) return 'RISING';
  if (change < -0.15) return 'FALLING';
  return 'STEADY';
}

/**
 * Assembles the full derived view of an item. This is what the UI renders and
 * what Homi's snapshot is built from, so both see exactly the same numbers.
 */
export function buildStockView(
  item: StockItem,
  events: StockEvent[],
  now: Date = new Date(),
): StockView {
  const itemEvents = events.filter((e) => e.itemId === item.id);
  const rate = item.consumptionTrackingEnabled
    ? averageDailyConsumption(itemEvents, now)
    : null;
  const daysRemaining = estimatedDaysRemaining(item.quantity, rate);

  return {
    item,
    percentage: stockPercentage(item),
    status: stockStatus(item),
    averageDailyConsumption: rate,
    estimatedDaysRemaining: daysRemaining,
    estimatedDepletionDate: estimatedDepletionDate(daysRemaining, now),
    trend: item.consumptionTrackingEnabled ? consumptionTrend(itemEvents, 14, now) : 'UNKNOWN',
  };
}
