import { analyseBillTrend, billHistory, seriesKey } from './billTrends';
import {
  MEANINGFUL_CONSUMPTION_CHANGE,
  averageDailyConsumption,
  consumptionChange,
  estimatedDaysRemaining,
} from './consumption';
import { roundForDisplay } from './units';
import type { HouseholdData, Insight, StockEvent, StockItem, Status } from './types';

/**
 * The insight engine.
 *
 * Every insight is a claim, and this file is where claims are earned. The rule
 * from §9.8 governs the whole module: *if the data cannot support a claim, make
 * no claim* — an insight list that pads itself out with "rice is fine" trains
 * people to stop reading it.
 *
 * Insights are computed, never stored (§6.7). Ids are derived from their
 * subject so a re-render produces the same list rather than a flickering one,
 * and so the UI can key on them safely.
 */

/** Surface a depletion warning once supply is inside this horizon. */
export const DEPLETION_HORIZON_DAYS = 14;

export interface InsightOptions {
  now?: Date;
  currency?: string;
  /** Comparison window for consumption changes. */
  windowDays?: number;
}

const severityForDays = (days: number): Status =>
  days <= 3 ? 'CRITICAL' : days <= 7 ? 'WARNING' : 'GOOD';

/** "in about 3 days", "tomorrow", "today" — never a decimal. */
function horizonPhrase(days: number): string {
  const whole = Math.round(days);
  if (whole <= 0) return 'today';
  if (whole === 1) return 'tomorrow';
  return `in about ${whole} days`;
}

const eventsFor = (events: StockEvent[], itemId: string): StockEvent[] =>
  events.filter((event) => event.itemId === itemId);

/**
 * Items heading for empty inside the horizon.
 *
 * Only for items whose rate we actually know. An item with no forecast is
 * absent from this list rather than represented as "unknown" — §7.4 is explicit
 * that below the evidence bar the answer is silence, not a hedge.
 */
function depletionInsights(
  data: HouseholdData,
  now: Date,
): Insight[] {
  const generatedAt = now.toISOString();

  return data.stockItems
    .filter((item) => item.active && item.consumptionTrackingEnabled)
    .flatMap((item) => {
      const rate = averageDailyConsumption(eventsFor(data.stockEvents, item.id), now);
      const days = estimatedDaysRemaining(item.quantity, rate);
      if (days === null || days > DEPLETION_HORIZON_DAYS) return [];

      return [
        {
          id: `depletion-${item.id}`,
          householdId: item.householdId,
          kind: 'DEPLETION' as const,
          title: `${item.name} runs out ${horizonPhrase(days)}`,
          // Hedged, always: a forecast is never presented as a measurement.
          detail: `Based on recent usage, about ${roundForDisplay(rate ?? 0)} ${item.unit} a day.`,
          severity: severityForDays(days),
          subjectType: 'STOCK' as const,
          subjectId: item.id,
          generatedAt,
        },
      ];
    });
}

/** "Rice consumption rose 18% versus last month" (§9.8). */
function consumptionInsights(data: HouseholdData, now: Date, windowDays: number): Insight[] {
  const generatedAt = now.toISOString();

  return data.stockItems
    .filter((item) => item.active && item.consumptionTrackingEnabled)
    .flatMap((item) => {
      const change = consumptionChange(eventsFor(data.stockEvents, item.id), windowDays, now);
      if (change === null) return [];
      if (Math.abs(change.changePercent) < MEANINGFUL_CONSUMPTION_CHANGE) return [];

      const rose = change.changePercent > 0;
      const percent = Math.round(Math.abs(change.changePercent) * 100);

      return [
        {
          id: `consumption-${item.id}`,
          householdId: item.householdId,
          kind: 'CONSUMPTION_CHANGE' as const,
          title: `${item.name} consumption ${rose ? 'rose' : 'fell'} ${percent}% versus the previous ${windowDays} days`,
          detail: `${roundForDisplay(change.recent)} ${item.unit} used recently, against ${roundForDisplay(change.prior)} ${item.unit} before.`,
          // Using more is worth a look; using less is not a problem.
          severity: rose ? ('WARNING' as const) : ('GOOD' as const),
          subjectType: 'STOCK' as const,
          subjectId: item.id,
          generatedAt,
        },
      ];
    });
}

/** "Electricity has increased three months running" (§9.8). */
function billTrendInsights(data: HouseholdData, now: Date): Insight[] {
  const generatedAt = now.toISOString();
  const seen = new Set<string>();

  return data.bills
    .filter((bill) => bill.active)
    .flatMap((bill) => {
      // One insight per series, not one per billing period.
      const key = seriesKey(bill);
      if (seen.has(key)) return [];
      seen.add(key);

      const points = billHistory(bill, data.bills);
      const trend = analyseBillTrend(points, {
        name: bill.name,
        frequency: bill.recurrence?.frequency,
      });

      // A steady bill is not news, and neither is one we cannot read yet.
      if (trend.headline === null || trend.direction === 'STEADY') return [];

      return [
        {
          id: `bill-trend-${key}`,
          householdId: bill.householdId,
          kind: 'BILL_TREND' as const,
          title: trend.headline,
          detail: `Across ${points.length} billing periods.`,
          severity: trend.direction === 'RISING' ? ('WARNING' as const) : ('GOOD' as const),
          subjectType: 'BILL' as const,
          subjectId: bill.id,
          generatedAt,
        },
      ];
    });
}

/** Items sitting below the level the household chose to keep them at. */
function thresholdInsights(data: HouseholdData, now: Date): Insight[] {
  const generatedAt = now.toISOString();

  return data.stockItems
    .filter((item: StockItem) => item.active && item.quantity <= item.dangerThreshold)
    .map((item) => ({
      id: `threshold-${item.id}`,
      householdId: item.householdId,
      kind: 'THRESHOLD' as const,
      title: `${item.name} is below its danger level`,
      detail: `${roundForDisplay(item.quantity)} ${item.unit} left, against a danger level of ${roundForDisplay(item.dangerThreshold)} ${item.unit}.`,
      severity: 'CRITICAL' as const,
      subjectType: 'STOCK' as const,
      subjectId: item.id,
      generatedAt,
    }));
}

const SEVERITY_RANK: Record<Status, number> = {
  CRITICAL: 0,
  WARNING: 1,
  GOOD: 2,
  UNKNOWN: 3,
};

/**
 * Everything the household data will honestly support, most serious first.
 *
 * An empty array is a valid and common answer. The Analysis screen renders an
 * empty state for it rather than inventing something to say.
 */
export function generateInsights(data: HouseholdData, options: InsightOptions = {}): Insight[] {
  const { now = new Date(), windowDays = 14 } = options;

  const depletion = depletionInsights(data, now);

  // "Rice is below its danger level" and "Rice runs out in about 3 days" are
  // the same news, and the second one says when. Where both apply, the
  // threshold notice is dropped rather than shown alongside — two lines about
  // one sack of rice is how an insight list turns into wallpaper.
  const forecast = new Set(depletion.map((insight) => insight.subjectId));
  const threshold = thresholdInsights(data, now).filter(
    (insight) => !forecast.has(insight.subjectId),
  );

  return [
    ...threshold,
    ...depletion,
    ...consumptionInsights(data, now, windowDays),
    ...billTrendInsights(data, now),
  ].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.id.localeCompare(b.id),
  );
}
