import React, { useMemo, useState } from 'react';
import { PackageOpen, Plus, Search, WifiOff } from 'lucide-react';
import { buildStockView } from '../../../core/domain/consumption';
import { formatDaysRemaining, formatQuantity } from '../../../core/domain/units';
import type { StockItem, Status } from '../../../core/domain/types';
import { useHousehold } from '../../../core/state/HouseholdContext';
import { EmptyState } from '../../../shared/components/EmptyState';
import { LoadingState } from '../../../shared/components/LoadingState';
import { QuantityAdjuster } from '../../../shared/components/QuantityAdjuster';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { TheriaCard } from '../../../shared/components/TheriaCard';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { cn } from '../../../shared/lib/cn';
import { StockFormDialog } from '../components/StockFormDialog';
import { useStockActions } from '../hooks/useStockActions';

/** The item's headline figures, identical whether or not it is tappable. */
const ItemSummary: React.FC<{ view: ReturnType<typeof buildStockView> }> = ({ view }) => (
  <>
    <div className="flex items-center gap-2">
      <p className="tabular text-lg font-semibold leading-none text-foreground">
        {formatQuantity(view.item.quantity, view.item.unit)}
      </p>
      <StatusBadge status={view.status} />
    </div>
    <p className="mt-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
      {view.item.name}
    </p>
    <p className="mt-0.5 text-xs text-muted-foreground">
      {formatDaysRemaining(view.estimatedDaysRemaining)}
    </p>
  </>
);

const FILTERS: Array<{ id: 'ALL' | Status; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'CRITICAL', label: 'Critical' },
  { id: 'WARNING', label: 'Low' },
  { id: 'GOOD', label: 'Good' },
];

/**
 * The full inventory: search, filter, and the same one-tap adjustment as the
 * dashboard. Compact rows rather than cards — this is the list view, and the
 * dashboard is where things get large.
 */
export const StockScreen: React.FC = () => {
  const { phase, data, error: householdError } = useHousehold();
  const { adjust, save, canAdjust, canWrite } = useStockActions();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | Status>('ALL');
  const [category, setCategory] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);

  const views = useMemo(
    () =>
      data.stockItems
        .filter((item) => item.active)
        .map((item) => buildStockView(item, data.stockEvents))
        .sort((a, b) => a.item.name.localeCompare(b.item.name)),
    [data.stockItems, data.stockEvents],
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return views.filter((view) => {
      if (filter !== 'ALL' && view.status !== filter) return false;
      if (category !== 'ALL' && view.item.categoryId !== category) return false;
      if (needle && !view.item.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [views, search, filter, category]);

  const categories = data.categories.filter((c) => c.active);

  if (phase === 'loading') return <LoadingState />;

  if (phase === 'error') {
    return (
      <EmptyState
        icon={WifiOff}
        title="We could not load your stock"
        description={householdError ?? 'Check your connection and try again.'}
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        }
      />
    );
  }

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: StockItem) => {
    setEditing(item);
    setFormOpen(true);
  };

  const form = (
    <StockFormDialog
      open={formOpen}
      onOpenChange={setFormOpen}
      item={editing}
      onSave={(next, previous) => save(next, previous)}
    />
  );

  if (views.length === 0) {
    return (
      <>
        <EmptyState
          icon={PackageOpen}
          title="Your household inventory is empty"
          description="Add the things you actually run out of — rice, drinking water, LPG, soap — and Theria will start tracking how fast they go."
          action={
            canWrite ? (
              <Button onClick={openCreate}>
                <Plus size={14} aria-hidden />
                Add your first item
              </Button>
            ) : undefined
          }
        />
        {form}
      </>
    );
  }

  const handleAdjust = (itemId: string) => (delta: number) => {
    const item = data.stockItems.find((i) => i.id === itemId);
    if (!item) return;
    setError(null);
    adjust(item, delta).catch((cause: Error) => setError(cause.message));
  };

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-status-critical/30 bg-status-critical-soft px-4 py-3 text-xs text-status-critical"
        >
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <label htmlFor="stock-search" className="sr-only">
            Search stock
          </label>
          <Input
            id="stock-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stock"
            className="pl-9"
          />
        </div>

        {canWrite && (
          <Button onClick={openCreate} className="shrink-0">
            <Plus size={14} aria-hidden />
            Add
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            onClick={() => setFilter(option.id)}
            aria-pressed={filter === option.id}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filter === option.id
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}

        {categories.length > 0 && (
          <>
            <span className="mx-1 w-px self-stretch bg-border" aria-hidden />
            <button
              onClick={() => setCategory('ALL')}
              aria-pressed={category === 'ALL'}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                category === 'ALL'
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              All categories
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  category === c.id
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {c.name}
              </button>
            ))}
          </>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nothing matches"
          description="Try a different search term or clear the filters."
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((view) => (
            <li key={view.item.id}>
              <TheriaCard size="medium" className="sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Tapping the item opens its settings; the adjuster beside
                      it stays a separate control, never a nested button. */}
                  {canWrite ? (
                    <button
                      type="button"
                      onClick={() => openEdit(view.item)}
                      aria-label={`Edit ${view.item.name}`}
                      className="min-w-0 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ItemSummary view={view} />
                    </button>
                  ) : (
                    <div className="min-w-0">
                      <ItemSummary view={view} />
                    </div>
                  )}

                  {canAdjust && (
                    <QuantityAdjuster
                      item={view.item}
                      onCommit={handleAdjust(view.item.id)}
                      showPackSteps={Boolean(view.item.packaging)}
                    />
                  )}
                </div>
              </TheriaCard>
            </li>
          ))}
        </ul>
      )}

      {form}
    </div>
  );
};
