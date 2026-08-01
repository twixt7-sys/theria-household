import React from 'react';
import type { CardSize } from '../../../core/domain/priority';
import { formatDaysRemaining, formatPackaged, formatQuantity } from '../../../core/domain/units';
import type { StockView } from '../../../core/domain/types';
import { ProgressRing } from '../../../shared/components/ProgressRing';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { TheriaCard } from '../../../shared/components/TheriaCard';
import { QuantityAdjuster } from '../../../shared/components/QuantityAdjuster';
import { STATUS_STYLES } from '../../../shared/lib/statusStyles';

/**
 * "How much rice do we have?" — answered in one glance.
 *
 * Hierarchy is fixed: value, then name, then context, then status. One
 * component with size variants rather than four near-identical card types
 * (prompt0.md §5.4, §107).
 */

interface StockCardProps {
  view: StockView;
  size?: CardSize;
  canAdjust: boolean;
  onAdjust: (delta: number) => void;
  onOpen?: () => void;
}

export const StockCard: React.FC<StockCardProps> = ({
  view,
  size = 'medium',
  canAdjust,
  onAdjust,
  onOpen,
}) => {
  const { item, status, percentage, estimatedDaysRemaining } = view;
  const style = STATUS_STYLES[status];
  const prominent = size === 'hero' || size === 'large';

  const packagedLabel = item.packaging
    ? formatPackaged(item.packaging.sealedPacks, item.packaging.openQuantity, item.packaging.packUnit)
    : null;

  return (
    <TheriaCard
      size={size}
      accent={status === 'CRITICAL' ? 'critical' : 'none'}
      // A card carrying adjuster buttons must not itself be a button —
      // nesting them is invalid HTML and breaks keyboard navigation. Managers
      // reach the detail view from the Stock screen instead.
      onClick={canAdjust ? undefined : onOpen}
      aria-label={`${item.name}, ${formatQuantity(item.quantity, item.unit)}, ${style.label}`}
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {/* Value first — it is the answer to the user's question. */}
          <p
            className={`tabular font-semibold leading-none text-foreground ${
              prominent ? 'text-3xl' : 'text-2xl'
            }`}
          >
            {formatQuantity(item.quantity, item.unit)}
          </p>

          <p className="mt-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
            {item.name}
          </p>

          {packagedLabel && (
            <p className="mt-1 text-xs text-muted-foreground">{packagedLabel}</p>
          )}

          {prominent && (
            <p className="mt-1 text-xs text-muted-foreground">
              {/* Honest about what we do and don't know. */}
              {formatDaysRemaining(estimatedDaysRemaining)}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {item.quantity < item.preferredQuantity && (
              <span className="text-[0.6875rem] text-muted-foreground">
                Preferred {formatQuantity(item.preferredQuantity, item.unit)}
              </span>
            )}
          </div>
        </div>

        {prominent && (
          <ProgressRing
            percentage={percentage}
            size="md"
            color={style.ring}
            value={`${Math.round(percentage)}%`}
            label={`${item.name} at ${Math.round(percentage)} percent of maximum`}
          />
        )}
      </div>

      {canAdjust && (
        <div className="mt-3 border-t border-border pt-3">
          <QuantityAdjuster item={item} onCommit={onAdjust} showPackSteps={Boolean(item.packaging)} />
        </div>
      )}
    </TheriaCard>
  );
};
