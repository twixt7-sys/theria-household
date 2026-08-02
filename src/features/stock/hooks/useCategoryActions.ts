import { useCallback } from 'react';
import { newId } from '../../../core/domain/ids';
import { refusalMessage } from '../../../core/domain/permissions';
import type { Category, Priority } from '../../../core/domain/types';
import { useHousehold } from '../../../core/state/HouseholdContext';

/**
 * Category mutations.
 *
 * Categories were previously unreachable: nothing in the app wrote to the
 * collection, so a household could only ever have the ones seeded for it. A
 * stock item needs somewhere to live, so creating one has to be possible from
 * the same flow that creates the item.
 */

export interface CategoryDraft {
  id?: string;
  name: string;
  icon?: string;
  priority?: Priority;
  description?: string;
}

export function useCategoryActions() {
  const { data, household, put, can } = useHousehold();

  const canWrite = can('categories:write');

  const save = useCallback(
    async (draft: CategoryDraft): Promise<Category> => {
      if (!canWrite) throw new Error(refusalMessage('categories:write'));
      if (!household) throw new Error('No active household.');

      const name = draft.name.trim();
      if (!name) throw new Error('Give the category a name.');

      const now = new Date().toISOString();
      const existing = draft.id ? data.categories.find((c) => c.id === draft.id) : undefined;

      const category: Category = {
        id: draft.id ?? newId(),
        householdId: household.id,
        name,
        icon: draft.icon ?? existing?.icon ?? 'Boxes',
        priority: draft.priority ?? existing?.priority ?? 'NORMAL',
        description: draft.description ?? existing?.description ?? '',
        active: existing?.active ?? true,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      await put('categories', category);
      return category;
    },
    [canWrite, data.categories, household, put],
  );

  /** Retire rather than delete — items keep pointing at a real record (§6.8). */
  const archive = useCallback(
    async (category: Category) => {
      if (!canWrite) throw new Error(refusalMessage('categories:write'));
      await put('categories', { ...category, active: false, updatedAt: new Date().toISOString() });
    },
    [canWrite, put],
  );

  return { save, archive, canWrite };
}
