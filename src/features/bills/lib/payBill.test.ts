import { describe, expect, it } from 'vitest';
import { billStatus } from '../../../core/domain/bills';
import type { Bill } from '../../../core/domain/types';
import { payBill } from './payBill';

const NOW = new Date('2026-08-01T09:00:00.000Z');
const iso = (d: string) => new Date(d).toISOString();

const bill = (over: Partial<Bill> = {}): Bill => ({
  id: 'electricity',
  householdId: 'h1',
  name: 'Electricity',
  provider: 'Meralco',
  categoryId: null,
  estimatedAmount: 4500,
  actualAmount: null,
  dueDate: '2026-08-04',
  billingPeriod: '2026-08',
  recurrence: { frequency: 'MONTHLY', anchorDay: 4, endsOn: null },
  priority: 'NORMAL',
  notes: '',
  active: true,
  createdAt: iso('2026-07-01'),
  updatedAt: iso('2026-07-01'),
  ...over,
});

describe('paying a bill', () => {
  it('records who paid, how much, and when', () => {
    const { payment } = payBill(bill(), { amount: 4832, method: 'GCash' }, 'u1', [], NOW);

    expect(payment.billId).toBe('electricity');
    expect(payment.householdId).toBe('h1');
    expect(payment.amount).toBe(4832);
    expect(payment.actorId).toBe('u1');
    expect(payment.paidAt).toBe(NOW.toISOString());
  });

  it('turns the estimate into the actual amount', () => {
    const { bill: settled } = payBill(bill(), { amount: 4832, method: 'cash' }, 'u1', [], NOW);
    expect(settled.actualAmount).toBe(4832);
    expect(settled.estimatedAmount).toBe(4500);
  });

  it('settles the bill, so it stops being due', () => {
    const original = bill({ dueDate: '2026-07-20' });
    const { payment, bill: settled } = payBill(original, { amount: 4832, method: 'cash' }, 'u1', [], NOW);

    expect(billStatus(original, [], 3, NOW)).toBe('OVERDUE');
    expect(billStatus(settled, [payment], 3, NOW)).toBe('PAID');
  });

  it('accepts a backdated payment recorded after the fact', () => {
    const paidAt = iso('2026-07-29');
    const { payment } = payBill(bill(), { amount: 4832, method: 'cash', paidAt }, 'u1', [], NOW);
    expect(payment.paidAt).toBe(paidAt);
  });

  it('rejects an amount that is not a number of pesos', () => {
    expect(() => payBill(bill(), { amount: -50, method: 'cash' }, 'u1', [], NOW)).toThrow();
    expect(() => payBill(bill(), { amount: Number.NaN, method: 'cash' }, 'u1', [], NOW)).toThrow();
  });

  it('records an unspecified method rather than an empty one', () => {
    const { payment } = payBill(bill(), { amount: 4832, method: '  ' }, 'u1', [], NOW);
    expect(payment.method).toBe('Unrecorded');
  });
});

describe('recurrence on payment', () => {
  it('opens the next period, carrying the paid amount forward as its estimate', () => {
    const current = bill();
    const { nextOccurrence } = payBill(
      current,
      { amount: 4832, method: 'cash' },
      'u1',
      [current],
      NOW,
    );

    expect(nextOccurrence).not.toBeNull();
    expect(nextOccurrence!.dueDate).toBe('2026-09-04');
    expect(nextOccurrence!.billingPeriod).toBe('2026-09');
    expect(nextOccurrence!.estimatedAmount).toBe(4832);
    expect(nextOccurrence!.actualAmount).toBeNull();
  });

  it('does not open a period that already exists', () => {
    const current = bill();
    const first = payBill(current, { amount: 4832, method: 'cash' }, 'u1', [current], NOW)
      .nextOccurrence!;

    // Paying twice — a double tap, or two devices at once — must not produce
    // two September electricity bills.
    const second = payBill(current, { amount: 4832, method: 'cash' }, 'u1', [current, first], NOW);
    expect(second.nextOccurrence).toBeNull();
  });

  it('opens nothing for a one-off bill', () => {
    const oneOff = bill({ recurrence: null });
    const { nextOccurrence } = payBill(
      oneOff,
      { amount: 1200, method: 'cash' },
      'u1',
      [oneOff],
      NOW,
    );
    expect(nextOccurrence).toBeNull();
  });

  it('stops at the end of the recurrence', () => {
    const ending = bill({ recurrence: { frequency: 'MONTHLY', anchorDay: 4, endsOn: '2026-08-31' } });
    const { nextOccurrence } = payBill(
      ending,
      { amount: 4832, method: 'cash' },
      'u1',
      [ending],
      NOW,
    );
    expect(nextOccurrence).toBeNull();
  });
});
