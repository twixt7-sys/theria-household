import { useCallback } from 'react';
import { billingPeriodFor } from '../../../core/domain/bills';
import { newId } from '../../../core/domain/ids';
import { refusalMessage } from '../../../core/domain/permissions';
import type { Bill } from '../../../core/domain/types';
import { useAuth } from '../../../core/state/AuthContext';
import { useHousehold } from '../../../core/state/HouseholdContext';
import { payBill, type PaymentInput } from '../lib/payBill';

/**
 * Bill mutations, permission-checked in one place.
 *
 * Components call these and never touch the repository. The role check here is
 * UX — Firestore rules reject the write independently — but it is what turns a
 * PERMISSION_DENIED into a sentence a person can read (prompt0.md §9.9).
 */

/** What a form supplies. Everything else is derived or defaulted. */
export type BillDraft = Omit<
  Bill,
  'id' | 'householdId' | 'billingPeriod' | 'createdAt' | 'updatedAt' | 'active'
> & { id?: string };

export function useBillActions() {
  const { user } = useAuth();
  const { data, household, put, can } = useHousehold();

  const canWrite = can('bills:write');
  const canPay = can('bills:pay');

  const save = useCallback(
    async (draft: BillDraft) => {
      if (!canWrite) throw new Error(refusalMessage('bills:write'));
      if (!household) throw new Error('No active household.');

      const now = new Date().toISOString();
      const existing = draft.id ? data.bills.find((b) => b.id === draft.id) : undefined;

      const bill: Bill = {
        ...draft,
        id: draft.id ?? newId(),
        householdId: household.id,
        // The period follows the due date, so it can never drift out of step
        // with it — that pairing is what keeps recurrence idempotent.
        billingPeriod: billingPeriodFor(draft.dueDate),
        active: existing?.active ?? true,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      await put('bills', bill);
      return bill;
    },
    [canWrite, data.bills, household, put],
  );

  /**
   * Records a payment, settles the bill, and opens the next period.
   *
   * The payment is written first. If a later write fails the household is left
   * with a recorded payment against a bill that still reads as due — visible
   * and correctable. The reverse, a settled bill with no record of who paid it,
   * is neither.
   */
  const pay = useCallback(
    async (bill: Bill, input: PaymentInput) => {
      if (!canPay) throw new Error(refusalMessage('bills:pay'));
      if (!user) throw new Error('You need to be signed in to record a payment.');

      const { payment, bill: settled, nextOccurrence } = payBill(bill, input, user.id, data.bills);

      await put('billPayments', payment);
      await put('bills', settled);
      if (nextOccurrence) await put('bills', nextOccurrence);

      return { payment, nextOccurrence };
    },
    [canPay, data.bills, put, user],
  );

  /** Retire rather than delete — payment history stays intact (§6.8). */
  const archive = useCallback(
    async (bill: Bill) => {
      if (!canWrite) throw new Error(refusalMessage('bills:write'));
      await put('bills', { ...bill, active: false, updatedAt: new Date().toISOString() });
    },
    [canWrite, put],
  );

  return { save, pay, archive, canWrite, canPay };
}
