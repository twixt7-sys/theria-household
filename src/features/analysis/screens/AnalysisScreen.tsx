import React, { useMemo } from 'react';
import { LineChart, WifiOff } from 'lucide-react';
import { analyseBillTrend, billHistory, seriesKey } from '../../../core/domain/billTrends';
import {
  averageDailyConsumption,
  estimatedDaysRemaining,
  typicalDurationDays,
} from '../../../core/domain/consumption';
import { generateInsights } from '../../../core/domain/insights';
import { formatCurrency, roundForDisplay } from '../../../core/domain/units';
import type { Bill } from '../../../core/domain/types';
import { useHousehold } from '../../../core/state/HouseholdContext';
import { EmptyState } from '../../../shared/components/EmptyState';
import { LoadingState } from '../../../shared/components/LoadingState';
import { TheriaCard } from '../../../shared/components/TheriaCard';
import { TrendBars } from '../../../shared/components/TrendBars';
import { Button } from '../../../shared/components/ui/button';
import { InsightCard } from '../components/InsightCard';

/**
 * Analysis.
 *
 * The governing rule is §9.8: every chart answers a stated question, and the
 * question is the title. There is deliberately no "all your items" chart here —
 * a colourful plot of every stock item answers nothing, and this screen would
 * rather be short than decorative.
 *
 * Sections disappear entirely when the data cannot support them.
 */

const MIN_TREND_PERIODS = 2;

const monthLabel = (period: string): string => {
  const [year, month] = period.split('-');
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit' }).format(
    new Date(Number(year), Number(month) - 1, 1),
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section aria-label={title} className="space-y-2">
    <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </h2>
    {children}
  </section>
);

export const AnalysisScreen: React.FC = () => {
  const { phase, data, household, error: householdError } = useHousehold();
  const currency = household?.currency ?? 'PHP';

  const insights = useMemo(() => generateInsights(data), [data]);

  /** "Drinking water typically lasts 9 days" — only where a rate is known. */
  const durations = useMemo(
    () =>
      data.stockItems
        .filter((item) => item.active && item.consumptionTrackingEnabled)
        .flatMap((item) => {
          const events = data.stockEvents.filter((event) => event.itemId === item.id);
          const rate = averageDailyConsumption(events);
          const typical = typicalDurationDays(item, rate);
          if (rate === null || typical === null) return [];

          return [
            {
              item,
              typicalDays: Math.round(typical),
              daysLeft: estimatedDaysRemaining(item.quantity, rate),
              rate,
            },
          ];
        })
        .sort((a, b) => a.typicalDays - b.typicalDays),
    [data.stockItems, data.stockEvents],
  );

  /** One entry per recurring bill with enough confirmed history to chart. */
  const billSeries = useMemo(() => {
    const seen = new Set<string>();

    return data.bills
      .filter((bill) => bill.active)
      .flatMap((bill: Bill) => {
        const key = seriesKey(bill);
        if (seen.has(key)) return [];
        seen.add(key);

        const points = billHistory(bill, data.bills);
        if (points.length < MIN_TREND_PERIODS) return [];

        const trend = analyseBillTrend(points, {
          name: bill.name,
          frequency: bill.recurrence?.frequency,
        });

        return [{ key, bill, points, trend }];
      });
  }, [data.bills]);

  if (phase === 'loading') return <LoadingState />;

  if (phase === 'error') {
    return (
      <EmptyState
        icon={WifiOff}
        title="We could not load your analysis"
        description={householdError ?? 'Check your connection and try again.'}
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        }
      />
    );
  }

  const hasAnything = insights.length > 0 || durations.length > 0 || billSeries.length > 0;

  if (!hasAnything) {
    return (
      <EmptyState
        icon={LineChart}
        title="Not enough data yet"
        description="Record a few stock updates and pay a bill or two. Once there is enough history to say something true, it will appear here."
      />
    );
  }

  return (
    <div className="space-y-6">
      {insights.length > 0 && (
        <Section title="What the numbers say">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </Section>
      )}

      {durations.length > 0 && (
        <Section title="How long things last">
          <TheriaCard size="medium" className="sm:col-span-2">
            <ul className="divide-y divide-border">
              {durations.map(({ item, typicalDays, daysLeft, rate }) => (
                <li key={item.id} className="py-2 first:pt-0 last:pb-0">
                  {/* The claim, stated plainly and hedged as an estimate. */}
                  <p className="text-xs font-medium text-foreground">
                    {item.name} typically lasts {typicalDays} {typicalDays === 1 ? 'day' : 'days'}
                  </p>
                  <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
                    About {roundForDisplay(rate)} {item.unit} a day
                    {daysLeft !== null && ` · roughly ${Math.round(daysLeft)} days left right now`}
                  </p>
                </li>
              ))}
            </ul>
          </TheriaCard>
        </Section>
      )}

      {billSeries.length > 0 && (
        <Section title="What bills are doing">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {billSeries.map(({ key, bill, points, trend }) => (
              <TheriaCard key={key} size="medium">
                {/* Title carries the finding when there is one; otherwise it
                    states the plain fact of what is being shown. */}
                <h3 className="mb-2 text-xs font-semibold leading-snug text-foreground">
                  {trend.headline ??
                    `${bill.name} across ${points.length} billing periods`}
                </h3>

                <TrendBars
                  points={points.map((point) => ({
                    id: point.billId,
                    label: monthLabel(point.period),
                    value: point.amount,
                    valueLabel: formatCurrency(point.amount, currency),
                  }))}
                />
              </TheriaCard>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};
