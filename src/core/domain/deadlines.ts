import type { Deadline, DeadlineView, DeadlineStatus } from './types';
import { daysUntilDue } from './bills';

/**
 * Deadlines: important dates and obligations — tuition, maintenance, renewals.
 *
 * Deliberately thin. This is not a task manager (prompt0.md §9.7): no
 * subtasks, no assignees, no checklists. A deadline is a date that matters.
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
