import React from 'react';
import { Archive, Pencil, Wallet } from 'lucide-react';
import { countdownLabel } from '../../../core/domain/bills';
import { formatCurrency } from '../../../core/domain/units';
import type { BillView } from '../../../core/domain/types';
import { useHousehold } from '../../../core/state/HouseholdContext';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Button } from '../../../shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/dialog';
import { BILL_STATUS_LABEL, BILL_STATUS_TO_STATUS } from '../../../shared/lib/statusStyles';
import { BillHistory } from './BillHistory';

/**
 * One bill in full: where it stands, what it has cost over time, and who paid
 * it. Everything a Manager needs before deciding whether it can wait.
 *
 * An Observer sees all of it and none of the buttons — observational, not
 * disabled (prompt0.md §1.5).
 */
export const BillDetailDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: BillView | null;
  currency: string;
  canWrite: boolean;
  canPay: boolean;
  onEdit: () => void;
  onPay: () => void;
  onArchive: () => void;
}> = ({ open, onOpenChange, view, currency, canWrite, canPay, onEdit, onPay, onArchive }) => {
  const { data } = useHousehold();

  if (!view) return null;

  const { bill, status, daysUntilDue, displayAmount, isEstimate } = view;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bill.name}</DialogTitle>
          <DialogDescription>
            {bill.provider ? `${bill.provider} · ` : ''}
            {bill.billingPeriod} · due {bill.dueDate}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="tabular text-2xl font-semibold leading-none text-foreground">
              {displayAmount === null ? '—' : formatCurrency(displayAmount, currency)}
            </p>
            <StatusBadge status={BILL_STATUS_TO_STATUS[status]} label={BILL_STATUS_LABEL[status]} />
            <span className="text-xs text-muted-foreground">
              {countdownLabel(status, daysUntilDue)}
            </span>
          </div>

          {isEstimate && (
            <p className="text-[0.6875rem] text-muted-foreground">
              Estimated — the statement has not been recorded yet.
            </p>
          )}

          {bill.notes && (
            <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {bill.notes}
            </p>
          )}

          <BillHistory
            bill={bill}
            bills={data.bills}
            payments={data.billPayments}
            currency={currency}
          />
        </div>

        {(canPay || canWrite) && (
          <DialogFooter className="sm:justify-between">
            {canWrite ? (
              <Button variant="ghost" onClick={onArchive}>
                <Archive size={14} aria-hidden />
                Archive
              </Button>
            ) : (
              <span />
            )}

            <span className="flex flex-col gap-2 sm:flex-row">
              {canWrite && (
                <Button variant="outline" onClick={onEdit}>
                  <Pencil size={14} aria-hidden />
                  Edit
                </Button>
              )}
              {canPay && status !== 'PAID' && (
                <Button onClick={onPay}>
                  <Wallet size={14} aria-hidden />
                  Record payment
                </Button>
              )}
            </span>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
