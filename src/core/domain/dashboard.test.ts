import { describe, expect, it } from 'vitest';
import { buildCategorySummaries } from './categories';
import { computeHouseholdStatus } from './householdStatus';
import { buildDemoHousehold } from './mockData';
import { composeDashboard } from './priority';

/**
 * The dashboard composed end to end, against the demo household.
 *
 * Every other test here checks one formula in isolation. This one checks that
 * the pieces still agree once they are stacked — status feeding priority
 * feeding card sizes — which is exactly what breaks when a shape changes and
 * the unit tests all keep passing.
 */

const household = () => buildDemoHousehold('h1', 'u1');

describe('dashboard composition', () => {
  it('ranks the household without needing any live data', () => {
    const status = computeHouseholdStatus(household());
    const cards = composeDashboard(status);

    expect(cards.length).toBeGreaterThan(0);
    // Scores must be monotonically non-increasing — that ordering is the
    // entire contract the dashboard renders against.
    const scores = cards.map((c) => c.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('puts the household’s most urgent item first', () => {
    const status = computeHouseholdStatus(household());
    const cards = composeDashboard(status);

    // Drinking water sits at its danger threshold in the demo data.
    expect(cards[0].stock?.item.name).toBe('Drinking Water');
    expect(cards[0].size).toBe('hero');
  });

  it('reports attention without inventing alarm', () => {
    const status = computeHouseholdStatus(household());

    expect(status.overallStatus).toBe('CRITICAL');
    expect(status.criticalItems.length).toBeGreaterThan(0);
    expect(status.summary).toMatch(/need|needs/);
  });

  it('summarises every category that holds something', () => {
    const data = household();
    const summaries = buildCategorySummaries(data.categories, data.stockItems);

    expect(summaries.map((s) => s.category.name).sort()).toEqual([
      'Kitchen',
      'Toiletries',
      'Utilities',
    ]);
    // Kitchen holds the critical water container, so it leads.
    expect(summaries[0].category.name).toBe('Kitchen');
    expect(summaries[0].status).toBe('CRITICAL');
  });

  it('feeds the change log from real stock history', () => {
    const status = computeHouseholdStatus(household());

    expect(status.recentChanges.length).toBeGreaterThan(0);
    expect(status.recentChanges.every((c) => c.kind === 'STOCK')).toBe(true);
    // Newest first.
    const timestamps = status.recentChanges.map((c) => c.at);
    expect([...timestamps].sort((a, b) => b.localeCompare(a))).toEqual(timestamps);
  });

  it('drops paid bills out of the ranking but keeps the rest', () => {
    const data = household();
    const cards = composeDashboard(computeHouseholdStatus(data));
    const billCards = cards.filter((c) => c.kind === 'BILL');

    expect(billCards.length).toBe(data.bills.length);
    expect(billCards.every((c) => c.bill?.status !== 'PAID')).toBe(true);
  });
});
