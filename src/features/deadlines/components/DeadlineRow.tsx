import React from 'react';
import { Check, RotateCcw, Repeat } from 'lucide-react';
import { deadlineCountdownLabel } from '../../../core/domain/deadlines';
import { fromIsoDate } from '../../../core/domain/dates';
import type { DeadlineView, Priority } from '../../../core/domain/types';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Button } from '../../../shared/components/ui/button';
import { cn } from '../../../shared/lib/cn';

/**
 * One deadline in the list.
 *
 * The row opens the detail; completing is its own button beside it, never a
 * nested clickable. Priority is shown only when it is not the default — a list
 * where every item is labelled "Normal" is a list of noise.
 */

const dateLabel = (date: string): string =>
  new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    fromIsoDate(date),
  );

const PRIORITY_LABEL: Partial<Record<Priority, string>> = {
  HIGH: 'High priority',
  CRITICAL: 'Critical',
};

export const DeadlineRow: React.FC<{
  view: DeadlineView;
  canWrite: boolean;
  onOpen: () => void;
  onComplete: () => void;
  onReopen: () => void;
}> = ({ view, canWrite, onOpen, onComplete, onReopen }) => {
  const { deadline, status, daysUntil } = view;

  const mapped = status === 'MISSED' ? 'CRITICAL' : status === 'DONE' ? 'GOOD' : daysUntil <= 3 ? 'WARNING' : 'GOOD';
  const priorityNote = PRIORITY_LABEL[deadline.priority];

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-2xl border p-4 transition-colors',
        status === 'MISSED'
          ? 'border-status-critical/35 bg-status-critical-soft'
          : 'border-border bg-card',
        status === 'DONE' && 'opacity-70',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${deadline.title}, ${deadlineCountdownLabel(view)}. Open details.`}
      >
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'text-sm font-semibold leading-tight text-foreground',
              status === 'DONE' && 'line-through',
            )}
          >
            {deadline.title}
          </p>
          {deadline.recurrence && (
            <Repeat size={12} className="text-muted-foreground" aria-label="Repeats" />
          )}
        </div>

        <p className="mt-1 text-[0.6875rem] text-muted-foreground">
          {dateLabel(deadline.date)}
          {priorityNote && status !== 'DONE' && ` · ${priorityNote}`}
        </p>

        <div className="mt-2">
          <StatusBadge status={mapped} label={deadlineCountdownLabel(view)} />
        </div>
      </button>

      {canWrite &&
        (status === 'DONE' ? (
          <Button variant="ghost" size="sm" onClick={onReopen}>
            <RotateCcw size={13} aria-hidden />
            Reopen
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onComplete}>
            <Check size={13} aria-hidden />
            Mark done
          </Button>
        ))}
    </div>
  );
};
