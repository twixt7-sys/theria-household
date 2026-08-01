import React, { useEffect, useState } from 'react';
import { fromIsoDate, toIsoDate } from '../../../core/domain/dates';
import type { Deadline, Priority, RecurrenceFrequency } from '../../../core/domain/types';
import { useHousehold } from '../../../core/state/HouseholdContext';
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
import { Select } from '../../../shared/components/ui/select';
import { Textarea } from '../../../shared/components/ui/textarea';
import type { DeadlineDraft } from '../hooks/useDeadlineActions';

/**
 * Creating and editing a deadline.
 *
 * Kept to what a date actually needs. There is no assignee, no subtask list
 * and no checklist here, and that absence is deliberate (prompt0.md §9.7).
 */

const REPEATS: Array<{ value: RecurrenceFrequency | 'NONE'; label: string }> = [
  { value: 'NONE', label: 'Does not repeat' },
  { value: 'WEEKLY', label: 'Every week' },
  { value: 'MONTHLY', label: 'Every month' },
  { value: 'QUARTERLY', label: 'Every quarter' },
  { value: 'YEARLY', label: 'Every year' },
];

const PRIORITIES: Priority[] = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

interface FormState {
  title: string;
  description: string;
  date: string;
  frequency: RecurrenceFrequency | 'NONE';
  endsOn: string;
  priority: Priority;
  categoryId: string;
  notes: string;
}

const blank = (): FormState => ({
  title: '',
  description: '',
  date: toIsoDate(new Date()),
  frequency: 'NONE',
  endsOn: '',
  priority: 'NORMAL',
  categoryId: '',
  notes: '',
});

const fromDeadline = (deadline: Deadline): FormState => ({
  title: deadline.title,
  description: deadline.description,
  date: deadline.date,
  frequency: deadline.recurrence?.frequency ?? 'NONE',
  endsOn: deadline.recurrence?.endsOn ?? '',
  priority: deadline.priority,
  categoryId: deadline.categoryId ?? '',
  notes: deadline.notes,
});

export const DeadlineFormDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null creates; a deadline edits it. */
  deadline: Deadline | null;
  onSave: (draft: DeadlineDraft) => Promise<unknown>;
}> = ({ open, onOpenChange, deadline, onSave }) => {
  const { data } = useHousehold();

  const [form, setForm] = useState<FormState>(blank);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset on open so an abandoned edit never leaks into the next one.
  useEffect(() => {
    if (!open) return;
    setForm(deadline ? fromDeadline(deadline) : blank());
    setErrors({});
    setSubmitError(null);
  }, [open, deadline]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const validate = (): boolean => {
    const found: Partial<Record<keyof FormState, string>> = {};

    if (!form.title.trim()) found.title = 'What is the deadline for?';
    if (!form.date) found.date = 'Every deadline needs a date.';
    if (form.frequency !== 'NONE' && form.endsOn && form.endsOn < form.date) {
      found.endsOn = 'The end date falls before the first occurrence.';
    }

    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    const date = fromIsoDate(form.date);

    const draft: DeadlineDraft = {
      id: deadline?.id,
      title: form.title.trim(),
      description: form.description.trim(),
      date: form.date,
      categoryId: form.categoryId || null,
      priority: form.priority,
      recurrence:
        form.frequency === 'NONE'
          ? null
          : {
              frequency: form.frequency,
              anchorDay: form.frequency === 'WEEKLY' ? date.getDay() : date.getDate(),
              endsOn: form.endsOn || null,
            },
      notes: form.notes.trim(),
    };

    setSaving(true);
    setSubmitError(null);
    try {
      await onSave(draft);
      onOpenChange(false);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'That could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const categories = data.categories.filter((c) => c.active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{deadline ? `Edit ${deadline.title}` : 'Add a deadline'}</DialogTitle>
          <DialogDescription>
            Tuition, maintenance, renewals, servicing — dates that matter, with a countdown.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field label="Title" error={errors.title}>
            {(id) => (
              <Input
                id={id}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Aircon servicing"
                autoFocus
              />
            )}
          </Field>

          <Field label="Date" error={errors.date}>
            {(id) => (
              <Input
                id={id}
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            )}
          </Field>

          <Field label="Repeats">
            {(id) => (
              <Select
                id={id}
                value={form.frequency}
                onChange={(e) => set('frequency', e.target.value as FormState['frequency'])}
              >
                {REPEATS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {form.frequency !== 'NONE' && (
            <Field label="Repeat until" hint="Leave empty to keep repeating." error={errors.endsOn}>
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  value={form.endsOn}
                  onChange={(e) => set('endsOn', e.target.value)}
                />
              )}
            </Field>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Priority">
              {(id) => (
                <Select
                  id={id}
                  value={form.priority}
                  onChange={(e) => set('priority', e.target.value as Priority)}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {PRIORITY_LABEL[priority]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            {categories.length > 0 && (
              <Field label="Category">
                {(id) => (
                  <Select
                    id={id}
                    value={form.categoryId}
                    onChange={(e) => set('categoryId', e.target.value)}
                  >
                    <option value="">None</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
          </div>

          <Field label="Notes">
            {(id) => (
              <Textarea
                id={id}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Reference number, who to call, what it costs."
              />
            )}
          </Field>

          {submitError && (
            <p role="alert" className="text-xs text-status-critical">
              {submitError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : deadline ? 'Save changes' : 'Add deadline'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
