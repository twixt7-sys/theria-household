import React, { useMemo, useState } from 'react';
import { CalendarClock, Plus, WifiOff } from 'lucide-react';
import { buildDeadlineView } from '../../../core/domain/deadlines';
import type { Deadline, DeadlineView } from '../../../core/domain/types';
import { useHousehold } from '../../../core/state/HouseholdContext';
import { EmptyState } from '../../../shared/components/EmptyState';
import { LoadingState } from '../../../shared/components/LoadingState';
import { Button } from '../../../shared/components/ui/button';
import { DeadlineDetailDialog } from '../components/DeadlineDetailDialog';
import { DeadlineFormDialog } from '../components/DeadlineFormDialog';
import { DeadlineRow } from '../components/DeadlineRow';
import { useDeadlineActions } from '../hooks/useDeadlineActions';

/**
 * Every date that matters, grouped by how soon it does.
 *
 * Missed first, then this week, then everything further out, then what is
 * already handled. Completed deadlines stay visible but recede — they are
 * history, not clutter to be hidden (prompt0.md §9.7).
 */

const THIS_WEEK_DAYS = 7;
const RECENT_DONE_LIMIT = 6;

const Group: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({
  title,
  count,
  children,
}) => (
  <section aria-label={title} className="space-y-2">
    <h2 className="flex items-baseline gap-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
      <span className="tabular font-normal normal-case tracking-normal">{count}</span>
    </h2>
    <div className="space-y-2">{children}</div>
  </section>
);

export const DeadlinesScreen: React.FC = () => {
  const { phase, data, error: householdError } = useHousehold();
  const { save, complete, reopen, archive, canWrite } = useDeadlineActions();

  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deadline | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const views = useMemo(
    () =>
      data.deadlines
        .filter((deadline) => deadline.active)
        .map((deadline) => buildDeadlineView(deadline))
        .sort((a, b) => a.daysUntil - b.daysUntil),
    [data.deadlines],
  );

  const groups = useMemo(() => {
    const open = views.filter((v) => v.status !== 'DONE');
    return {
      missed: open.filter((v) => v.status === 'MISSED'),
      thisWeek: open.filter((v) => v.status === 'UPCOMING' && v.daysUntil <= THIS_WEEK_DAYS),
      later: open.filter((v) => v.status === 'UPCOMING' && v.daysUntil > THIS_WEEK_DAYS),
      done: views
        .filter((v) => v.status === 'DONE')
        .sort((a, b) => b.deadline.date.localeCompare(a.deadline.date)),
    };
  }, [views]);

  const detailView: DeadlineView | null = detail
    ? (views.find((v) => v.deadline.id === detail) ?? null)
    : null;

  if (phase === 'loading') return <LoadingState />;

  if (phase === 'error') {
    return (
      <EmptyState
        icon={WifiOff}
        title="We could not load your deadlines"
        description={householdError ?? 'Check your connection and try again.'}
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        }
      />
    );
  }

  const run = (work: Promise<unknown>) => {
    setError(null);
    work.catch((cause: Error) => setError(cause.message));
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const rows = (list: DeadlineView[]) =>
    list.map((view) => (
      <DeadlineRow
        key={view.deadline.id}
        view={view}
        canWrite={canWrite}
        onOpen={() => setDetail(view.deadline.id)}
        onComplete={() => run(complete(view.deadline))}
        onReopen={() => run(reopen(view.deadline))}
      />
    ));

  return (
    <div className="space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-status-critical/30 bg-status-critical-soft px-4 py-3 text-xs text-status-critical"
        >
          {error}
        </div>
      )}

      {canWrite && views.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} aria-hidden />
            Add deadline
          </Button>
        </div>
      )}

      {views.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing on the calendar yet"
          description="Add the dates you cannot afford to miss — tuition, servicing, permit renewals — and Theria will count down to each one."
          action={
            canWrite ? (
              <Button onClick={openCreate}>
                <Plus size={14} aria-hidden />
                Add your first deadline
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.missed.length > 0 && (
            <Group title="Missed" count={groups.missed.length}>
              {rows(groups.missed)}
            </Group>
          )}

          {groups.thisWeek.length > 0 && (
            <Group title="This week" count={groups.thisWeek.length}>
              {rows(groups.thisWeek)}
            </Group>
          )}

          {groups.later.length > 0 && (
            <Group title="Later" count={groups.later.length}>
              {rows(groups.later)}
            </Group>
          )}

          {groups.done.length > 0 && (
            <Group title="Done" count={groups.done.length}>
              {rows(groups.done.slice(0, RECENT_DONE_LIMIT))}
              {groups.done.length > RECENT_DONE_LIMIT && (
                <p className="px-1 text-[0.6875rem] text-muted-foreground">
                  {groups.done.length - RECENT_DONE_LIMIT} older completed deadlines are kept but
                  not listed.
                </p>
              )}
            </Group>
          )}
        </div>
      )}

      <DeadlineFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        deadline={editing}
        onSave={(draft) => save(draft)}
      />

      <DeadlineDetailDialog
        open={detailView !== null}
        onOpenChange={(open) => !open && setDetail(null)}
        view={detailView}
        canWrite={canWrite}
        onEdit={() => {
          if (!detailView) return;
          setEditing(detailView.deadline);
          setDetail(null);
          setFormOpen(true);
        }}
        onComplete={() => {
          if (!detailView) return;
          const deadline = detailView.deadline;
          setDetail(null);
          run(complete(deadline));
        }}
        onReopen={() => {
          if (!detailView) return;
          const deadline = detailView.deadline;
          setDetail(null);
          run(reopen(deadline));
        }}
        onArchive={() => {
          if (!detailView) return;
          const deadline = detailView.deadline;
          setDetail(null);
          run(archive(deadline));
        }}
      />
    </div>
  );
};
