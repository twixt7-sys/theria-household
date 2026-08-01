import { describe, expect, it } from 'vitest';
import { can, isManager, refusalMessage, roleOf } from './permissions';
import type { HouseholdMember } from './types';

const member = (over: Partial<HouseholdMember>): HouseholdMember => ({
  id: 'm1',
  userId: 'u1',
  householdId: 'h1',
  role: 'MANAGER',
  status: 'ACTIVE',
  displayName: 'Manager',
  email: 'manager@example.com',
  invitedAt: null,
  joinedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('role resolution', () => {
  it('reads the role from an active membership', () => {
    const members = [
      member({ userId: 'u1', role: 'MANAGER' }),
      member({ id: 'm2', userId: 'u2', role: 'OBSERVER' }),
    ];
    expect(roleOf(members, 'u1')).toBe('MANAGER');
    expect(roleOf(members, 'u2')).toBe('OBSERVER');
  });

  it('grants nothing to an invited or removed member', () => {
    expect(roleOf([member({ status: 'INVITED' })], 'u1')).toBeNull();
    expect(roleOf([member({ status: 'REMOVED' })], 'u1')).toBeNull();
  });

  it('grants nothing to a stranger or a signed-out visitor', () => {
    expect(roleOf([member({})], 'someone-else')).toBeNull();
    expect(roleOf([member({})], null)).toBeNull();
  });
});

describe('capabilities', () => {
  it('lets a Manager change household data', () => {
    expect(can('MANAGER', 'stock:adjust')).toBe(true);
    expect(can('MANAGER', 'bills:pay')).toBe(true);
    expect(can('MANAGER', 'members:manage')).toBe(true);
    expect(isManager('MANAGER')).toBe(true);
  });

  it('refuses every mutation to an Observer', () => {
    expect(can('OBSERVER', 'stock:adjust')).toBe(false);
    expect(can('OBSERVER', 'stock:write')).toBe(false);
    expect(can('OBSERVER', 'bills:pay')).toBe(false);
    expect(can('OBSERVER', 'deadlines:write')).toBe(false);
    expect(can('OBSERVER', 'members:manage')).toBe(false);
    // Homi is bound by the same permission model as the UI.
    expect(can('OBSERVER', 'homi:act')).toBe(false);
    expect(isManager('OBSERVER')).toBe(false);
  });

  it('refuses everything to someone with no role at all', () => {
    expect(can(null, 'stock:adjust')).toBe(false);
    expect(can(null, 'settings:write')).toBe(false);
  });

  it('explains refusals in human language, never a Firebase code', () => {
    const message = refusalMessage('stock:adjust');
    expect(message).toContain('Observer');
    expect(message).not.toMatch(/PERMISSION_DENIED|FirebaseError/);
  });
});
