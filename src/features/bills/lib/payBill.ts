import { generateNextOccurrence } from '../../../core/domain/bills';
import { newId } from '../../../core/domain/ids';
import type { Bill, BillPayment, IsoDateTime } from '../../../core/domain/types';

/**
 * Paying a bill, as a pure function.
 *
 * Three things happen at once and they have to stay consistent: a payment is
 * recorded, the bill's amount becomes fact rather than estimate, and — if it
 * recurs — the next period appears. Keeping that in one tested function is
 * what stops the three from drifting apart in a component (prompt0.md §9.6).
 */

export interface PaymentInput {
  amount: number;
  method: string;
  notes?: string;
  /** Defaults to now. Backdating a payment recorded late is legitimate. */
  paidAt?: IsoDateTime;
}

export interface PaymentResult {
  payment: BillPayment;
  /** The bill, settled: the amount actually paid is now the actual amount. */
  bill: Bill;
  /** The following period, or null when there should not be one. */
  nextOccurrence: Bill | null;
}

export function payBill(
  bill: Bill,
  input: PaymentInput,
  actorId: string,
  existingBills: Bill[],
  now: Date = new Date(),
): PaymentResult {
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new Error('Enter the amount that was paid.');
  }

  const timestamp = now.toISOString();

  const payment: BillPayment = {
    id: newId(),
    householdId: bill.householdId,
    billId: bill.id,
    amount: input.amount,
    paidAt: input.paidAt ?? timestamp,
    method: input.method.trim() || 'Unrecorded',
    notes: input.notes?.trim() ?? '',
    actorId,
  };

  // What was paid is what the bill cost. Leaving the estimate in place would
  // leave every later trend reading a guess as though it were a measurement.
  const settled: Bill = {
    ...bill,
    actualAmount: input.amount,
    updatedAt: timestamp,
  };

  return {
    payment,
    bill: settled,
    // Generated from the settled bill, so this period's actual becomes next
    // period's estimate. The derived id keeps a double tap idempotent.
    nextOccurrence: generateNextOccurrence(settled, existingBills, now),
  };
}
