import { describe, expect, it } from 'vitest';
import { adjustStock, classifyDelta, correctStock } from './adjustStock';
import type { StockItem } from '../../../core/domain/types';

const rice: StockItem = {
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
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('stock adjustment', () => {
  it('classifies direction of change', () => {
    expect(classifyDelta(-1)).toBe('CONSUMPTION');
    expect(classifyDelta(5)).toBe('RESTOCK');
  });

  it('records before, after and actor on every change', () => {
    const { item, event } = adjustStock(rice, -5, 'u1');
    expect(item.quantity).toBe(13);
    expect(event.previousQuantity).toBe(18);
    expect(event.newQuantity).toBe(13);
    expect(event.delta).toBe(-5);
    expect(event.type).toBe('CONSUMPTION');
    expect(event.actorId).toBe('u1');
  });

  it('never lets a quantity go negative', () => {
    const { item, event } = adjustStock(rice, -50, 'u1');
    expect(item.quantity).toBe(0);
    // The recorded delta is what actually happened, not what was asked for.
    expect(event.delta).toBe(-18);
  });

  it('redistributes packs after a partial-unit change', () => {
    const packaged: StockItem = {
      ...rice,
      quantity: 17.2,
      packaging: { packSize: 5, packUnit: 'kg', sealedPacks: 3, openQuantity: 2.2 },
    };
    const { item } = adjustStock(packaged, -3, 'u1');
    expect(item.quantity).toBeCloseTo(14.2);
    expect(item.packaging!.sealedPacks).toBe(2);
    expect(item.packaging!.openQuantity).toBeCloseTo(4.2);
  });

  it('records a recount as CORRECTION so it cannot skew the usage rate', () => {
    const { event } = correctStock(rice, 15, 'u1');
    expect(event.type).toBe('CORRECTION');
    expect(event.newQuantity).toBe(15);
    expect(event.delta).toBe(-3);
  });

  it('stamps updatedAt so the priority engine can surface recent changes', () => {
    const now = new Date('2026-08-01T09:00:00.000Z');
    const { item, event } = adjustStock(rice, -1, 'u1', { now });
    expect(item.updatedAt).toBe(now.toISOString());
    expect(event.timestamp).toBe(now.toISOString());
  });
});
