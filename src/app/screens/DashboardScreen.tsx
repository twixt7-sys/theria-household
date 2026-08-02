import React, { useMemo, useState } from 'react';
import { PackageOpen } from 'lucide-react';
import { useNavigate } from 'react-router';
import { buildCategorySummaries } from '../../core/domain/categories';
import { composeDashboard } from '../../core/domain/priority';
import { useHousehold } from '../../core/state/HouseholdContext';
import { useStockActions } from '../../features/stock/hooks/useStockActions';
import { CalendarCard } from '../../features/dashboard/components/CalendarCard';
import { CategorySummaryCard } from '../../features/dashboard/components/CategorySummaryCard';
import { HouseholdStatusCard } from '../../features/dashboard/components/HouseholdStatusCard';
import { QuickActions } from '../../features/dashboard/components/QuickActions';
import { StockCard } from '../../features/dashboard/components/StockCard';
import { BillCard } from '../../features/dashboard/components/BillCard';
import { DeadlineCard } from '../../features/dashboard/components/DeadlineCard';
import { RecentChanges } from '../../features/dashboard/components/RecentChanges';
import { HanaStrip } from '../../features/hana/components/HanaStrip';
import { EmptyState } from '../../shared/components/EmptyState';
import { LoadingState } from '../../shared/components/LoadingState';
import { Button } from '../../shared/components/ui/button';
import { pathFor } from '../routes';

/**
 * The most important screen in the app.
 *
 * It renders whatever the priority engine ranks highest — there is no fixed
 * list of cards here. Paying a bill demotes it; water crossing its danger
 * threshold promotes it to hero. When everything is healthy the dashboard gets
 * calmer rather than emptier (prompt0.md §9.3).
 */
export const DashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { phase, household, data, status, error } = useHousehold();
  const { adjust, canAdjust } = useStockActions();
  const [actionError, setActionError] = useState<string | null>(null);

  const cards = useMemo(() => composeDashboard(status), [status]);

  const categorySummaries = useMemo(
    () => buildCategorySummaries(data.categories, data.stockItems),
    [data.categories, data.stockItems],
  );

  if (phase === 'loading') return <LoadingState />;

  if (phase === 'error') {
    return (
      <EmptyState
        icon={PackageOpen}
        title="We could not load your household"
        description={error ?? 'Check your connection and try again.'}
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        }
      />
    );
  }

  const currency = household?.currency ?? 'PHP';
  const hasAnything =
    data.stockItems.length > 0 || data.bills.length > 0 || data.deadlines.length > 0;

  const handleAdjust = (itemId: string) => (delta: number) => {
    const item = data.stockItems.find((i) => i.id === itemId);
    if (!item) return;
    setActionError(null);
    adjust(item, delta).catch((cause: Error) => setActionError(cause.message));
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-status-critical/30 bg-status-critical-soft px-4 py-3 text-xs text-status-critical"
        >
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <CalendarCard />
        <HouseholdStatusCard status={status} />
      </div>

      {/* Only for Managers: an Observer cannot add anything, and offering the
          door is worse than not showing it. */}
      {canAdjust && hasAnything && (
        <QuickActions
          onAddStock={() => navigate(pathFor('stock'))}
          onAddBill={() => navigate(pathFor('bills'))}
          onAddDeadline={() => navigate(pathFor('deadlines'))}
        />
      )}

      {!hasAnything ? (
        <EmptyState
          icon={PackageOpen}
          title="Your household is empty"
          description="Add the things you actually track — rice, drinking water, LPG, the electricity bill — and this screen will start answering for itself."
          action={
            canAdjust ? (
              <Button onClick={() => navigate(pathFor('stock'))}>Add your first item</Button>
            ) : undefined
          }
        />
      ) : (
        <section aria-label="Household overview">
          {/* Three columns from xl: a hero card spans two of them, so the most
              urgent thing still leads the row instead of being one tile of
              many. Card spans come from the priority engine (TheriaCard), not
              from here. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => {
              if (card.stock) {
                return (
                  <StockCard
                    key={card.id}
                    view={card.stock}
                    size={card.size}
                    canAdjust={canAdjust}
                    onAdjust={handleAdjust(card.stock.item.id)}
                  />
                );
              }
              if (card.bill) {
                return (
                  <BillCard
                    key={card.id}
                    view={card.bill}
                    size={card.size}
                    currency={currency}
                    onOpen={() => navigate(pathFor('bills'))}
                  />
                );
              }
              if (card.deadline) {
                return (
                  <DeadlineCard
                    key={card.id}
                    view={card.deadline}
                    size={card.size}
                    onOpen={() => navigate(pathFor('deadlines'))}
                  />
                );
              }
              return null;
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CategorySummaryCard
          summaries={categorySummaries}
          onOpen={() => navigate(pathFor('stock'))}
        />
        <RecentChanges changes={status.recentChanges} />
      </div>

      <HanaStrip summary={status.summary} onOpen={() => navigate(pathFor('hana'))} />
    </div>
  );
};
