import { newId } from './ids';
import type { HouseholdData } from './types';

/**
 * Demo data for development.
 *
 * Realistic figures so the dashboard's priority engine has something to rank,
 * but strictly seed-only — nothing in the app may special-case "Rice" or
 * "Electricity" (prompt0.md §13.1). These are examples of data, not features.
 */

const iso = (daysFromNow: number): string =>
  new Date(Date.now() + daysFromNow * 86_400_000).toISOString();

const date = (daysFromNow: number): string => iso(daysFromNow).slice(0, 10);

export function buildDemoHousehold(householdId: string, managerId: string): HouseholdData {
  const kitchen = newId();
  const utilities = newId();
  const toiletries = newId();

  const riceId = newId();
  const waterId = newId();
  const lpgId = newId();

  // A believable few weeks of usage, so consumption forecasts have enough
  // evidence to clear the minimum-observation bar.
  const riceEvents = [22, 17, 12, 7, 3].map((daysAgo, index) => ({
    id: newId(),
    householdId,
    itemId: riceId,
    type: 'CONSUMPTION' as const,
    previousQuantity: 25 - index * 1.4,
    newQuantity: 25 - (index + 1) * 1.4,
    delta: -1.4,
    reason: 'Used',
    actorId: managerId,
    timestamp: iso(-daysAgo),
  }));

  return {
    members: [],

    categories: [
      { id: kitchen, householdId, name: 'Kitchen', icon: 'CookingPot', priority: 'HIGH', description: 'Food and cooking supplies', active: true, createdAt: iso(-60), updatedAt: iso(-60) },
      { id: utilities, householdId, name: 'Utilities', icon: 'Zap', priority: 'HIGH', description: 'Power, water, gas', active: true, createdAt: iso(-60), updatedAt: iso(-60) },
      { id: toiletries, householdId, name: 'Toiletries', icon: 'Bath', priority: 'NORMAL', description: 'Personal care', active: true, createdAt: iso(-60), updatedAt: iso(-60) },
    ],

    stockItems: [
      {
        id: riceId, householdId, categoryId: kitchen, name: 'Rice', unit: 'kg',
        quantity: 17.2,
        packaging: { packSize: 5, packUnit: 'kg', sealedPacks: 3, openQuantity: 2.2 },
        maxQuantity: 25, preferredQuantity: 20, warningThreshold: 12, dangerThreshold: 6,
        consumptionTrackingEnabled: true, priority: 'HIGH', notes: '', active: true,
        createdAt: iso(-60), updatedAt: iso(-3),
      },
      {
        id: waterId, householdId, categoryId: kitchen, name: 'Drinking Water', unit: 'container',
        quantity: 1, packaging: null,
        maxQuantity: 5, preferredQuantity: 4, warningThreshold: 2, dangerThreshold: 1,
        consumptionTrackingEnabled: true, priority: 'CRITICAL', notes: '', active: true,
        createdAt: iso(-60), updatedAt: iso(-1),
      },
      {
        id: lpgId, householdId, categoryId: utilities, name: 'LPG', unit: '%',
        quantity: 65, packaging: null,
        maxQuantity: 100, preferredQuantity: 70, warningThreshold: 35, dangerThreshold: 20,
        consumptionTrackingEnabled: false, priority: 'HIGH', notes: '', active: true,
        createdAt: iso(-60), updatedAt: iso(-10),
      },
      {
        id: newId(), householdId, categoryId: toiletries, name: 'Toothpaste', unit: 'pcs',
        quantity: 4, packaging: null,
        maxQuantity: 5, preferredQuantity: 3, warningThreshold: 2, dangerThreshold: 1,
        consumptionTrackingEnabled: false, priority: 'LOW', notes: '', active: true,
        createdAt: iso(-60), updatedAt: iso(-20),
      },
    ],

    stockEvents: riceEvents,

    bills: [
      {
        id: newId(), householdId, name: 'Water', provider: 'Maynilad', categoryId: utilities,
        estimatedAmount: 700, actualAmount: 680, dueDate: date(1), billingPeriod: date(1).slice(0, 7),
        recurrence: { frequency: 'MONTHLY', anchorDay: 2, endsOn: null },
        priority: 'NORMAL', notes: '', active: true, createdAt: iso(-30), updatedAt: iso(-5),
      },
      {
        id: newId(), householdId, name: 'Electricity', provider: 'Meralco', categoryId: utilities,
        estimatedAmount: 4500, actualAmount: 4832, dueDate: date(3), billingPeriod: date(3).slice(0, 7),
        recurrence: { frequency: 'MONTHLY', anchorDay: 4, endsOn: null },
        priority: 'HIGH', notes: '', active: true, createdAt: iso(-30), updatedAt: iso(-5),
      },
      {
        id: newId(), householdId, name: 'Internet', provider: 'PLDT', categoryId: utilities,
        estimatedAmount: 1699, actualAmount: null, dueDate: date(8), billingPeriod: date(8).slice(0, 7),
        recurrence: { frequency: 'MONTHLY', anchorDay: 9, endsOn: null },
        priority: 'NORMAL', notes: '', active: true, createdAt: iso(-30), updatedAt: iso(-5),
      },
    ],

    billPayments: [],

    deadlines: [
      {
        id: newId(), householdId, title: 'Tuition', description: 'Second semester',
        date: date(9), categoryId: null, priority: 'HIGH', status: 'UPCOMING',
        recurrence: null, notes: '', active: true, createdAt: iso(-30), updatedAt: iso(-30),
      },
      {
        id: newId(), householdId, title: 'Water tank maintenance', description: 'Annual clean',
        date: date(17), categoryId: null, priority: 'NORMAL', status: 'UPCOMING',
        recurrence: { frequency: 'YEARLY', anchorDay: 18, endsOn: null },
        notes: '', active: true, createdAt: iso(-30), updatedAt: iso(-30),
      },
    ],

    insights: [],
  };
}
