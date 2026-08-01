import { describe, expect, it } from 'vitest';
import { deadlineStatus } from '../../../core/domain/deadlines';
import type { Deadline } from '../../../core/domain/types';
import { completeDeadline, reopenDeadline } from './completeDeadline';

const NOW = new Date('2026-08-01T09:00:00.000Z');
const iso = (d: string) => new Date(d).toISOString();

const deadline = (over: Partial<Deadline> = {}): Deadline => ({
  id: 'servicing',
  householdId: 'h1',
  title: 'Aircon servicing',
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

describe('completing a deadline', () => {
  it('closes the occurrence', () => {
    const { deadline: done } = completeDeadline(deadline(), [], NOW);
    expect(done.status).toBe('DONE');
    expect(done.updatedAt).toBe(NOW.toISOString());
  });

  it('opens nothing for a one-off', () => {
    expect(completeDeadline(deadline(), [], NOW).nextOccurrence).toBeNull();
  });

  it('opens the next occurrence for a recurring deadline', () => {
    const quarterly = deadline({
      recurrence: { frequency: 'QUARTERLY', anchorDay: 15, endsOn: null },
    });
    const { nextOccurrence } = completeDeadline(quarterly, [quarterly], NOW);

    expect(nextOccurrence).not.toBeNull();
    expect(nextOccurrence!.date).toBe('2026-11-15');
    expect(nextOccurrence!.status).toBe('UPCOMING');
  });

  it('does not open the same occurrence twice', () => {
    const quarterly = deadline({
      recurrence: { frequency: 'QUARTERLY', anchorDay: 15, endsOn: null },
    });
    const first = completeDeadline(quarterly, [quarterly], NOW).nextOccurrence!;

    // Tapping "done" twice must not put two entries on the calendar.
    const second = completeDeadline(quarterly, [quarterly, first], NOW);
    expect(second.nextOccurrence).toBeNull();
  });

  it('measures the next date from the occurrence met, not from today', () => {
    const overdue = deadline({
      date: '2026-07-10',
      recurrence: { frequency: 'MONTHLY', anchorDay: 10, endsOn: null },
    });
    // Completed late, on 1 Aug — the next one is still 10 Aug, not 1 Sep.
    expect(completeDeadline(overdue, [overdue], NOW).nextOccurrence!.date).toBe('2026-08-10');
  });
});

describe('reopening a deadline', () => {
  it('lets a future deadline become upcoming again', () => {
    const done = deadline({ status: 'DONE' });
    const reopened = reopenDeadline(done, NOW);
    expect(deadlineStatus(reopened, NOW)).toBe('UPCOMING');
  });

  it('re-derives missed rather than freezing the stored status', () => {
    const done = deadline({ date: '2026-07-20', status: 'DONE' });
    const reopened = reopenDeadline(done, NOW);
    expect(deadlineStatus(reopened, NOW)).toBe('MISSED');
  });
});
