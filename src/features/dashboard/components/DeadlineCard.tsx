import React from 'react';
import { CalendarClock } from 'lucide-react';
import type { CardSize } from '../../../core/domain/priority';
import { deadlineCountdownLabel } from '../../../core/domain/deadlines';
import type { DeadlineView } from '../../../core/domain/types';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { TheriaCard } from '../../../shared/components/TheriaCard';

/** "What is coming up?" */
export const DeadlineCard: React.FC<{
  view: DeadlineView;
  size?: CardSize;
  onOpen?: () => void;
}> = ({ view, size = 'compact', onOpen }) => {
  const { deadline, status, daysUntil } = view;
  const mapped = status === 'MISSED' ? 'CRITICAL' : daysUntil <= 3 ? 'WARNING' : 'GOOD';

  return (
    <TheriaCard
      size={size}
      accent={status === 'MISSED' ? 'critical' : 'none'}
      onClick={onOpen}
      aria-label={`${deadline.title}, ${deadlineCountdownLabel(view)}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
          <CalendarClock size={16} className="text-muted-foreground" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-foreground">{deadline.title}</p>
          <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
            {new Date(`${deadline.date}T00:00:00`).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </p>
          <div className="mt-2">
            <StatusBadge status={mapped} label={deadlineCountdownLabel(view)} />
          </div>
        </div>
      </div>
    </TheriaCard>
  );
};
