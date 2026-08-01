import React from 'react';
import { Receipt } from 'lucide-react';
import type { CardSize } from '../../../core/domain/priority';
import { countdownLabel } from '../../../core/domain/bills';
import { formatCurrency } from '../../../core/domain/units';
import type { BillView } from '../../../core/domain/types';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { TheriaCard } from '../../../shared/components/TheriaCard';
import { BILL_STATUS_LABEL, BILL_STATUS_TO_STATUS } from '../../../shared/lib/statusStyles';

/** "When is electricity due?" — the countdown leads, the amount supports it. */
export const BillCard: React.FC<{
  view: BillView;
  size?: CardSize;
  currency: string;
  onOpen?: () => void;
}> = ({ view, size = 'medium', currency, onOpen }) => {
  const { bill, status, daysUntilDue, displayAmount, isEstimate } = view;
  const mapped = BILL_STATUS_TO_STATUS[status];

  return (
    <TheriaCard
      size={size}
      accent={status === 'OVERDUE' ? 'critical' : status === 'DUE_TODAY' ? 'warning' : 'none'}
      onClick={onOpen}
      aria-label={`${bill.name}, ${countdownLabel(status, daysUntilDue)}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Receipt size={16} className="text-muted-foreground" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-foreground">{bill.name}</p>
          {bill.provider && (
            <p className="truncate text-[0.6875rem] text-muted-foreground">{bill.provider}</p>
          )}

          <p className="tabular mt-1.5 text-lg font-semibold leading-none text-foreground">
            {displayAmount === null ? '—' : formatCurrency(displayAmount, currency)}
          </p>
          {/* An estimate is never shown as though it were the real figure. */}
          {isEstimate && (
            <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">Estimated</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={mapped} label={BILL_STATUS_LABEL[status]} />
            <span className="text-[0.6875rem] text-muted-foreground">
              {countdownLabel(status, daysUntilDue)}
            </span>
          </div>
        </div>
      </div>
    </TheriaCard>
  );
};
