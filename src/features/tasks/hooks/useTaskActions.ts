import { useCallback } from 'react';
import { newId } from '../../../core/domain/ids';
import { refusalMessage } from '../../../core/domain/permissions';
import type { HouseholdTask } from '../../../core/domain/types';
import { useAuth } from '../../../core/state/AuthContext';
import { useHousehold } from '../../../core/state/HouseholdContext';

/**
 * Task mutations, permission-checked in one place.
 *
 * Tasks reuse the deadlines capability rather than inventing a new one: anyone
 * who may put a date on the household calendar may also write down an errand,
 * and a separate switch would be a distinction without a difference.
 */

export interface TaskDraft {
  id?: string;
  title: string;
  notes?: string;
  dueDate?: string | null;
  assignedTo?: string;
}

export function useTaskActions() {
  const { user } = useAuth();
  const { data, household, put, can } = useHousehold();

  const canWrite = can('deadlines:write');

  const save = useCallback(
    async (draft: TaskDraft) => {
      if (!canWrite) throw new Error(refusalMessage('deadlines:write'));
      if (!household) throw new Error('No active household.');

      const title = draft.title.trim();
      if (!title) throw new Error('Give the task a name.');

      const now = new Date().toISOString();
      const existing = draft.id ? data.tasks.find((t) => t.id === draft.id) : undefined;

      const task: HouseholdTask = {
        id: draft.id ?? newId(),
        householdId: household.id,
        title,
        notes: draft.notes?.trim() ?? existing?.notes ?? '',
        dueDate: draft.dueDate ?? existing?.dueDate ?? null,
        done: existing?.done ?? false,
        assignedTo: draft.assignedTo?.trim() ?? existing?.assignedTo ?? '',
        createdBy: existing?.createdBy ?? user?.id ?? '',
        completedAt: existing?.completedAt ?? null,
        active: existing?.active ?? true,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      await put('tasks', task);
      return task;
    },
    [canWrite, data.tasks, household, put, user],
  );

  /** Ticking a task records when, so "done" has a date rather than just a flag. */
  const toggle = useCallback(
    async (task: HouseholdTask) => {
      if (!canWrite) throw new Error(refusalMessage('deadlines:write'));
      const now = new Date().toISOString();
      await put('tasks', {
        ...task,
        done: !task.done,
        completedAt: task.done ? null : now,
        updatedAt: now,
      });
    },
    [canWrite, put],
  );

  const archive = useCallback(
    async (task: HouseholdTask) => {
      if (!canWrite) throw new Error(refusalMessage('deadlines:write'));
      await put('tasks', { ...task, active: false, updatedAt: new Date().toISOString() });
    },
    [canWrite, put],
  );

  return { save, toggle, archive, canWrite };
}
