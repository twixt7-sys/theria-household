import React from 'react';
import { Archive, Check, Pencil, RotateCcw } from 'lucide-react';
import { fromIsoDate } from '../../../core/domain/dates';
import { deadlineCountdownLabel } from '../../../core/domain/deadlines';
import type { DeadlineView, RecurrenceFrequency } from '../../../core/domain/types';
import { useHousehold } from '../../../core/state/HouseholdContext';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Button } from '../../../shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/dialog';

/** How a recurrence reads back to a person, rather than as an enum. */
const REPEAT_LABEL: Record<RecurrenceFrequency, string> = {
  WEEKLY: 'Repeats every week',
  MONTHLY: 'Repeats every month',
  QUARTERLY: 'Repeats every quarter',
  YEARLY: 'Repeats every year',
};

const dateLabel = (date: string): string =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fromIsoDate(date));

export const DeadlineDetailDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: DeadlineView | null;
  canWrite: boolean;
  onEdit: () => void;
  onComplete: () => void;
  onReopen: () => void;
  onArchive: () => void;
}> = ({ open, onOpenChange, view, canWrite, onEdit, onComplete, onReopen, onArchive }) => {
  const { data } = useHousehold();

  if (!view) return null;

  const { deadline, status, daysUntil } = view;
  const mapped =
    status === 'MISSED' ? 'CRITICAL' : status === 'DONE' ? 'GOOD' : daysUntil <= 3 ? 'WARNING' : 'GOOD';
  const category = data.categories.find((c) => c.id === deadline.categoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{deadline.title}</DialogTitle>
          <DialogDescription>{dateLabel(deadline.date)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={mapped} label={deadlineCountdownLabel(view)} size="md" />
            {deadline.recurrence && (
              <span className="text-[0.6875rem] text-muted-foreground">
                {REPEAT_LABEL[deadline.recurrence.frequency]}
                {deadline.recurrence.endsOn && ` until ${deadline.recurrence.endsOn}`}
              </span>
            )}
          </div>

          {category && (
            <p className="text-[0.6875rem] text-muted-foreground">Category · {category.name}</p>
          )}

          {deadline.description && (
            <p className="text-xs leading-relaxed text-foreground">{deadline.description}</p>
          )}

          {deadline.notes && (
            <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {deadline.notes}
            </p>
          )}
        </div>

        {canWrite && (
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={onArchive}>
              <Archive size={14} aria-hidden />
              Archive
            </Button>

            <span className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={onEdit}>
                <Pencil size={14} aria-hidden />
                Edit
              </Button>
              {status === 'DONE' ? (
                <Button variant="secondary" onClick={onReopen}>
                  <RotateCcw size={14} aria-hidden />
                  Reopen
                </Button>
              ) : (
                <Button onClick={onComplete}>
                  <Check size={14} aria-hidden />
                  Mark done
                </Button>
              )}
            </span>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
