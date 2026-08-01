import type { HouseholdMember, Role } from './types';

/**
 * The one place roles are interpreted.
 *
 * This is a UX layer, not the security boundary — Firestore rules enforce the
 * same thing independently (prompt0.md §13.2). Its job is to make the app feel
 * observational for an Observer rather than broken: nothing is disabled and
 * greyed out, it simply is not offered.
 */

export type Capability =
  | 'stock:write'
  | 'stock:adjust'
  | 'bills:write'
  | 'bills:pay'
  | 'deadlines:write'
  | 'categories:write'
  | 'members:manage'
  | 'settings:write'
  | 'homi:act';

const MANAGER_CAPABILITIES: readonly Capability[] = [
  'stock:write',
  'stock:adjust',
  'bills:write',
  'bills:pay',
  'deadlines:write',
  'categories:write',
  'members:manage',
  'settings:write',
  'homi:act',
];

export function can(role: Role | null, capability: Capability): boolean {
  if (role !== 'MANAGER') return false;
  return MANAGER_CAPABILITIES.includes(capability);
}

export const isManager = (role: Role | null): boolean => role === 'MANAGER';

/** An active membership only — an INVITED or REMOVED member has no role. */
export function roleOf(members: HouseholdMember[], userId: string | null): Role | null {
  if (!userId) return null;
  const membership = members.find((m) => m.userId === userId && m.status === 'ACTIVE');
  return membership?.role ?? null;
}

/**
 * Human-readable refusal. Never surface `PERMISSION_DENIED` to a person
 * (prompt0.md §9.9).
 */
export function refusalMessage(capability: Capability): string {
  switch (capability) {
    case 'stock:write':
    case 'stock:adjust':
      return "You're an Observer in this household, so stock levels are read-only for you.";
    case 'bills:write':
    case 'bills:pay':
      return "You're an Observer in this household, so bills are read-only for you.";
    case 'deadlines:write':
      return "You're an Observer in this household, so deadlines are read-only for you.";
    case 'members:manage':
      return 'Only a Manager can invite or change household members.';
    case 'settings:write':
      return 'Only a Manager can change household settings.';
    default:
      return "You don't have permission to make changes to this household.";
  }
}
