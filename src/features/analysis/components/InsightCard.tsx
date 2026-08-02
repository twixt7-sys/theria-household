import React from 'react';
import { CircleAlert, TrendingDown, TrendingUp, Timer, type LucideIcon } from 'lucide-react';
import type { Insight } from '../../../core/domain/types';
import { TheriaCard } from '../../../shared/components/TheriaCard';
import { STATUS_STYLES } from '../../../shared/lib/statusStyles';
import { cn } from '../../../shared/lib/cn';

/**
 * One claim, with the evidence under it.
 *
 * The title *is* the finding — "Rice consumption rose 18%" — rather than a
 * label like "Consumption" with the finding hidden below (prompt0.md §9.8).
 */

const KIND_ICON: Record<Insight['kind'], LucideIcon> = {
  DEPLETION: Timer,
  CONSUMPTION_CHANGE: TrendingUp,
  BILL_TREND: TrendingUp,
  THRESHOLD: CircleAlert,
};

export const InsightCard: React.FC<{ insight: Insight }> = ({ insight }) => {
  const style = STATUS_STYLES[insight.severity];
  // A fall is still a change, but it points the other way.
  const Icon =
    insight.severity === 'GOOD' &&
    (insight.kind === 'CONSUMPTION_CHANGE' || insight.kind === 'BILL_TREND')
      ? TrendingDown
      : KIND_ICON[insight.kind];

  return (
    <TheriaCard
      size="medium"
      accent={insight.severity === 'CRITICAL' ? 'critical' : 'none'}
      className="sm:col-span-1"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            insight.severity === 'GOOD' ? 'bg-muted' : style.bg,
          )}
        >
          <Icon
            size={15}
            aria-hidden
            className={insight.severity === 'GOOD' ? 'text-muted-foreground' : style.text}
          />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug text-foreground">{insight.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{insight.detail}</p>
        </div>
      </div>
    </TheriaCard>
  );
};
