import React from 'react';
import type { CategorySummary } from '../../../core/domain/categories';
import { TheriaCard } from '../../../shared/components/TheriaCard';
import { iconForCategory } from '../../../shared/lib/categoryIcons';
import { STATUS_STYLES } from '../../../shared/lib/statusStyles';
import { cn } from '../../../shared/lib/cn';

/**
 * "KITCHEN · 12 items · 2 low" (prompt0.md §9.3).
 *
 * A quiet card by design. It reports counts rather than competing with the
 * priority cards above it — the individual critical item already has its own
 * card, and saying so twice at the same volume is how a dashboard starts
 * shouting.
 */
export const CategorySummaryCard: React.FC<{
  summaries: CategorySummary[];
  onOpen?: (categoryId: string) => void;
}> = ({ summaries, onOpen }) => {
  if (summaries.length === 0) return null;

  return (
    <TheriaCard size="medium">
      <h2 className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
        By category
      </h2>

      <ul className="space-y-1">
        {summaries.map((summary) => {
          const Icon = iconForCategory(summary.category.icon);
          const style = STATUS_STYLES[summary.status];
          const interactive = Boolean(onOpen);

          const content = (
            <>
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  summary.status === 'GOOD' ? 'bg-muted' : style.bg,
                )}
              >
                <Icon
                  size={14}
                  aria-hidden
                  className={summary.status === 'GOOD' ? 'text-muted-foreground' : style.text}
                />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground">
                  {summary.category.name}
                </span>
                <span className="block truncate text-[0.6875rem] text-muted-foreground">
                  {summary.detail}
                </span>
              </span>

              {/* A dot alone would fail WCAG 1.4.1, so it never travels without
                  the count text beside it. */}
              {summary.status !== 'GOOD' && (
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', style.text)} style={{ backgroundColor: style.ring }} />
              )}
            </>
          );

          return (
            <li key={summary.category.id}>
              {interactive ? (
                <button
                  type="button"
                  onClick={() => onOpen?.(summary.category.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg py-1 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center gap-2.5 py-1">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </TheriaCard>
  );
};
