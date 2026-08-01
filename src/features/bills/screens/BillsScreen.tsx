import React, { useMemo, useState } from 'react';
import { Plus, Receipt } from 'lucide-react';
import { buildBillView } from '../../../core/domain/bills';
import type { Bill, BillStatus, BillView } from '../../../core/domain/types';
import { useHousehold } from '../../../core/state/HouseholdContext';
import { EmptyState } from '../../../shared/components/EmptyState';
import { LoadingState } from '../../../shared/components/LoadingState';
import { Button } from '../../../shared/components/ui/button';
import { BillDetailDialog } from '../components/BillDetailDialog';
import { BillFormDialog } from '../components/BillFormDialog';
import { BillRow } from '../components/BillRow';
import { PayBillDialog } from '../components/PayBillDialog';
import { useBillActions } from '../hooks/useBillActions';

/**
 * Every bill, grouped by what it is asking of you.
 *
 * Order within the app's own hierarchy: what is late, what is close, what is
 * coming, what is settled. A paid bill is not hidden — it is just no longer
 * competing for attention (prompt0.md §9.6).
 */

const ATTENTION: BillStatus[] = ['OVERDUE', 'DUE_TODAY', 'DUE_SOON'];
const RECENT_PAID_LIMIT = 6;

const Group: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({
  title,
  count,
  children,
}) => (
  <section aria-label={title} className="space-y-2">
    <h2 className="flex items-baseline gap-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
      <span className="tabular font-normal normal-case tracking-normal">{count}</span>
    </h2>
    <div className="space-y-2">{children}</div>
  </section>
);

export const BillsScreen: React.FC = () => {
  const { phase, household, data } = useHousehold();
  const { save, pay, archive, canWrite, canPay } = useBillActions();

  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [paying, setPaying] = useState<Bill | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const currency = household?.currency ?? 'PHP';

  const views = useMemo(
    () =>
      data.bills
        .filter((bill) => bill.active)
        .map((bill) => buildBillView(bill, data.billPayments))
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue),
    [data.bills, data.billPayments],
  );

  const groups = useMemo(() => {
    const attention = views.filter((v) => ATTENTION.includes(v.status));
    const upcoming = views.filter((v) => v.status === 'UPCOMING');
    const paid = views
      .filter((v) => v.status === 'PAID')
      .sort((a, b) => b.bill.dueDate.localeCompare(a.bill.dueDate));
    return { attention, upcoming, paid };
  }, [views]);

  const detailView: BillView | null = detail
    ? (views.find((v) => v.bill.id === detail) ?? null)
    : null;

  if (phase === 'loading') return <LoadingState />;

  const run = (work: Promise<unknown>) => {
    setError(null);
    work.catch((cause: Error) => setError(cause.message));
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openRow = (view: BillView) => setDetail(view.bill.id);

  const openPay = (bill: Bill) => {
    setDetail(null);
    setPaying(bill);
  };

  const rows = (list: BillView[]) =>
    list.map((view) => (
      <BillRow
        key={view.bill.id}
        view={view}
        currency={currency}
        canPay={canPay}
        onOpen={() => openRow(view)}
        onPay={() => openPay(view.bill)}
      />
    ));

  return (
    <div className="space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-status-critical/30 bg-status-critical-soft px-4 py-3 text-xs text-status-critical"
        >
          {error}
        </div>
      )}

      {canWrite && views.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} aria-hidden />
            Add bill
          </Button>
        </div>
      )}

      {views.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No bills yet"
          description="Add electricity, water and internet, and Theria will count down to each due date and keep the amount history."
          action={
            canWrite ? (
              <Button onClick={openCreate}>
                <Plus size={14} aria-hidden />
                Add your first bill
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.attention.length > 0 && (
            <Group title="Needs attention" count={groups.attention.length}>
              {rows(groups.attention)}
            </Group>
          )}

          {groups.upcoming.length > 0 && (
            <Group title="Upcoming" count={groups.upcoming.length}>
              {rows(groups.upcoming)}
            </Group>
          )}

          {groups.paid.length > 0 && (
            <Group title="Paid" count={groups.paid.length}>
              {rows(groups.paid.slice(0, RECENT_PAID_LIMIT))}
              {groups.paid.length > RECENT_PAID_LIMIT && (
                <p className="px-1 text-[0.6875rem] text-muted-foreground">
                  {groups.paid.length - RECENT_PAID_LIMIT} older paid bills are kept in each bill's
                  history.
                </p>
              )}
            </Group>
          )}
        </div>
      )}

      <BillFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        bill={editing}
        onSave={(draft) => save(draft)}
      />

      <PayBillDialog
        open={paying !== null}
        onOpenChange={(open) => !open && setPaying(null)}
        bill={paying}
        currency={currency}
        onPay={(bill, input) => pay(bill, input)}
      />

      <BillDetailDialog
        open={detailView !== null}
        onOpenChange={(open) => !open && setDetail(null)}
        view={detailView}
        currency={currency}
        canWrite={canWrite}
        canPay={canPay}
        onEdit={() => {
          if (!detailView) return;
          setEditing(detailView.bill);
          setDetail(null);
          setFormOpen(true);
        }}
        onPay={() => detailView && openPay(detailView.bill)}
        onArchive={() => {
          if (!detailView) return;
          const bill = detailView.bill;
          setDetail(null);
          run(archive(bill));
        }}
      />
    </div>
  );
};
