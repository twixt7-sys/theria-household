import { describe, expect, it } from 'vitest';
import {
  buildDeadlineView,
  deadlineCountdownLabel,
  deadlineStatus,
  generateNextDeadline,
  isApproaching,
} from './deadlines';
import type { Deadline } from './types';

const NOW = new Date('2026-08-01T09:00:00.000Z');
const iso = (d: string) => new Date(d).toISOString();

const deadline = (over: Partial<Deadline> = {}): Deadline => ({
  id: 'tuition',
  householdId: 'h1',
  title: 'Tuition payment',
  description: '',
  date: '2026-08-15',
  categoryId: null,
  priority: 'NORMAL',
  status: 'UPCOMING',
  recurrence: null,
  notes: '',
  active: true,
  createdAt: iso('2026-07-01'),
  updatedAt: iso('2026-07-01'),
  ...over,
});

describe('deadline status', () => {
  it('is upcoming while the date is ahead', () => {
    expect(deadlineStatus(deadline(), NOW)).toBe('UPCOMING');
  });

  it('is missed once the date has passed', () => {
    expect(deadlineStatus(deadline({ date: '2026-07-28' }), NOW)).toBe('MISSED');
  });

  it('stays done after the fact, rather than becoming missed', () => {
    // A deadline met last week is not a failure just because the date is past.
    expect(deadlineStatus(deadline({ date: '2026-07-28', status: 'DONE' }), NOW)).toBe('DONE');
  });

  it('treats the day itself as still upcoming', () => {
    expect(deadlineStatus(deadline({ date: '2026-08-01' }), NOW)).toBe('UPCOMING');
  });
});

describe('deadline countdown copy', () => {
  const label = (date: string, status?: Deadline['status']) =>
    deadlineCountdownLabel(buildDeadlineView(deadline({ date, status }), NOW));

  it('speaks in days, never timestamps', () => {
    expect(label('2026-08-01')).toBe('Today');
    expect(label('2026-08-02')).toBe('Tomorrow');
    expect(label('2026-08-06')).toBe('In 5 days');
  });

  it('counts the overshoot when a date is missed', () => {
    expect(label('2026-07-31')).toBe('Missed 1 day ago');
    expect(label('2026-07-29')).toBe('Missed 3 days ago');
  });

  it('says nothing more once it is done', () => {
    expect(label('2026-07-29', 'DONE')).toBe('Done');
  });
});

describe('approaching deadlines', () => {
  const view = (date: string, status?: Deadline['status']) =>
    buildDeadlineView(deadline({ date, status }), NOW);

  it('surfaces what falls inside the lead window', () => {
    expect(isApproaching(view('2026-08-10'), 14)).toBe(true);
    expect(isApproaching(view('2026-08-30'), 14)).toBe(false);
  });

  it('leaves done and missed deadlines out of the approaching set', () => {
    expect(isApproaching(view('2026-08-10', 'DONE'), 14)).toBe(false);
    expect(isApproaching(view('2026-07-20'), 14)).toBe(false);
  });
});

describe('recurring deadlines', () => {
  const quarterly = deadline({
    recurrence: { frequency: 'QUARTERLY', anchorDay: 15, endsOn: null },
  });

  it('advances by the recurrence frequency', () => {
    const next = generateNextDeadline(quarterly, [quarterly], NOW);
    expect(next).not.toBeNull();
    expect(next!.date).toBe('2026-11-15');
  });

  it('opens the next occurrence even when this one was completed', () => {
    const done = { ...quarterly, status: 'DONE' as const };
    expect(generateNextDeadline(done, [done], NOW)!.status).toBe('UPCOMING');
  });

  it('never generates a duplicate for a date that already exists', () => {
    const first = generateNextDeadline(quarterly, [quarterly], NOW)!;
    expect(generateNextDeadline(quarterly, [quarterly, first], NOW)).toBeNull();
  });

  it('stops at the end of the recurrence', () => {
    const ending = deadline({
      recurrence: { frequency: 'QUARTERLY', anchorDay: 15, endsOn: '2026-10-01' },
    });
    expect(generateNextDeadline(ending, [ending], NOW)).toBeNull();
  });

  it('generates nothing for a one-off or retired deadline', () => {
    expect(generateNextDeadline(deadline(), [], NOW)).toBeNull();
    expect(generateNextDeadline({ ...quarterly, active: false }, [], NOW)).toBeNull();
  });
});
