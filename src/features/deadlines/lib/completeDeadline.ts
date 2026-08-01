import { generateNextDeadline } from '../../../core/domain/deadlines';
import type { Deadline } from '../../../core/domain/types';

/**
 * Marking a deadline done, as a pure function.
 *
 * Two things have to move together: this occurrence closes, and — if it
 * recurs — the next one opens. Keeping the pair here rather than in a
 * component is what stops "servicing done" from quietly ending a quarterly
 * obligation (prompt0.md §9.7).
 */

export interface CompletionResult {
  deadline: Deadline;
  /** The following occurrence, or null when there should not be one. */
  nextOccurrence: Deadline | null;
}

export function completeDeadline(
  deadline: Deadline,
  existing: Deadline[],
  now: Date = new Date(),
): CompletionResult {
  const timestamp = now.toISOString();

  const done: Deadline = {
    ...deadline,
    status: 'DONE',
    updatedAt: timestamp,
  };

  return {
    deadline: done,
    // Generated from the completed occurrence, so the next date is measured
    // from the one just met rather than from today.
    nextOccurrence: generateNextDeadline(done, existing, now),
  };
}

/**
 * Undoing a completion.
 *
 * Sets the stored status back to UPCOMING and lets `deadlineStatus` re-derive
 * MISSED from the date — a reopened deadline whose date has passed is missed
 * again, and storing that judgement would freeze it.
 */
export function reopenDeadline(deadline: Deadline, now: Date = new Date()): Deadline {
  return {
    ...deadline,
    status: 'UPCOMING',
    updatedAt: now.toISOString(),
  };
}
