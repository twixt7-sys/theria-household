import { describe, expect, it } from 'vitest';
import { computeHouseholdStatus } from './householdStatus';
import { EMPTY_HOUSEHOLD_DATA } from './types';
import type { Bill, BillPayment, Deadline, StockEvent, StockItem } from './types';

const NOW = new Date('2026-08-01T09:00:00.000Z');
const at = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * 3_600_000).toISOString();

const rice: StockItem = {
  id: 'rice',
  householdId: 'h1',
  categoryId: 'kitchen',
  name: 'Rice',
  unit: 'kg',
  quantity: 23,
  packaging: null,
  maxQuantity: 25,
  preferredQuantity: 20,
  warningThreshold: 12,
  dangerThreshold: 6,
  consumptionTrackingEnabled: true,
  priority: 'NORMAL',
  notes: '',
  active: true,
  createdAt: at(500),
  updatedAt: at(3),
};

const restock: StockEvent = {
  id: 'e1',
  householdId: 'h1',
  itemId: 'rice',
  type: 'RESTOCK',
  previousQuantity: 18,
  newQuantity: 23,
  delta: 5,
  reason: 'Restocked',
  actorId: 'u1',
  timestamp: at(3),
};

const electricity: Bill = {
  id: 'electricity',
  householdId: 'h1',
  name: 'Electricity',
  provider: 'Meralco',
  categoryId: null,
  estimatedAmount: 4500,
  actualAmount: 4832,
  dueDate: '2026-08-04',
  billingPeriod: '2026-08',
  recurrence: null,
  priority: 'NORMAL',
  notes: '',
  active: true,
  createdAt: at(500),
  updatedAt: at(1),
};

const payment: BillPayment = {
  id: 'p1',
  householdId: 'h1',
  billId: 'electricity',
  amount: 4832,
  paidAt: at(1),
  method: 'GCash',
  notes: '',
  actorId: 'u1',
};

const servicing: Deadline = {
  id: 'servicing',
  householdId: 'h1',
  title: 'Aircon servicing',
  description: '',
  date: '2026-07-30',
  categoryId: null,
  priority: 'NORMAL',
  status: 'DONE',
  recurrence: null,
  notes: '',
  active: true,
  createdAt: at(500),
  updatedAt: at(10),
};

const changesFor = (data: Partial<typeof EMPTY_HOUSEHOLD_DATA>) =>
  computeHouseholdStatus({ ...EMPTY_HOUSEHOLD_DATA, ...data }, { now: NOW }).recentChanges;

describe('recent changes', () => {
  it('reports a stock movement with its new level', () => {
    const changes = changesFor({ stockItems: [rice], stockEvents: [restock] });
    expect(changes[0].kind).toBe('STOCK');
    expect(changes[0].label).toBe('Rice');
    expect(changes[0].detail).toBe('+5 kg · 23 kg now');
  });

  it('reports a bill payment, which a stock-only feed would miss', () => {
    const changes = changesFor({ bills: [electricity], billPayments: [payment] });
    expect(changes[0].kind).toBe('BILL');
    expect(changes[0].label).toBe('Electricity');
    expect(changes[0].detail).toContain('marked paid');
  });

  it('reports a completed deadline', () => {
    const changes = changesFor({ deadlines: [servicing] });
    expect(changes[0].kind).toBe('DEADLINE');
    expect(changes[0].label).toBe('Aircon servicing');
    expect(changes[0].detail).toBe('marked done');
  });

  it('interleaves every source in one chronological feed', () => {
    const changes = changesFor({
      stockItems: [rice],
      stockEvents: [restock],
      bills: [electricity],
      billPayments: [payment],
      deadlines: [servicing],
    });

    // Newest first: payment (1h), restock (3h), servicing (10h).
    expect(changes.map((c) => c.kind)).toEqual(['BILL', 'STOCK', 'DEADLINE']);
  });

  it('leaves open and retired deadlines out of the feed', () => {
    expect(changesFor({ deadlines: [{ ...servicing, status: 'UPCOMING' }] })).toHaveLength(0);
    expect(changesFor({ deadlines: [{ ...servicing, active: false }] })).toHaveLength(0);
  });

  it('caps the feed at the requested count', () => {
    const events = Array.from({ length: 10 }, (_, i) => ({
      ...restock,
      id: `e${i}`,
      timestamp: at(i + 1),
    }));
    const status = computeHouseholdStatus(
      { ...EMPTY_HOUSEHOLD_DATA, stockItems: [rice], stockEvents: events },
      { now: NOW, recentChangeCount: 4 },
    );
    expect(status.recentChanges).toHaveLength(4);
  });

  it('formats payment amounts in the household currency', () => {
    const status = computeHouseholdStatus(
      { ...EMPTY_HOUSEHOLD_DATA, bills: [electricity], billPayments: [payment] },
      { now: NOW, currency: 'USD' },
    );
    expect(status.recentChanges[0].detail).toContain('$');
  });
});
