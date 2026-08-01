/**
 * Every domain type for Theria: Household.
 *
 * The household — never the user — is the ownership boundary, so every record
 * carries a householdId. V1 ships one active household, but nothing here
 * forbids more.
 */

/* ---------------------------------------------------------------- primitives */

/** ISO-8601 date-time string. Dates are never stored as display strings. */
export type IsoDateTime = string;
/** ISO-8601 calendar date, `YYYY-MM-DD`. */
export type IsoDate = string;

export type Role = 'MANAGER' | 'OBSERVER';

export type MemberStatus = 'ACTIVE' | 'INVITED' | 'REMOVED';

/**
 * UNKNOWN is load-bearing: it is the honest status for an item we cannot yet
 * judge, and it keeps the UI from implying a forecast it cannot make.
 */
export type Status = 'GOOD' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';

export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type BillStatus = 'UPCOMING' | 'DUE_SOON' | 'DUE_TODAY' | 'OVERDUE' | 'PAID';

export type DeadlineStatus = 'UPCOMING' | 'DONE' | 'MISSED';

export type StockEventType = 'ADJUSTMENT' | 'RESTOCK' | 'CONSUMPTION' | 'CORRECTION';

/** Built-in units. Households may also define their own, which never convert. */
export type UnitCode = 'kg' | 'g' | 'L' | 'mL' | 'pcs' | 'pack' | 'container' | '%' | (string & {});

export type RecurrenceFrequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'WEEKLY';

export interface Recurrence {
  frequency: RecurrenceFrequency;
  /** Day of month (1-31) for monthly/quarterly/yearly; day of week (0-6) for weekly. */
  anchorDay: number;
  /** Null means it recurs indefinitely. */
  endsOn: IsoDate | null;
}

/* ------------------------------------------------------------------ entities */

export interface Household {
  id: string;
  name: string;
  /** Configurable — never hardcode a currency symbol in a component. */
  currency: string;
  timezone: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface HouseholdMember {
  id: string;
  userId: string;
  householdId: string;
  role: Role;
  status: MemberStatus;
  displayName: string;
  email: string;
  invitedAt: IsoDateTime | null;
  joinedAt: IsoDateTime | null;
}

export interface Category {
  id: string;
  householdId: string;
  name: string;
  /** A lucide-react icon name. One icon family, app-wide. */
  icon: string;
  priority: Priority;
  description: string;
  active: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Packaged stock — "three sealed 5kg sacks plus 2.2kg open".
 *
 * Modelled properly rather than crammed into one number or, worse, a string,
 * because the sealed/open split is what the user actually sees in the cupboard
 * and what makes "+1 pack" a meaningful button.
 */
export interface Packaging {
  packSize: number;
  packUnit: UnitCode;
  sealedPacks: number;
  openQuantity: number;
}

export interface StockItem {
  id: string;
  householdId: string;
  categoryId: string;
  name: string;
  unit: UnitCode;
  /** Always the total in `unit`. Derived from packaging when present. */
  quantity: number;
  packaging: Packaging | null;
  maxQuantity: number;
  preferredQuantity: number;
  warningThreshold: number;
  dangerThreshold: number;
  consumptionTrackingEnabled: boolean;
  priority: Priority;
  notes: string;
  active: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Append-only. Stock history is what makes any analysis possible. */
export interface StockEvent {
  id: string;
  householdId: string;
  itemId: string;
  type: StockEventType;
  previousQuantity: number;
  newQuantity: number;
  delta: number;
  reason: string;
  actorId: string;
  timestamp: IsoDateTime;
}

export interface Bill {
  id: string;
  householdId: string;
  name: string;
  provider: string;
  categoryId: string | null;
  /** Before the statement arrives. Never charted as fact. */
  estimatedAmount: number | null;
  actualAmount: number | null;
  dueDate: IsoDate;
  /** e.g. '2026-08' — identifies the period this bill covers. */
  billingPeriod: string;
  recurrence: Recurrence | null;
  priority: Priority;
  notes: string;
  active: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Append-only, so a bill's payment history survives every later edit. */
export interface BillPayment {
  id: string;
  householdId: string;
  billId: string;
  amount: number;
  paidAt: IsoDateTime;
  method: string;
  notes: string;
  actorId: string;
}

export interface Deadline {
  id: string;
  householdId: string;
  title: string;
  description: string;
  date: IsoDate;
  categoryId: string | null;
  priority: Priority;
  status: DeadlineStatus;
  recurrence: Recurrence | null;
  notes: string;
  active: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Insight {
  id: string;
  householdId: string;
  kind: 'CONSUMPTION_CHANGE' | 'BILL_TREND' | 'DEPLETION' | 'THRESHOLD';
  title: string;
  detail: string;
  severity: Status;
  subjectType: 'STOCK' | 'BILL' | 'DEADLINE';
  subjectId: string;
  generatedAt: IsoDateTime;
}

export interface HouseholdSettings {
  id: string;
  householdId: string;
  /** How many days ahead a bill counts as DUE_SOON. Configurable, not a law. */
  dueSoonDays: number;
  /** How many days ahead a deadline starts surfacing. */
  deadlineLeadDays: number;
  notificationsEnabled: boolean;
  defaultUnit: UnitCode;
  updatedAt: IsoDateTime;
}

/* -------------------------------------------------------------- collections */

/**
 * The shape a repository loads and a subscription emits. Keyed so the
 * repository can stay small — one generic `put` instead of per-entity CRUD.
 */
export interface HouseholdData {
  members: HouseholdMember[];
  categories: Category[];
  stockItems: StockItem[];
  stockEvents: StockEvent[];
  bills: Bill[];
  billPayments: BillPayment[];
  deadlines: Deadline[];
  insights: Insight[];
}

export type CollectionKey = keyof HouseholdData;

export type ItemOf<K extends CollectionKey> = HouseholdData[K][number];

export const EMPTY_HOUSEHOLD_DATA: HouseholdData = {
  members: [],
  categories: [],
  stockItems: [],
  stockEvents: [],
  bills: [],
  billPayments: [],
  deadlines: [],
  insights: [],
};

/* ------------------------------------------------------------- derived views */

/** A stock item plus everything computed about it. Never persisted. */
export interface StockView {
  item: StockItem;
  percentage: number;
  status: Status;
  /** Null when there is not enough history — see consumption.ts. */
  averageDailyConsumption: number | null;
  estimatedDaysRemaining: number | null;
  estimatedDepletionDate: IsoDate | null;
  trend: 'RISING' | 'STEADY' | 'FALLING' | 'UNKNOWN';
}

export interface BillView {
  bill: Bill;
  status: BillStatus;
  daysUntilDue: number;
  /** The amount to show: actual when known, otherwise the estimate. */
  displayAmount: number | null;
  isEstimate: boolean;
  lastPayment: BillPayment | null;
}

export interface DeadlineView {
  deadline: Deadline;
  daysUntil: number;
  status: DeadlineStatus;
}
