import React from 'react';
import { Repeat, Wallet } from 'lucide-react';
import { countdownLabel } from '../../../core/domain/bills';
import { formatCurrency } from '../../../core/domain/units';
import type { BillView } from '../../../core/domain/types';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Button } from '../../../shared/components/ui/button';
import { cn } from '../../../shared/lib/cn';
import { BILL_STATUS_LABEL, BILL_STATUS_TO_STATUS } from '../../../shared/lib/statusStyles';

/**
 * One bill in the list.
 *
 * The row itself opens the detail; "Record payment" is a separate button
 * inside it rather than a nested clickable, because a button inside a button
 * is invalid markup and unusable with a keyboard.
 */
export const BillRow: React.FC<{
  view: BillView;
  currency: string;
  canPay: boolean;
  onOpen: () => void;
  onPay: () => void;
}> = ({ view, currency, canPay, onOpen, onPay }) => {
  const { bill, status, daysUntilDue, displayAmount, isEstimate } = view;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-2xl border p-4 transition-colors',
        status === 'OVERDUE'
          ? 'border-status-critical/35 bg-status-critical-soft'
          : status === 'DUE_TODAY'
            ? 'border-status-warning/30 bg-status-warning-soft'
            : 'border-border bg-card',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
        aria-label={`${bill.name}, ${countdownLabel(status, daysUntilDue)}. Open details.`}
      >
        <div className="flex items-center gap-2">
          <p className="tabular text-lg font-semibold leading-none text-foreground">
            {displayAmount === null ? '—' : formatCurrency(displayAmount, currency)}
          </p>
          <StatusBadge status={BILL_STATUS_TO_STATUS[status]} label={BILL_STATUS_LABEL[status]} />
          {bill.recurrence && (
            <Repeat size={12} className="text-muted-foreground" aria-label="Repeats" />
          )}
        </div>

        <p className="mt-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {bill.name}
          {bill.provider && <span className="normal-case"> · {bill.provider}</span>}
        </p>

        <p className="mt-0.5 text-xs text-muted-foreground">
          {countdownLabel(status, daysUntilDue)}
          {isEstimate && ' · estimated'}
        </p>
      </button>

      {canPay && status !== 'PAID' && (
        <Button variant="outline" size="sm" onClick={onPay}>
          <Wallet size={13} aria-hidden />
          Record payment
        </Button>
      )}
    </div>
  );
};
