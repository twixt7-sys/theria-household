import { buildBillView, countdownLabel } from './bills';
import { buildDeadlineView, deadlineCountdownLabel, isApproaching } from './deadlines';
import { buildStockView } from './consumption';
import { formatCurrency, formatQuantity } from './units';
import type {
  BillView,
  DeadlineView,
  HouseholdData,
  IsoDateTime,
  StockView,
  Status,
} from './types';

/**
 * The single source of household state.
 *
 * Both the dashboard and Homi consume this. Duplicating the logic in the UI or
 * the AI layer is how the two end up disagreeing about whether the house is
 * fine (prompt0.md §7.6).
 */

export type OverallStatus = 'GOOD' | 'ATTENTION' | 'CRITICAL';

export interface StatusItem {
  id: string;
  kind: 'STOCK' | 'BILL' | 'DEADLINE';
  label: string;
  detail: string;
  status: Status;
}

export interface ChangeEntry {
  id: string;
  /** Lets the UI pick an icon without re-deriving what kind of thing changed. */
  kind: 'STOCK' | 'BILL' | 'DEADLINE';
  label: string;
  detail: string;
  at: IsoDateTime;
}

export interface HouseholdStatus {
  overallStatus: OverallStatus;
  criticalItems: StatusItem[];
  attentionItems: StatusItem[];
  upcomingItems: StatusItem[];
  recentChanges: ChangeEntry[];
  /** Deterministic. Homi may rephrase it; Homi never originates it. */
  summary: string;
  computedAt: IsoDateTime;
  stockViews: StockView[];
  billViews: BillView[];
  deadlineViews: DeadlineView[];
}

export interface StatusOptions {
  dueSoonDays?: number;
  deadlineLeadDays?: number;
  recentChangeCount?: number;
  /** Household currency, for payment amounts in the change feed. */
  currency?: string;
  now?: Date;
}

const stockItemLabel = (view: StockView): StatusItem => ({
  id: view.item.id,
  kind: 'STOCK',
  label: view.item.name,
  detail:
    view.estimatedDaysRemaining === null
      ? formatQuantity(view.item.quantity, view.item.unit)
      : `${formatQuantity(view.item.quantity, view.item.unit)} · ~${Math.round(
          view.estimatedDaysRemaining,
        )} days left`,
  status: view.status,
});

const billItemLabel = (view: BillView): StatusItem => ({
  id: view.bill.id,
  kind: 'BILL',
  label: view.bill.name,
  detail: countdownLabel(view.status, view.daysUntilDue),
  status:
    view.status === 'OVERDUE'
      ? 'CRITICAL'
      : view.status === 'DUE_TODAY' || view.status === 'DUE_SOON'
        ? 'WARNING'
        : 'GOOD',
});

const deadlineItemLabel = (view: DeadlineView): StatusItem => ({
  id: view.deadline.id,
  kind: 'DEADLINE',
  label: view.deadline.title,
  detail: deadlineCountdownLabel(view),
  status: view.status === 'MISSED' ? 'CRITICAL' : 'WARNING',
});

/**
 * Plain-language summary of the household.
 *
 * Deliberately calm. When everything is fine it says so in four words rather
 * than inventing something to report — a dashboard that always has news is a
 * dashboard people stop reading (prompt0.md §9.3).
 */
function buildSummary(critical: number, attention: number): string {
  if (critical === 0 && attention === 0) return 'Everything looks good at home.';

  const parts: string[] = [];
  if (critical > 0) {
    parts.push(critical === 1 ? '1 thing needs attention now' : `${critical} things need attention now`);
  }
  if (attention > 0) {
    parts.push(attention === 1 ? '1 to keep an eye on' : `${attention} to keep an eye on`);
  }
  return `${parts.join(', ')}.`;
}

/**
 * What has happened at home lately, across everything — not just stock.
 *
 * The overseas-family case is the whole point of this feed: "Rice +5 kg ·
 * Electricity marked paid" answers "has anything happened?" before the question
 * reaches a group chat (prompt0.md §1.2, §9.3). A feed that only knew about
 * stock would answer half of it.
 *
 * Deadlines have no event log, so a completion is dated by `updatedAt`. That is
 * approximate by construction — it moves if the record is edited later — and it
 * is the honest best available rather than a fabricated timestamp.
 */
function buildRecentChanges(
  data: HouseholdData,
  limit: number,
  currency: string,
): ChangeEntry[] {
  const stockById = new Map(data.stockItems.map((item) => [item.id, item]));
  const billById = new Map(data.bills.map((bill) => [bill.id, bill]));

  const stockChanges: ChangeEntry[] = data.stockEvents.map((event) => {
    const item = stockById.get(event.itemId);
    const unit = item?.unit ?? '';
    const sign = event.delta > 0 ? '+' : '';
    return {
      id: event.id,
      kind: 'STOCK',
      label: item?.name ?? 'Item',
      detail: `${sign}${formatQuantity(event.delta, unit)} · ${formatQuantity(
        event.newQuantity,
        unit,
      )} now`,
      at: event.timestamp,
    };
  });

  const paymentChanges: ChangeEntry[] = data.billPayments.map((payment) => ({
    id: payment.id,
    kind: 'BILL',
    label: billById.get(payment.billId)?.name ?? 'Bill',
    detail: `marked paid · ${formatCurrency(payment.amount, currency)}`,
    at: payment.paidAt,
  }));

  const deadlineChanges: ChangeEntry[] = data.deadlines
    .filter((deadline) => deadline.active && deadline.status === 'DONE')
    .map((deadline) => ({
      id: `deadline-${deadline.id}`,
      kind: 'DEADLINE',
      label: deadline.title,
      detail: 'marked done',
      at: deadline.updatedAt,
    }));

  return [...stockChanges, ...paymentChanges, ...deadlineChanges]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

export function computeHouseholdStatus(
  data: HouseholdData,
  options: StatusOptions = {},
): HouseholdStatus {
  const {
    dueSoonDays = 3,
    deadlineLeadDays = 14,
    recentChangeCount = 6,
    currency = 'PHP',
    now = new Date(),
  } = options;

  const stockViews = data.stockItems
    .filter((item) => item.active)
    .map((item) => buildStockView(item, data.stockEvents, now));

  const billViews = data.bills
    .filter((bill) => bill.active)
    .map((bill) => buildBillView(bill, data.billPayments, dueSoonDays, now));

  const deadlineViews = data.deadlines
    .filter((deadline) => deadline.active)
    .map((deadline) => buildDeadlineView(deadline, now));

  const criticalItems: StatusItem[] = [
    ...stockViews.filter((v) => v.status === 'CRITICAL').map(stockItemLabel),
    ...billViews.filter((v) => v.status === 'OVERDUE').map(billItemLabel),
    ...deadlineViews.filter((v) => v.status === 'MISSED').map(deadlineItemLabel),
  ];

  const attentionItems: StatusItem[] = [
    ...stockViews.filter((v) => v.status === 'WARNING').map(stockItemLabel),
    ...billViews
      .filter((v) => v.status === 'DUE_TODAY' || v.status === 'DUE_SOON')
      .map(billItemLabel),
    ...deadlineViews
      .filter((v) => isApproaching(v, deadlineLeadDays) && v.daysUntil <= 3)
      .map(deadlineItemLabel),
  ];

  const upcomingItems: StatusItem[] = [
    ...billViews.filter((v) => v.status === 'UPCOMING').map(billItemLabel),
    ...deadlineViews
      .filter((v) => isApproaching(v, deadlineLeadDays) && v.daysUntil > 3)
      .map(deadlineItemLabel),
  ];

  const recentChanges = buildRecentChanges(data, recentChangeCount, currency);

  const overallStatus: OverallStatus =
    criticalItems.length > 0 ? 'CRITICAL' : attentionItems.length > 0 ? 'ATTENTION' : 'GOOD';

  return {
    overallStatus,
    criticalItems,
    attentionItems,
    upcomingItems,
    recentChanges,
    summary: buildSummary(criticalItems.length, attentionItems.length),
    computedAt: now.toISOString(),
    stockViews,
    billViews,
    deadlineViews,
  };
}
