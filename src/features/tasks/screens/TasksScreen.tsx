import React, { useEffect, useMemo, useState } from 'react';
import { Check, ListChecks, Plus, Trash2, WifiOff } from 'lucide-react';
import { fromIsoDate, toIsoDate } from '../../../core/domain/dates';
import type { HouseholdTask } from '../../../core/domain/types';
import { useHousehold } from '../../../core/state/HouseholdContext';
import { useUi } from '../../../app/state/uiStore';
import { EmptyState } from '../../../shared/components/EmptyState';
import { LoadingState } from '../../../shared/components/LoadingState';
import { Button } from '../../../shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/dialog';
import { Field } from '../../../shared/components/ui/field';
import { Input } from '../../../shared/components/ui/input';
import { Textarea } from '../../../shared/components/ui/textarea';
import { cn } from '../../../shared/lib/cn';
import { useTaskActions } from '../hooks/useTaskActions';

/**
 * Tasks — the errands around the household, kept deliberately light.
 *
 * No priority, no recurrence, no countdown. Those belong to Deadlines, and
 * duplicating them here would turn two clear screens into two vague ones.
 */

const dateLabel = (date: string): string =>
  new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(fromIsoDate(date));

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

export const TasksScreen: React.FC = () => {
  const { phase, data, error: householdError } = useHousehold();
  const { save, toggle, archive, canWrite } = useTaskActions();
  const { pendingAdd, clearAdd } = useUi();

  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HouseholdTask | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreate = React.useCallback(() => {
    setEditing(null);
    setTitle('');
    setNotes('');
    setDueDate('');
    setAssignedTo('');
    setFormOpen(true);
  }, []);

  // The FAB asks for a task from anywhere; the screen is what actually owns
  // the form, so it picks the request up on arrival.
  useEffect(() => {
    if (pendingAdd === 'task') {
      openCreate();
      clearAdd();
    }
  }, [pendingAdd, clearAdd, openCreate]);

  const tasks = useMemo(
    () =>
      data.tasks
        .filter((task) => task.active)
        .sort((a, b) => {
          // Dated tasks first, soonest at the top; undated ones follow.
          if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return a.createdAt.localeCompare(b.createdAt);
        }),
    [data.tasks],
  );

  const open = tasks.filter((task) => !task.done);
  const done = tasks.filter((task) => task.done);

  if (phase === 'loading') return <LoadingState />;

  if (phase === 'error') {
    return (
      <EmptyState
        icon={WifiOff}
        title="We could not load your tasks"
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

  const openEdit = (task: HouseholdTask) => {
    setEditing(task);
    setTitle(task.title);
    setNotes(task.notes);
    setDueDate(task.dueDate ?? '');
    setAssignedTo(task.assignedTo);
    setFormOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await save({
        id: editing?.id,
        title,
        notes,
        dueDate: dueDate || null,
        assignedTo,
      });
      setFormOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const row = (task: HouseholdTask) => (
    <div
      key={task.id}
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition-colors',
        task.done && 'opacity-70',
      )}
    >
      {canWrite ? (
        <button
          type="button"
          onClick={() => run(toggle(task))}
          aria-label={task.done ? `Reopen ${task.title}` : `Mark ${task.title} done`}
          aria-pressed={task.done}
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            task.done
              ? 'border-status-good bg-status-good text-white'
              : 'border-border text-transparent hover:border-primary',
          )}
        >
          <Check size={13} strokeWidth={3} />
        </button>
      ) : (
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
            task.done ? 'border-status-good bg-status-good text-white' : 'border-border',
          )}
        >
          {task.done && <Check size={13} strokeWidth={3} />}
        </span>
      )}

      <button
        type="button"
        onClick={() => canWrite && openEdit(task)}
        disabled={!canWrite}
        className="min-w-0 flex-1 rounded-lg text-left disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <p
          className={cn(
            'truncate text-sm font-medium text-foreground',
            task.done && 'line-through',
          )}
        >
          {task.title}
        </p>
        {(task.dueDate || task.assignedTo) && (
          <p className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground">
            {task.dueDate && dateLabel(task.dueDate)}
            {task.dueDate && task.assignedTo && ' · '}
            {task.assignedTo}
          </p>
        )}
      </button>

      {canWrite && (
        <button
          type="button"
          onClick={() => run(archive(task))}
          aria-label={`Remove ${task.title}`}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );

  const form = (
    <Dialog open={formOpen} onOpenChange={setFormOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit task' : 'Add a task'}</DialogTitle>
          <DialogDescription>
            The small things — buy rice on the way home, call the plumber.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field label="Task">
            {(id) => (
              <Input
                id={id}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Buy rice"
                autoFocus
              />
            )}
          </Field>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="By when" hint="Optional.">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  value={dueDate}
                  min={toIsoDate(new Date())}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              )}
            </Field>

            <Field label="Who" hint="Optional.">
              {(id) => (
                <Input
                  id={id}
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Whoever passes the market"
                />
              )}
            </Field>
          </div>

          <Field label="Notes">
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Brand, quantity, anything worth remembering."
              />
            )}
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (tasks.length === 0) {
    return (
      <>
        <EmptyState
          icon={ListChecks}
          title="Nothing to do yet"
          description="Write down the small things before they are forgotten — buy rice, call the plumber, return the containers."
          action={
            canWrite ? (
              <Button onClick={openCreate}>
                <Plus size={14} aria-hidden />
                Add your first task
              </Button>
            ) : undefined
          }
        />
        {form}
      </>
    );
  }

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

      {canWrite && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} aria-hidden />
            Add task
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {open.length > 0 && (
          <Group title="To do" count={open.length}>
            {open.map(row)}
          </Group>
        )}
        {done.length > 0 && (
          <Group title="Done" count={done.length}>
            {done.map(row)}
          </Group>
        )}
      </div>

      {form}
    </div>
  );
};
