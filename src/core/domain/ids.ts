/** Collision-resistant id, usable offline and stable across devices. */
export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Deterministic id for a bill's occurrence in one billing period.
 *
 * Recurrence generation must be idempotent: running it twice, or on two
 * devices at once, must not produce two August electricity bills. A derived id
 * makes the second write an overwrite rather than a duplicate.
 */
export const billOccurrenceId = (billId: string, billingPeriod: string): string =>
  `${billId}-${billingPeriod}`;
