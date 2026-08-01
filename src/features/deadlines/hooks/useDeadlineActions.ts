import { useCallback } from 'react';
import { newId } from '../../../core/domain/ids';
import { refusalMessage } from '../../../core/domain/permissions';
import type { Deadline } from '../../../core/domain/types';
import { useHousehold } from '../../../core/state/HouseholdContext';
import { completeDeadline, reopenDeadline } from '../lib/completeDeadline';

/**
 * Deadline mutations, permission-checked in one place.
 *
 * Same shape as `useBillActions`: components call these and never reach the
 * repository themselves. The role check is UX — Firestore rules reject the
 * write independently (prompt0.md §13.2).
 */

/** What a form supplies. Everything else is derived or defaulted. */
export type DeadlineDraft = Omit<
  Deadline,
  'id' | 'householdId' | 'createdAt' | 'updatedAt' | 'active' | 'status'
> & { id?: string };

export function useDeadlineActions() {
  const { data, household, put, can } = useHousehold();

  const canWrite = can('deadlines:write');

  const save = useCallback(
    async (draft: DeadlineDraft) => {
      if (!canWrite) throw new Error(refusalMessage('deadlines:write'));
      if (!household) throw new Error('No active household.');

      const now = new Date().toISOString();
      const existing = draft.id ? data.deadlines.find((d) => d.id === draft.id) : undefined;

      const deadline: Deadline = {
        ...draft,
        id: draft.id ?? newId(),
        householdId: household.id,
        // Editing a completed deadline does not silently reopen it.
        status: existing?.status ?? 'UPCOMING',
        active: existing?.active ?? true,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      await put('deadlines', deadline);
      return deadline;
    },
    [canWrite, data.deadlines, household, put],
  );

  /**
   * Marks it done and opens the next occurrence if it recurs.
   *
   * The completion is written first: a completed deadline whose successor
   * failed to appear is visible and fixable, whereas a new occurrence with the
   * old one still open reads as a duplicate.
   */
  const complete = useCallback(
    async (deadline: Deadline) => {
      if (!canWrite) throw new Error(refusalMessage('deadlines:write'));

      const { deadline: done, nextOccurrence } = completeDeadline(deadline, data.deadlines);

      await put('deadlines', done);
      if (nextOccurrence) await put('deadlines', nextOccurrence);

      return { nextOccurrence };
    },
    [canWrite, data.deadlines, put],
  );

  const reopen = useCallback(
    async (deadline: Deadline) => {
      if (!canWrite) throw new Error(refusalMessage('deadlines:write'));
      await put('deadlines', reopenDeadline(deadline));
    },
    [canWrite, put],
  );

  /** Retire rather than delete — the calendar's history stays intact (§6.8). */
  const archive = useCallback(
    async (deadline: Deadline) => {
      if (!canWrite) throw new Error(refusalMessage('deadlines:write'));
      await put('deadlines', { ...deadline, active: false, updatedAt: new Date().toISOString() });
    },
    [canWrite, put],
  );

  return { save, complete, reopen, archive, canWrite };
}
