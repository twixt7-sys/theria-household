import { describe, expect, it } from 'vitest';
import { buildCategorySummaries, summaryDetail } from './categories';
import type { Category, StockItem } from './types';

const iso = (d: string) => new Date(d).toISOString();

const category = (over: Partial<Category> = {}): Category => ({
  id: 'kitchen',
  householdId: 'h1',
  name: 'Kitchen',
  icon: 'CookingPot',
  priority: 'HIGH',
  description: '',
  active: true,
  createdAt: iso('2026-06-01'),
  updatedAt: iso('2026-06-01'),
  ...over,
});

/** Defaults sit comfortably in GOOD; each test moves only what it cares about. */
const item = (over: Partial<StockItem> = {}): StockItem => ({
  id: 'rice',
  householdId: 'h1',
  categoryId: 'kitchen',
  name: 'Rice',
  unit: 'kg',
  quantity: 24,
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

describe('summary copy', () => {
  it('names critical before low, because it changes what you do today', () => {
    expect(summaryDetail(12, 2, 1)).toBe('12 items · 1 critical, 2 low');
  });

  it('says so plainly when nothing needs attention', () => {
    expect(summaryDetail(8, 0, 0)).toBe('8 items · all good');
  });

  it('pluralises honestly', () => {
    expect(summaryDetail(1, 0, 0)).toBe('1 item · all good');
    expect(summaryDetail(0, 0, 0)).toBe('No items yet');
  });
});

describe('category summaries', () => {
  it('counts items and rolls up their statuses', () => {
    const summaries = buildCategorySummaries(
      [category()],
      [
        item({ id: 'a' }),
        item({ id: 'b', quantity: 18 }), // below preferred → low
        item({ id: 'c', quantity: 4 }), // below danger → critical
      ],
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0].itemCount).toBe(3);
    expect(summaries[0].lowCount).toBe(1);
    expect(summaries[0].criticalCount).toBe(1);
    expect(summaries[0].detail).toBe('3 items · 1 critical, 1 low');
  });

  it('lets the worst item set the category status, never an average', () => {
    // Nine healthy items plus one empty sack is not "mostly fine".
    const items = [
      ...Array.from({ length: 9 }, (_, i) => item({ id: `ok${i}` })),
      item({ id: 'empty', quantity: 0 }),
    ];
    expect(buildCategorySummaries([category()], items)[0].status).toBe('CRITICAL');
  });

  it('drops empty categories rather than rendering zeroes', () => {
    const summaries = buildCategorySummaries(
      [category(), category({ id: 'garage', name: 'Garage' })],
      [item()],
    );
    expect(summaries.map((s) => s.category.id)).toEqual(['kitchen']);
  });

  it('ignores retired categories and retired items', () => {
    expect(buildCategorySummaries([category({ active: false })], [item()])).toHaveLength(0);
    expect(buildCategorySummaries([category()], [item({ active: false })])).toHaveLength(0);
  });

  it('floats categories needing attention to the top', () => {
    const summaries = buildCategorySummaries(
      [
        category({ id: 'kitchen', name: 'Kitchen' }),
        category({ id: 'bath', name: 'Bathroom' }),
        category({ id: 'garage', name: 'Garage' }),
      ],
      [
        item({ id: 'a', categoryId: 'kitchen' }),
        item({ id: 'b', categoryId: 'bath', quantity: 18 }), // low
        item({ id: 'c', categoryId: 'garage', quantity: 2 }), // critical
      ],
    );

    expect(summaries.map((s) => s.category.id)).toEqual(['garage', 'bath', 'kitchen']);
  });

  it('keeps items out of categories they do not belong to', () => {
    const summaries = buildCategorySummaries(
      [category(), category({ id: 'bath', name: 'Bathroom' })],
      [item({ id: 'soap', categoryId: 'bath' }), item({ id: 'rice' })],
    );
    expect(summaries.every((s) => s.itemCount === 1)).toBe(true);
  });
});
