import React, { useEffect, useState } from 'react';
import { billingPeriodFor, nextDueDate } from '../../../core/domain/bills';
import { fromIsoDate, toIsoDate } from '../../../core/domain/dates';
import { formatCurrency } from '../../../core/domain/units';
import type { Bill } from '../../../core/domain/types';
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
import type { PaymentInput } from '../lib/payBill';

const METHODS = ['Cash', 'GCash', 'Bank transfer', 'Card', 'Auto-debit', 'Over the counter'];

/**
 * The instant a payment happened, from a date field that has no time.
 *
 * A payment recorded today keeps the current time. Reading it as local
 * midnight — which is what the date alone means — made a payment entered just
 * now appear in the change feed as "11h ago", which is how it read in testing.
 * Backdated payments keep local midnight, since the real time is unknown and
 * midnight is the honest floor for that day.
 */
const paidAtFrom = (date: string, now: Date = new Date()): string =>
  date === toIsoDate(now) ? now.toISOString() : fromIsoDate(date).toISOString();

/**
 * Recording a payment.
 *
 * The amount defaults to what the bill said but stays editable, because the
 * statement and the estimate disagree often enough that forcing the estimate
 * through would quietly corrupt every later trend.
 */
export const PayBillDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill | null;
  currency: string;
  onPay: (bill: Bill, input: PaymentInput) => Promise<unknown>;
}> = ({ open, onOpenChange, bill, currency, onPay }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(METHODS[0]);
  const [paidOn, setPaidOn] = useState(toIsoDate(new Date()));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !bill) return;
    const suggested = bill.actualAmount ?? bill.estimatedAmount;
    setAmount(suggested === null ? '' : String(suggested));
    setMethod(METHODS[0]);
    setPaidOn(toIsoDate(new Date()));
    setNotes('');
    setError(null);
  }, [open, bill]);

  if (!bill) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value < 0) {
      setError('Enter the amount that was paid.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onPay(bill, {
        amount: value,
        method,
        notes,
        paidAt: paidAtFrom(paidOn),
      });
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That payment could not be recorded.');
    } finally {
      setSaving(false);
    }
  };

  // Say what else this will do, before it does it.
  const nextPeriod = bill.recurrence
    ? (() => {
        const due = nextDueDate(bill.recurrence, bill.dueDate);
        if (bill.recurrence.endsOn && due > bill.recurrence.endsOn) return null;
        return { due, period: billingPeriodFor(due) };
      })()
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payment for {bill.name}</DialogTitle>
          <DialogDescription>
            {bill.estimatedAmount !== null && bill.actualAmount === null
              ? `Expected ${formatCurrency(bill.estimatedAmount, currency)}. Enter what was actually paid.`
              : 'Enter what was actually paid.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label={`Amount paid (${currency})`}>
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              )}
            </Field>

            <Field label="Paid on">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  value={paidOn}
                  max={toIsoDate(new Date())}
                  onChange={(e) => setPaidOn(e.target.value)}
                />
              )}
            </Field>
          </div>

          <Field label="Method">
            {(id) => (
              <Select id={id} value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Notes">
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reference number, who paid it."
              />
            )}
          </Field>

          {nextPeriod && (
            <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-[0.6875rem] text-muted-foreground">
              Recording this also opens the {nextPeriod.period} bill, due {nextPeriod.due}.
            </p>
          )}

          {error && (
            <p role="alert" className="text-xs text-status-critical">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Recording…' : 'Record payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
