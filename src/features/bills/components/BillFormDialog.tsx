import React, { useEffect, useState } from 'react';
import { fromIsoDate, toIsoDate } from '../../../core/domain/dates';
import type { Bill, Priority, RecurrenceFrequency } from '../../../core/domain/types';
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
import type { BillDraft } from '../hooks/useBillActions';

/**
 * Creating and editing a bill.
 *
 * The recurrence anchor is derived from the due date rather than asked for
 * separately — a bill due on the 4th recurs on the 4th, and making someone
 * state that twice is a way to get two different answers.
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
  name: string;
  provider: string;
  estimatedAmount: string;
  dueDate: string;
  frequency: RecurrenceFrequency | 'NONE';
  endsOn: string;
  priority: Priority;
  categoryId: string;
  notes: string;
}

const blank = (): FormState => ({
  name: '',
  provider: '',
  estimatedAmount: '',
  dueDate: toIsoDate(new Date()),
  frequency: 'MONTHLY',
  endsOn: '',
  priority: 'NORMAL',
  categoryId: '',
  notes: '',
});

const fromBill = (bill: Bill): FormState => ({
  name: bill.name,
  provider: bill.provider,
  estimatedAmount: bill.estimatedAmount === null ? '' : String(bill.estimatedAmount),
  dueDate: bill.dueDate,
  frequency: bill.recurrence?.frequency ?? 'NONE',
  endsOn: bill.recurrence?.endsOn ?? '',
  priority: bill.priority,
  categoryId: bill.categoryId ?? '',
  notes: bill.notes,
});

export const BillFormDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null creates; a bill edits it. */
  bill: Bill | null;
  onSave: (draft: BillDraft) => Promise<unknown>;
}> = ({ open, onOpenChange, bill, onSave }) => {
  const { data, household } = useHousehold();

  const [form, setForm] = useState<FormState>(blank);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset on open so an abandoned edit never leaks into the next one.
  useEffect(() => {
    if (!open) return;
    setForm(bill ? fromBill(bill) : blank());
    setErrors({});
    setSubmitError(null);
  }, [open, bill]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const validate = (): boolean => {
    const found: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) found.name = 'Give the bill a name.';
    if (!form.dueDate) found.dueDate = 'When is it due?';

    if (form.estimatedAmount.trim()) {
      const amount = Number(form.estimatedAmount);
      if (!Number.isFinite(amount) || amount < 0) found.estimatedAmount = 'Enter an amount.';
    }

    if (form.frequency !== 'NONE' && form.endsOn && form.endsOn < form.dueDate) {
      found.endsOn = 'The end date falls before the first due date.';
    }

    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    const due = fromIsoDate(form.dueDate);

    const draft: BillDraft = {
      id: bill?.id,
      name: form.name.trim(),
      provider: form.provider.trim(),
      categoryId: form.categoryId || null,
      estimatedAmount: form.estimatedAmount.trim() ? Number(form.estimatedAmount) : null,
      actualAmount: bill?.actualAmount ?? null,
      dueDate: form.dueDate,
      recurrence:
        form.frequency === 'NONE'
          ? null
          : {
              frequency: form.frequency,
              // Weekly recurs on a weekday, everything else on a day of month.
              anchorDay: form.frequency === 'WEEKLY' ? due.getDay() : due.getDate(),
              endsOn: form.endsOn || null,
            },
      priority: form.priority,
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
  const currency = household?.currency ?? 'PHP';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bill ? `Edit ${bill.name}` : 'Add a bill'}</DialogTitle>
          <DialogDescription>
            {bill
              ? 'Changes apply to this billing period. Past periods keep their own record.'
              : 'Electricity, water, internet — anything with a due date and an amount.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field label="Name" error={errors.name}>
            {(id) => (
              <Input
                id={id}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Electricity"
                autoFocus
              />
            )}
          </Field>

          <Field label="Provider" hint="Optional — who sends the bill.">
            {(id) => (
              <Input
                id={id}
                value={form.provider}
                onChange={(e) => set('provider', e.target.value)}
                placeholder="Meralco"
              />
            )}
          </Field>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field
              label={`Expected amount (${currency})`}
              hint="Shown as an estimate until it is paid."
              error={errors.estimatedAmount}
            >
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={form.estimatedAmount}
                  onChange={(e) => set('estimatedAmount', e.target.value)}
                  placeholder="4500"
                />
              )}
            </Field>

            <Field label="Due date" error={errors.dueDate}>
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => set('dueDate', e.target.value)}
                />
              )}
            </Field>
          </div>

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
            <Field
              label="Repeat until"
              hint="Leave empty to keep repeating."
              error={errors.endsOn}
            >
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
                placeholder="Account number, meter reading day, anything worth remembering."
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
              {saving ? 'Saving…' : bill ? 'Save changes' : 'Add bill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
