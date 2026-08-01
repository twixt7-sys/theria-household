import { describe, expect, it } from 'vitest';
import {
  isOverflowing,
  packagedTotal,
  stockPercentage,
  stockStatus,
  validateThresholds,
} from './stock';
import {
  MIN_CONSUMPTION_EVENTS,
  averageDailyConsumption,
  estimatedDaysRemaining,
} from './consumption';
import {
  billStatus,
  countdownLabel,
  daysUntilDue,
  generateNextOccurrence,
  nextDueDate,
} from './bills';
import { composeDashboard } from './priority';
import { computeHouseholdStatus } from './householdStatus';
import { canConvert, convert, formatDaysRemaining, formatQuantity } from './units';
import { EMPTY_HOUSEHOLD_DATA } from './types';
import type { Bill, BillPayment, StockEvent, StockItem } from './types';

const NOW = new Date('2026-08-01T09:00:00.000Z');
const iso = (d: string) => new Date(d).toISOString();

const stockItem = (over: Partial<StockItem> = {}): StockItem => ({
  id: 'rice',
  householdId: 'h1',
  categoryId: 'kitchen',
  name: 'Rice',
  unit: 'kg',
  quantity: 18,
  packaging: null,
  maxQuantity: 25,
  preferredQuantity: 20,
  warningThreshold: 12,
  dangerThreshold: 6,
  consumptionTrackingEnabled: true,
  priority: 'NORMAL',
  notes: '',
  active: true,
  createdAt: iso('2026-06-01'),
  updatedAt: iso('2026-06-01'),
  ...over,
});

const bill = (over: Partial<Bill> = {}): Bill => ({
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
  createdAt: iso('2026-07-01'),
  updatedAt: iso('2026-07-01'),
  ...over,
});

/* -------------------------------------------------------------------- stock */

describe('stock levels', () => {
  it('computes percentage of maximum', () => {
    expect(stockPercentage(stockItem())).toBeCloseTo(72);
  });

  it('returns 0 rather than NaN when maximum is zero', () => {
    expect(stockPercentage(stockItem({ maxQuantity: 0 }))).toBe(0);
  });

  it('classifies all four threshold bands', () => {
    expect(stockStatus(stockItem({ quantity: 22 }))).toBe('GOOD');
    // Below preferred but above the warning threshold — low, not urgent.
    expect(stockStatus(stockItem({ quantity: 18 }))).toBe('WARNING');
    expect(stockStatus(stockItem({ quantity: 12 }))).toBe('WARNING');
    expect(stockStatus(stockItem({ quantity: 6 }))).toBe('CRITICAL');
    expect(stockStatus(stockItem({ quantity: 0 }))).toBe('CRITICAL');
  });

  it('totals packaged quantities: 3 sealed 5kg sacks plus 2.2kg open', () => {
    expect(
      packagedTotal({ packSize: 5, packUnit: 'kg', sealedPacks: 3, openQuantity: 2.2 }),
    ).toBeCloseTo(17.2);
  });

  it('flags overflow without treating it as invalid', () => {
    expect(isOverflowing(stockItem({ quantity: 30 }))).toBe(true);
    expect(isOverflowing(stockItem())).toBe(false);
  });
});

describe('threshold validation', () => {
  it('accepts a correctly ordered item', () => {
    expect(validateThresholds(stockItem())).toEqual([]);
  });

  it('rejects danger above warning', () => {
    const problems = validateThresholds(stockItem({ dangerThreshold: 15 }));
    expect(problems.map((p) => p.field)).toContain('dangerThreshold');
  });

  it('rejects preferred above maximum', () => {
    const problems = validateThresholds(stockItem({ preferredQuantity: 30 }));
    expect(problems.map((p) => p.field)).toContain('preferredQuantity');
  });
});

/* -------------------------------------------------------------- consumption */

describe('consumption', () => {
  const consumptionEvents = (count: number, dayGap: number, delta: number): StockEvent[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `e${i}`,
      householdId: 'h1',
      itemId: 'rice',
      type: 'CONSUMPTION' as const,
      previousQuantity: 25 - i * delta,
      newQuantity: 25 - (i + 1) * delta,
      delta: -delta,
      reason: 'Consumption',
      actorId: 'u1',
      timestamp: new Date(NOW.getTime() - (count - 1 - i) * dayGap * 86_400_000).toISOString(),
    }));

  it('refuses to estimate below the event minimum', () => {
    const events = consumptionEvents(MIN_CONSUMPTION_EVENTS - 1, 5, 2);
    expect(averageDailyConsumption(events, NOW)).toBeNull();
  });

  it('refuses to estimate below the observation window', () => {
    // Three events, but crammed into two days — not enough to generalise from.
    const events = consumptionEvents(3, 1, 2);
    expect(averageDailyConsumption(events, NOW)).toBeNull();
  });

  it('estimates a rate once there is enough evidence', () => {
    // 4 events, 5 days apart: 15 days observed, 8kg consumed.
    const events = consumptionEvents(4, 5, 2);
    const rate = averageDailyConsumption(events, NOW);
    expect(rate).not.toBeNull();
    expect(rate!).toBeGreaterThan(0);
  });

  it('ignores restocks when computing a rate', () => {
    const events: StockEvent[] = [
      ...consumptionEvents(4, 5, 2),
      {
        id: 'restock',
        householdId: 'h1',
        itemId: 'rice',
        type: 'RESTOCK',
        previousQuantity: 10,
        newQuantity: 25,
        delta: 15,
        reason: 'Restocked',
        actorId: 'u1',
        timestamp: NOW.toISOString(),
      },
    ];
    const withRestock = averageDailyConsumption(events, NOW);
    const withoutRestock = averageDailyConsumption(consumptionEvents(4, 5, 2), NOW);
    expect(withRestock).toBeCloseTo(withoutRestock!);
  });

  it('returns null days remaining when the rate is unknown', () => {
    expect(estimatedDaysRemaining(18, null)).toBeNull();
    expect(formatDaysRemaining(null)).toBe('Not enough data yet');
  });

  it('estimates days remaining from a known rate', () => {
    expect(estimatedDaysRemaining(18, 1.38)).toBeCloseTo(13.04, 1);
  });
});

/* -------------------------------------------------------------------- bills */

describe('bill countdown', () => {
  it('counts calendar days in both directions', () => {
    expect(daysUntilDue('2026-08-04', NOW)).toBe(3);
    expect(daysUntilDue('2026-08-01', NOW)).toBe(0);
    expect(daysUntilDue('2026-07-30', NOW)).toBe(-2);
  });

  it('derives status from the due date', () => {
    expect(billStatus(bill({ dueDate: '2026-07-30' }), [], 3, NOW)).toBe('OVERDUE');
    expect(billStatus(bill({ dueDate: '2026-08-01' }), [], 3, NOW)).toBe('DUE_TODAY');
    expect(billStatus(bill({ dueDate: '2026-08-03' }), [], 3, NOW)).toBe('DUE_SOON');
    expect(billStatus(bill({ dueDate: '2026-08-20' }), [], 3, NOW)).toBe('UPCOMING');
  });

  it('treats a late payment as settled, not still overdue', () => {
    const payment: BillPayment = {
      id: 'p1',
      householdId: 'h1',
      billId: 'electricity',
      amount: 4832,
      paidAt: iso('2026-08-01'),
      method: 'cash',
      notes: '',
      actorId: 'u1',
    };
    expect(billStatus(bill({ dueDate: '2026-07-20' }), [payment], 3, NOW)).toBe('PAID');
  });

  it('writes human countdown copy', () => {
    expect(countdownLabel('DUE_TODAY', 0)).toBe('Due today');
    expect(countdownLabel('DUE_SOON', 1)).toBe('Due tomorrow');
    expect(countdownLabel('DUE_SOON', 3)).toBe('Due in 3 days');
    expect(countdownLabel('OVERDUE', -1)).toBe('Overdue by 1 day');
    expect(countdownLabel('OVERDUE', -2)).toBe('Overdue by 2 days');
  });
});

describe('recurring bills', () => {
  it('advances by frequency', () => {
    expect(nextDueDate({ frequency: 'MONTHLY', anchorDay: 4, endsOn: null }, '2026-08-04')).toBe(
      '2026-09-04',
    );
    expect(nextDueDate({ frequency: 'QUARTERLY', anchorDay: 4, endsOn: null }, '2026-08-04')).toBe(
      '2026-11-04',
    );
  });

  it('clamps a 31st due date into a short month', () => {
    expect(nextDueDate({ frequency: 'MONTHLY', anchorDay: 31, endsOn: null }, '2026-01-31')).toBe(
      '2026-02-28',
    );
  });

  it('generates the next period once', () => {
    const recurring = bill({ recurrence: { frequency: 'MONTHLY', anchorDay: 4, endsOn: null } });
    const next = generateNextOccurrence(recurring, [recurring], NOW);

    expect(next).not.toBeNull();
    expect(next!.dueDate).toBe('2026-09-04');
    expect(next!.billingPeriod).toBe('2026-09');
    // Last period's actual becomes next period's estimate, clearly labelled.
    expect(next!.estimatedAmount).toBe(4832);
    expect(next!.actualAmount).toBeNull();
  });

  it('never generates a duplicate for a period that already exists', () => {
    const recurring = bill({ recurrence: { frequency: 'MONTHLY', anchorDay: 4, endsOn: null } });
    const first = generateNextOccurrence(recurring, [recurring], NOW)!;
    const second = generateNextOccurrence(recurring, [recurring, first], NOW);
    expect(second).toBeNull();
  });

  it('stops at the end of the recurrence', () => {
    const ending = bill({
      recurrence: { frequency: 'MONTHLY', anchorDay: 4, endsOn: '2026-08-31' },
    });
    expect(generateNextOccurrence(ending, [ending], NOW)).toBeNull();
  });
});

/* -------------------------------------------------------------------- units */

describe('units', () => {
  it('converts within a dimension', () => {
    expect(convert(1, 'kg', 'g')).toBe(1000);
    expect(convert(500, 'mL', 'L')).toBe(0.5);
  });

  it('refuses to convert across dimensions or custom units', () => {
    expect(canConvert('kg', 'L')).toBe(false);
    expect(convert(1, 'kg', 'L')).toBeNull();
    expect(convert(1, 'sacks', 'kg')).toBeNull();
  });

  it('rounds for display without exposing machine precision', () => {
    expect(formatQuantity(1.384729, 'kg')).toBe('1.38 kg');
    expect(formatQuantity(18, 'kg')).toBe('18 kg');
  });

  it('pluralises count units', () => {
    expect(formatQuantity(1, 'container')).toBe('1 container');
    expect(formatQuantity(2, 'container')).toBe('2 containers');
  });
});

/* ------------------------------------------------------------------- status */

describe('household status', () => {
  it('is calm when everything is healthy', () => {
    const status = computeHouseholdStatus(
      { ...EMPTY_HOUSEHOLD_DATA, stockItems: [stockItem({ quantity: 24 })] },
      { now: NOW },
    );
    expect(status.overallStatus).toBe('GOOD');
    expect(status.summary).toBe('Everything looks good at home.');
  });

  it('counts what needs attention', () => {
    const status = computeHouseholdStatus(
      {
        ...EMPTY_HOUSEHOLD_DATA,
        stockItems: [stockItem({ quantity: 18 })],
        bills: [bill({ dueDate: '2026-08-02', actualAmount: null })],
      },
      { now: NOW },
    );
    expect(status.overallStatus).toBe('ATTENTION');
    expect(status.attentionItems).toHaveLength(2);
  });

  it('escalates to critical when stock is below the danger threshold', () => {
    const status = computeHouseholdStatus(
      { ...EMPTY_HOUSEHOLD_DATA, stockItems: [stockItem({ id: 'water', quantity: 1, dangerThreshold: 1, warningThreshold: 2, preferredQuantity: 4, maxQuantity: 5 })] },
      { now: NOW },
    );
    expect(status.overallStatus).toBe('CRITICAL');
    expect(status.criticalItems).toHaveLength(1);
  });
});

/* ----------------------------------------------------------------- priority */

describe('dashboard priority', () => {
  it('ranks the §125 fixture: water, electricity, rice, internet', () => {
    const data = {
      ...EMPTY_HOUSEHOLD_DATA,
      stockItems: [
        // Rice: normal — 18kg against a preferred 20kg, per the brief's own
        // seed data. Below preferred, but nowhere near the warning threshold.
        stockItem({ id: 'rice', name: 'Rice', quantity: 18 }),
        // Drinking water: critical.
        stockItem({
          id: 'water',
          name: 'Drinking Water',
          unit: 'container',
          quantity: 1,
          maxQuantity: 5,
          preferredQuantity: 4,
          warningThreshold: 2,
          dangerThreshold: 1,
          consumptionTrackingEnabled: false,
        }),
      ],
      bills: [
        bill({ id: 'electricity', name: 'Electricity', dueDate: '2026-08-02', actualAmount: null }),
        bill({ id: 'internet', name: 'Internet', dueDate: '2026-08-15', actualAmount: null }),
      ],
    };

    const cards = composeDashboard(computeHouseholdStatus(data, { now: NOW }), { now: NOW });
    const order = cards.map((c) => c.id);

    expect(order.indexOf('stock-water')).toBeLessThan(order.indexOf('bill-electricity'));
    expect(order.indexOf('bill-electricity')).toBeLessThan(order.indexOf('stock-rice'));
    expect(order.indexOf('stock-rice')).toBeLessThan(order.indexOf('bill-internet'));
  });

  it('lets state outrank configured priority', () => {
    const data = {
      ...EMPTY_HOUSEHOLD_DATA,
      bills: [
        bill({ id: 'overdue-low', name: 'Low but overdue', priority: 'LOW', dueDate: '2026-07-28', actualAmount: null }),
        bill({ id: 'future-high', name: 'High but distant', priority: 'HIGH', dueDate: '2026-08-25', actualAmount: null }),
      ],
    };

    const cards = composeDashboard(computeHouseholdStatus(data, { now: NOW }), { now: NOW });
    expect(cards[0].id).toBe('bill-overdue-low');
  });

  it('drops paid bills out of the attention list', () => {
    const paid: BillPayment = {
      id: 'p1',
      householdId: 'h1',
      billId: 'electricity',
      amount: 4832,
      paidAt: iso('2026-07-30'),
      method: 'cash',
      notes: '',
      actorId: 'u1',
    };
    const data = {
      ...EMPTY_HOUSEHOLD_DATA,
      bills: [bill({ dueDate: '2026-08-02' })],
      billPayments: [paid],
    };

    const cards = composeDashboard(computeHouseholdStatus(data, { now: NOW }), { now: NOW });
    expect(cards.find((c) => c.id === 'bill-electricity')).toBeUndefined();
  });

  it('gives the most urgent card the largest size', () => {
    const data = {
      ...EMPTY_HOUSEHOLD_DATA,
      bills: [bill({ dueDate: '2026-07-25', actualAmount: null })],
    };
    const cards = composeDashboard(computeHouseholdStatus(data, { now: NOW }), { now: NOW });
    expect(cards[0].size).toBe('hero');
  });
});
