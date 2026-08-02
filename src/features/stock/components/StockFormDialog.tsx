import React, { useEffect, useMemo, useState } from 'react';
import { newId } from '../../../core/domain/ids';
import { packagedTotal, validateThresholds } from '../../../core/domain/stock';
import { BUILT_IN_UNITS } from '../../../core/domain/units';
import type { Packaging, Priority, StockItem, UnitCode } from '../../../core/domain/types';
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
import { useCategoryActions } from '../hooks/useCategoryActions';

/**
 * Creating and editing a stock item.
 *
 * This is the form the whole product depends on and it was missing: nothing
 * wrote to `stockItems` or `categories`, so a new household could adjust
 * quantities it had no way to create.
 *
 * The four levels are the fiddly part, so they are explained in the form rather
 * than in a manual, and validated by the same `validateThresholds` the service
 * layer uses — one rule, one implementation.
 */

const NEW_CATEGORY = '__new';
const CUSTOM_UNIT = '__custom';

const PRIORITIES: Priority[] = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];
const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

interface FormState {
  name: string;
  categoryId: string;
  newCategoryName: string;
  unit: string;
  customUnit: string;
  quantity: string;
  packaged: boolean;
  packSize: string;
  sealedPacks: string;
  openQuantity: string;
  maxQuantity: string;
  preferredQuantity: string;
  warningThreshold: string;
  dangerThreshold: string;
  consumptionTrackingEnabled: boolean;
  priority: Priority;
  notes: string;
}

const blank = (categoryId: string, unit: string): FormState => ({
  name: '',
  categoryId,
  newCategoryName: '',
  unit,
  customUnit: '',
  quantity: '',
  packaged: false,
  packSize: '',
  sealedPacks: '',
  openQuantity: '',
  maxQuantity: '',
  preferredQuantity: '',
  warningThreshold: '',
  dangerThreshold: '',
  consumptionTrackingEnabled: true,
  priority: 'NORMAL',
  notes: '',
});

const fromItem = (item: StockItem): FormState => ({
  name: item.name,
  categoryId: item.categoryId,
  newCategoryName: '',
  unit: BUILT_IN_UNITS.includes(item.unit) ? item.unit : CUSTOM_UNIT,
  customUnit: BUILT_IN_UNITS.includes(item.unit) ? '' : String(item.unit),
  quantity: String(item.quantity),
  packaged: item.packaging !== null,
  packSize: item.packaging ? String(item.packaging.packSize) : '',
  sealedPacks: item.packaging ? String(item.packaging.sealedPacks) : '',
  openQuantity: item.packaging ? String(item.packaging.openQuantity) : '',
  maxQuantity: String(item.maxQuantity),
  preferredQuantity: String(item.preferredQuantity),
  warningThreshold: String(item.warningThreshold),
  dangerThreshold: String(item.dangerThreshold),
  consumptionTrackingEnabled: item.consumptionTrackingEnabled,
  priority: item.priority,
  notes: item.notes,
});

const num = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const StockFormDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null creates; an item edits it. */
  item: StockItem | null;
  onSave: (item: StockItem, previous?: StockItem) => Promise<unknown>;
}> = ({ open, onOpenChange, item, onSave }) => {
  const { data, household } = useHousehold();
  const { save: saveCategory } = useCategoryActions();

  const categories = useMemo(() => data.categories.filter((c) => c.active), [data.categories]);

  const [form, setForm] = useState<FormState>(() => blank('', 'kg'));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(item ? fromItem(item) : blank(categories[0]?.id ?? NEW_CATEGORY, 'kg'));
    setErrors({});
    setSubmitError(null);
  }, [open, item, categories]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  // A packaged item's total is derived, never typed — the sealed/open split is
  // the source of truth for it.
  const effectiveQuantity = form.packaged
    ? packagedTotal({
        packSize: num(form.packSize),
        packUnit: (form.unit === CUSTOM_UNIT ? form.customUnit : form.unit) as UnitCode,
        sealedPacks: num(form.sealedPacks),
        openQuantity: num(form.openQuantity),
      })
    : num(form.quantity);

  const validate = (): boolean => {
    const found: Record<string, string> = {};

    if (!form.name.trim()) found.name = 'Give the item a name.';

    if (form.categoryId === NEW_CATEGORY && !form.newCategoryName.trim()) {
      found.newCategoryName = 'Name the new category.';
    }
    if (form.unit === CUSTOM_UNIT && !form.customUnit.trim()) {
      found.customUnit = 'Name the unit, e.g. sacks.';
    }
    if (form.packaged && num(form.packSize) <= 0) {
      found.packSize = 'How much is in one pack?';
    }

    // The ordering rule lives in the domain; the form only reports it.
    for (const problem of validateThresholds({
      quantity: effectiveQuantity,
      dangerThreshold: num(form.dangerThreshold),
      warningThreshold: num(form.warningThreshold),
      preferredQuantity: num(form.preferredQuantity),
      maxQuantity: num(form.maxQuantity),
    })) {
      found[problem.field] = problem.message;
    }

    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    if (!household) return;

    setSaving(true);
    setSubmitError(null);

    try {
      // A brand-new category has to exist before an item can point at it.
      let categoryId = form.categoryId;
      if (categoryId === NEW_CATEGORY) {
        const created = await saveCategory({ name: form.newCategoryName });
        categoryId = created.id;
      }

      const unit = (form.unit === CUSTOM_UNIT ? form.customUnit.trim() : form.unit) as UnitCode;

      const packaging: Packaging | null = form.packaged
        ? {
            packSize: num(form.packSize),
            packUnit: unit,
            sealedPacks: num(form.sealedPacks),
            openQuantity: num(form.openQuantity),
          }
        : null;

      const now = new Date().toISOString();

      const next: StockItem = {
        id: item?.id ?? newId(),
        householdId: household.id,
        categoryId,
        name: form.name.trim(),
        unit,
        quantity: effectiveQuantity,
        packaging,
        maxQuantity: num(form.maxQuantity),
        preferredQuantity: num(form.preferredQuantity),
        warningThreshold: num(form.warningThreshold),
        dangerThreshold: num(form.dangerThreshold),
        consumptionTrackingEnabled: form.consumptionTrackingEnabled,
        priority: form.priority,
        notes: form.notes.trim(),
        active: item?.active ?? true,
        createdAt: item?.createdAt ?? now,
        updatedAt: now,
      };

      await onSave(next, item ?? undefined);
      onOpenChange(false);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'That could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const unitLabel = form.unit === CUSTOM_UNIT ? form.customUnit || 'units' : form.unit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? `Edit ${item.name}` : 'Add a stock item'}</DialogTitle>
          <DialogDescription>
            Anything you run out of — rice, drinking water, LPG, soap. The levels below are what
            let Theria tell you when it is running low.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field label="Name" error={errors.name}>
            {(id) => (
              <Input
                id={id}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Rice"
                autoFocus
              />
            )}
          </Field>

          <Field label="Category" error={errors.newCategoryName}>
            {(id) => (
              <div className="space-y-2">
                <Select
                  id={id}
                  value={form.categoryId}
                  onChange={(e) => set('categoryId', e.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                  <option value={NEW_CATEGORY}>New category…</option>
                </Select>

                {form.categoryId === NEW_CATEGORY && (
                  <Input
                    value={form.newCategoryName}
                    onChange={(e) => set('newCategoryName', e.target.value)}
                    placeholder="Kitchen"
                    aria-label="New category name"
                  />
                )}
              </div>
            )}
          </Field>

          <Field label="Unit" error={errors.customUnit}>
            {(id) => (
              <div className="space-y-2">
                <Select id={id} value={form.unit} onChange={(e) => set('unit', e.target.value)}>
                  {BUILT_IN_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                  <option value={CUSTOM_UNIT}>Something else…</option>
                </Select>

                {form.unit === CUSTOM_UNIT && (
                  <Input
                    value={form.customUnit}
                    onChange={(e) => set('customUnit', e.target.value)}
                    placeholder="sacks"
                    aria-label="Custom unit"
                  />
                )}
              </div>
            )}
          </Field>

          <label className="flex items-center gap-2 text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={form.packaged}
              onChange={(e) => set('packaged', e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            This comes in packs
          </label>

          {form.packaged ? (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <Field label={`Pack size (${unitLabel})`} error={errors.packSize}>
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={form.packSize}
                    onChange={(e) => set('packSize', e.target.value)}
                    placeholder="5"
                  />
                )}
              </Field>
              <Field label="Sealed packs">
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step="1"
                    value={form.sealedPacks}
                    onChange={(e) => set('sealedPacks', e.target.value)}
                    placeholder="3"
                  />
                )}
              </Field>
              <Field label={`Open (${unitLabel})`}>
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={form.openQuantity}
                    onChange={(e) => set('openQuantity', e.target.value)}
                    placeholder="2.2"
                  />
                )}
              </Field>
            </div>
          ) : (
            <Field label={`How much is there now (${unitLabel})`} error={errors.quantity}>
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={form.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                  placeholder="18"
                />
              )}
            </Field>
          )}

          {form.packaged && (
            <p className="text-[0.6875rem] text-muted-foreground">
              That is {effectiveQuantity} {unitLabel} in total.
            </p>
          )}

          <fieldset className="space-y-3.5 rounded-xl border border-border p-3">
            <legend className="px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Levels
            </legend>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field
                label={`Maximum (${unitLabel})`}
                hint="The most you would ever keep."
                error={errors.maxQuantity}
              >
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={form.maxQuantity}
                    onChange={(e) => set('maxQuantity', e.target.value)}
                    placeholder="25"
                  />
                )}
              </Field>

              <Field
                label={`Preferred (${unitLabel})`}
                hint="Where you like to keep it."
                error={errors.preferredQuantity}
              >
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={form.preferredQuantity}
                    onChange={(e) => set('preferredQuantity', e.target.value)}
                    placeholder="20"
                  />
                )}
              </Field>

              <Field
                label={`Warning (${unitLabel})`}
                hint="Below this, it is low."
                error={errors.warningThreshold}
              >
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={form.warningThreshold}
                    onChange={(e) => set('warningThreshold', e.target.value)}
                    placeholder="12"
                  />
                )}
              </Field>

              <Field
                label={`Danger (${unitLabel})`}
                hint="Below this, it is urgent."
                error={errors.dangerThreshold}
              >
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={form.dangerThreshold}
                    onChange={(e) => set('dangerThreshold', e.target.value)}
                    placeholder="6"
                  />
                )}
              </Field>
            </div>
          </fieldset>

          <label className="flex items-start gap-2 text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={form.consumptionTrackingEnabled}
              onChange={(e) => set('consumptionTrackingEnabled', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            />
            <span>
              Track how fast this is used
              <span className="block font-normal text-muted-foreground">
                Needed for forecasts. Turn it off for things you refill irregularly.
              </span>
            </span>
          </label>

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

          <Field label="Notes">
            {(id) => (
              <Textarea
                id={id}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Brand, where it is kept, anything worth remembering."
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
              {saving ? 'Saving…' : item ? 'Save changes' : 'Add item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
