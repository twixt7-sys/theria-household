import type { Deadline, DeadlineView, DeadlineStatus, IsoDate } from './types';
import { daysUntilDue, nextDueDate } from './bills';
import { deadlineOccurrenceId } from './ids';

/**
 * Deadlines: important dates and obligations — tuition, maintenance, renewals.
 *
 * Deliberately thin. This is not a task manager (prompt0.md §9.7): no
 * subtasks, no assignees, no checklists. A deadline is a date that matters.
 *
 * Date arithmetic is shared with bills rather than reimplemented — a deadline
 * that recurs quarterly advances exactly the way a quarterly bill does, and
 * two implementations of "three months from the 31st" would eventually
 * disagree.
 */

export function deadlineStatus(deadline: Deadline, now: Date = new Date()): DeadlineStatus {
  if (deadline.status === 'DONE') return 'DONE';
  return daysUntilDue(deadline.date, now) < 0 ? 'MISSED' : 'UPCOMING';
}

export function buildDeadlineView(deadline: Deadline, now: Date = new Date()): DeadlineView {
  return {
    deadline,
    daysUntil: daysUntilDue(deadline.date, now),
    status: deadlineStatus(deadline, now),
  };
}

export function deadlineCountdownLabel(view: DeadlineView): string {
  if (view.status === 'DONE') return 'Done';
  if (view.daysUntil < 0) {
    const late = Math.abs(view.daysUntil);
    return late === 1 ? 'Missed 1 day ago' : `Missed ${late} days ago`;
  }
  if (view.daysUntil === 0) return 'Today';
  if (view.daysUntil === 1) return 'Tomorrow';
  return `In ${view.daysUntil} days`;
}

/** Deadlines close enough to be worth surfacing on the dashboard. */
export function isApproaching(view: DeadlineView, leadDays = 14): boolean {
  return view.status === 'UPCOMING' && view.daysUntil <= leadDays;
}

/* ---------------------------------------------------------------- recurrence */

/**
 * The next occurrence of a recurring deadline, or null if there should not be
 * one.
 *
 * Mirrors `generateNextOccurrence` for bills, including its idempotency: the
 * derived id means a second attempt overwrites rather than duplicates
 * (prompt0.md §9.6, applied to §9.7).
 */
export function generateNextDeadline(
  deadline: Deadline,
  existing: Deadline[],
  now: Date = new Date(),
): Deadline | null {
  if (!deadline.recurrence || !deadline.active) return null;

  const nextDate: IsoDate = nextDueDate(deadline.recurrence, deadline.date);

  if (deadline.recurrence.endsOn && nextDate > deadline.recurrence.endsOn) return null;

  const id = deadlineOccurrenceId(deadline.id, nextDate);

  if (existing.some((d) => d.id === id || (d.title === deadline.title && d.date === nextDate))) {
    return null;
  }

  const timestamp = now.toISOString();
  return {
    ...deadline,
    id,
    date: nextDate,
    // A generated occurrence starts open regardless of how the one before it
    // ended — last quarter being done says nothing about this quarter.
    status: 'UPCOMING',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
