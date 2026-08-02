import { describe, expect, it } from 'vitest';
import { generateInsights } from './insights';
import { EMPTY_HOUSEHOLD_DATA } from './types';
import type { Bill, HouseholdData, StockEvent, StockItem } from './types';

const NOW = new Date('2026-08-01T09:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

const item = (over: Partial<StockItem> = {}): StockItem => ({
  id: 'rice',
  householdId: 'h1',
  categoryId: 'kitchen',
  name: 'Rice',
  unit: 'kg',
  quantity: 20,
  packaging: null,
  maxQuantity: 25,
  preferredQuantity: 20,
  warningThreshold: 12,
  dangerThreshold: 6,
  consumptionTrackingEnabled: true,
  priority: 'NORMAL',
  notes: '',
  active: true,
  createdAt: daysAgo(90),
  updatedAt: daysAgo(1),
  ...over,
});

/** `n` consumption events of `amount`, one per day ending `endDaysAgo` ago. */
const usage = (
  itemId: string,
  n: number,
  amount: number,
  endDaysAgo: number,
  idPrefix: string,
): StockEvent[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${idPrefix}-${i}`,
    householdId: 'h1',
    itemId,
    type: 'CONSUMPTION' as const,
    previousQuantity: 25,
    newQuantity: 24,
    delta: -amount,
    reason: 'Used',
    actorId: 'u1',
    timestamp: daysAgo(endDaysAgo + i),
  }));

const bill = (over: Partial<Bill> = {}): Bill => ({
  id: 'electricity-2026-05',
  householdId: 'h1',
  name: 'Electricity',
  provider: 'Meralco',
  categoryId: null,
  estimatedAmount: null,
  actualAmount: 4000,
  dueDate: '2026-05-04',
  billingPeriod: '2026-05',
  recurrence: { frequency: 'MONTHLY', anchorDay: 4, endsOn: null },
  priority: 'NORMAL',
  notes: '',
  active: true,
  createdAt: daysAgo(120),
  updatedAt: daysAgo(90),
  ...over,
});

const data = (over: Partial<HouseholdData>): HouseholdData => ({
  ...EMPTY_HOUSEHOLD_DATA,
  ...over,
});

describe('the insight engine', () => {
  it('says nothing at all about an empty household', () => {
    expect(generateInsights(EMPTY_HOUSEHOLD_DATA, { now: NOW })).toEqual([]);
  });

  it('stays silent when there is stock but no history to read', () => {
    // A well-stocked item with no events supports no claim whatsoever.
    expect(generateInsights(data({ stockItems: [item()] }), { now: NOW })).toEqual([]);
  });

  it('refuses to forecast depletion from thin evidence', () => {
    // Two events is below the minimum, however alarming the level looks.
    const insights = generateInsights(
      data({ stockItems: [item({ quantity: 2 })], stockEvents: usage('rice', 2, 1, 1, 'e') }),
      { now: NOW },
    );
    expect(insights.some((i) => i.kind === 'DEPLETION')).toBe(false);
  });
});

describe('depletion insights', () => {
  const runningOut = data({
    stockItems: [item({ quantity: 3 })],
    stockEvents: usage('rice', 10, 1, 1, 'e'),
  });

  it('warns when supply runs out inside the horizon', () => {
    const depletion = generateInsights(runningOut, { now: NOW }).find(
      (i) => i.kind === 'DEPLETION',
    );

    expect(depletion).toBeDefined();
    expect(depletion!.title).toMatch(/^Rice runs out /);
    expect(depletion!.subjectId).toBe('rice');
  });

  it('hedges the forecast rather than stating it as measurement', () => {
    const depletion = generateInsights(runningOut, { now: NOW }).find(
      (i) => i.kind === 'DEPLETION',
    );
    expect(depletion!.detail).toContain('Based on recent usage');
  });

  it('escalates severity as the date closes in', () => {
    const soon = generateInsights(runningOut, { now: NOW }).find((i) => i.kind === 'DEPLETION');
    expect(soon!.severity).toBe('CRITICAL');
  });

  it('stays quiet about an item with plenty left', () => {
    const stocked = data({
      stockItems: [item({ quantity: 500 })],
      stockEvents: usage('rice', 10, 1, 1, 'e'),
    });
    expect(generateInsights(stocked, { now: NOW }).some((i) => i.kind === 'DEPLETION')).toBe(false);
  });

  it('ignores items that opted out of consumption tracking', () => {
    const untracked = data({
      stockItems: [item({ quantity: 3, consumptionTrackingEnabled: false })],
      stockEvents: usage('rice', 10, 1, 1, 'e'),
    });
    expect(generateInsights(untracked, { now: NOW }).some((i) => i.kind === 'DEPLETION')).toBe(
      false,
    );
  });
});

describe('consumption change insights', () => {
  it('reports a real rise against the previous window', () => {
    // 3/day for the last 14 days, 1/day for the 14 before that.
    const events = [
      ...usage('rice', 14, 3, 0, 'recent'),
      ...usage('rice', 14, 1, 14, 'prior'),
    ];
    const insight = generateInsights(data({ stockItems: [item()], stockEvents: events }), {
      now: NOW,
    }).find((i) => i.kind === 'CONSUMPTION_CHANGE');

    expect(insight).toBeDefined();
    expect(insight!.title).toContain('Rice consumption rose');
    expect(insight!.severity).toBe('WARNING');
  });

  it('treats using less as good news, not a problem', () => {
    const events = [
      ...usage('rice', 14, 1, 0, 'recent'),
      ...usage('rice', 14, 3, 14, 'prior'),
    ];
    const insight = generateInsights(data({ stockItems: [item()], stockEvents: events }), {
      now: NOW,
    }).find((i) => i.kind === 'CONSUMPTION_CHANGE');

    expect(insight!.title).toContain('fell');
    expect(insight!.severity).toBe('GOOD');
  });

  it('ignores a wobble too small to mean anything', () => {
    const events = [
      ...usage('rice', 14, 1, 0, 'recent'),
      ...usage('rice', 14, 1.05, 14, 'prior'),
    ];
    const insights = generateInsights(data({ stockItems: [item()], stockEvents: events }), {
      now: NOW,
    });
    expect(insights.some((i) => i.kind === 'CONSUMPTION_CHANGE')).toBe(false);
  });
});

describe('bill trend insights', () => {
  const rising = [
    bill({ id: 'e-05', billingPeriod: '2026-05', dueDate: '2026-05-04', actualAmount: 4000 }),
    bill({ id: 'e-06', billingPeriod: '2026-06', dueDate: '2026-06-04', actualAmount: 4400 }),
    bill({ id: 'e-07', billingPeriod: '2026-07', dueDate: '2026-07-04', actualAmount: 4900 }),
  ];

  it('reports a run of rises once the history supports it', () => {
    const insight = generateInsights(data({ bills: rising }), { now: NOW }).find(
      (i) => i.kind === 'BILL_TREND',
    );

    expect(insight).toBeDefined();
    expect(insight!.title).toBe('Electricity has risen two months running.');
    expect(insight!.severity).toBe('WARNING');
  });

  it('raises one insight per bill, not one per billing period', () => {
    const insights = generateInsights(data({ bills: rising }), { now: NOW }).filter(
      (i) => i.kind === 'BILL_TREND',
    );
    expect(insights).toHaveLength(1);
  });

  it('says nothing about a steady bill', () => {
    const steady = rising.map((b, i) => ({ ...b, actualAmount: 4000 + i }));
    expect(
      generateInsights(data({ bills: steady }), { now: NOW }).some((i) => i.kind === 'BILL_TREND'),
    ).toBe(false);
  });

  it('says nothing from a single billing period', () => {
    expect(
      generateInsights(data({ bills: [rising[0]] }), { now: NOW }).some(
        (i) => i.kind === 'BILL_TREND',
      ),
    ).toBe(false);
  });
});

describe('ordering and stability', () => {
  it('puts the most serious claim first', () => {
    const insights = generateInsights(
      data({
        stockItems: [item({ quantity: 2 })], // below danger → CRITICAL
        stockEvents: usage('rice', 10, 1, 1, 'e'),
      }),
      { now: NOW },
    );

    expect(insights[0].severity).toBe('CRITICAL');
  });

  it('reports a danger level on its own when there is no forecast to give', () => {
    // No usage history, so nothing can be said about when it runs out — but
    // the level itself is still a fact worth stating.
    const insights = generateInsights(data({ stockItems: [item({ quantity: 2 })] }), { now: NOW });

    expect(insights.map((i) => i.kind)).toEqual(['THRESHOLD']);
  });

  it('drops the threshold notice when a depletion date says the same thing better', () => {
    const insights = generateInsights(
      data({
        stockItems: [item({ quantity: 2 })],
        stockEvents: usage('rice', 10, 1, 1, 'e'),
      }),
      { now: NOW },
    );

    // One sack of rice, one line about it.
    expect(insights.filter((i) => i.subjectId === 'rice' && i.kind === 'THRESHOLD')).toHaveLength(
      0,
    );
    expect(insights.some((i) => i.kind === 'DEPLETION')).toBe(true);
  });

  it('produces identical ids across runs, so the list does not flicker', () => {
    const household = data({
      stockItems: [item({ quantity: 3 })],
      stockEvents: usage('rice', 10, 1, 1, 'e'),
    });

    const first = generateInsights(household, { now: NOW }).map((i) => i.id);
    const second = generateInsights(household, { now: NOW }).map((i) => i.id);
    expect(first).toEqual(second);
  });
});
