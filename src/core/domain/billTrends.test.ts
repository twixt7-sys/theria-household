import { describe, expect, it } from 'vitest';
import { analyseBillTrend, billHistory, billTrendFor, percentChange } from './billTrends';
import type { Bill } from './types';

const iso = (d: string) => new Date(d).toISOString();

/** One period of the electricity bill. */
const period = (month: string, actual: number | null, estimate: number | null = null): Bill => ({
  id: `electricity-${month}`,
  householdId: 'h1',
  name: 'Electricity',
  provider: 'Meralco',
  categoryId: null,
  estimatedAmount: estimate,
  actualAmount: actual,
  dueDate: `${month}-04`,
  billingPeriod: month,
  recurrence: { frequency: 'MONTHLY', anchorDay: 4, endsOn: null },
  priority: 'NORMAL',
  notes: '',
  active: true,
  createdAt: iso('2026-01-01'),
  updatedAt: iso('2026-01-01'),
});

describe('bill history', () => {
  it('collects one series in period order', () => {
    const bills = [period('2026-07', 4600), period('2026-05', 4000), period('2026-06', 4300)];
    expect(billHistory(bills[0], bills).map((p) => p.period)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
    ]);
  });

  it('keeps other bills out of the series', () => {
    const water: Bill = { ...period('2026-06', 900), id: 'water-2026-06', name: 'Water', provider: 'Maynilad' };
    const bills = [period('2026-06', 4300), water];
    expect(billHistory(bills[0], bills)).toHaveLength(1);
  });

  it('excludes estimates, so a guess cannot become a measured rise', () => {
    const bills = [period('2026-06', 4300), period('2026-07', null, 9000)];
    const points = billHistory(bills[0], bills);
    expect(points).toHaveLength(1);
    expect(points[0].amount).toBe(4300);
  });
});

describe('percent change', () => {
  it('measures the move between two periods', () => {
    expect(percentChange(4000, 4720)).toBeCloseTo(0.18);
  });

  it('refuses to divide by a zero base', () => {
    expect(percentChange(0, 4000)).toBeNull();
  });
});

describe('bill trend', () => {
  const points = (...amounts: number[]) =>
    amounts.map((amount, i) => ({
      billId: `b${i}`,
      period: `2026-0${i + 1}`,
      dueDate: `2026-0${i + 1}-04`,
      amount,
      isEstimate: false,
    }));

  it('says nothing at all from a single period', () => {
    const trend = analyseBillTrend(points(4000));
    expect(trend.direction).toBe('UNKNOWN');
    expect(trend.headline).toBeNull();
  });

  it('treats two periods as a comparison, not a trend', () => {
    const trend = analyseBillTrend(points(4000, 4600), { name: 'Electricity', frequency: 'MONTHLY' });
    expect(trend.changePercent).toBeCloseTo(0.15);
    // One move, and no history to call it unusual against.
    expect(trend.runLength).toBe(1);
    expect(trend.headline).toBeNull();
  });

  it('counts a run of rises and names it', () => {
    const trend = analyseBillTrend(points(4000, 4300, 4700, 5200), {
      name: 'Electricity',
      frequency: 'MONTHLY',
    });
    expect(trend.direction).toBe('RISING');
    expect(trend.runLength).toBe(3);
    expect(trend.headline).toBe('Electricity has risen three months running.');
  });

  it('breaks the run when the direction changes', () => {
    const trend = analyseBillTrend(points(4000, 5000, 4200, 4900), {
      name: 'Electricity',
      frequency: 'MONTHLY',
    });
    expect(trend.runLength).toBe(1);
    expect(trend.headline).toBe('Electricity is 17% higher than last month.');
  });

  it('reads a small wobble as steady rather than a direction', () => {
    const trend = analyseBillTrend(points(4000, 4050, 4080), {
      name: 'Electricity',
      frequency: 'MONTHLY',
    });
    expect(trend.direction).toBe('STEADY');
    expect(trend.headline).toBe('Electricity has stayed about the same.');
  });

  it('counts falls the same way', () => {
    const trend = analyseBillTrend(points(5200, 4700, 4300), {
      name: 'Water',
      frequency: 'MONTHLY',
    });
    expect(trend.direction).toBe('FALLING');
    expect(trend.headline).toBe('Water has fallen two months running.');
  });

  it('uses the bill’s own recurrence for the period noun', () => {
    const trend = analyseBillTrend(points(1000, 1200, 1500), {
      name: 'Insurance',
      frequency: 'QUARTERLY',
    });
    expect(trend.headline).toBe('Insurance has risen two quarters running.');
  });
});

describe('billTrendFor', () => {
  it('reads history and analysis straight off the household', () => {
    const bills = [
      period('2026-05', 4000),
      period('2026-06', 4400),
      period('2026-07', 4900),
      period('2026-08', null, 4900),
    ];
    const { points, trend } = billTrendFor(bills[3], bills);

    // The unpaid August estimate is history-adjacent, not history.
    expect(points).toHaveLength(3);
    expect(trend.headline).toBe('Electricity has risen two months running.');
  });
});
